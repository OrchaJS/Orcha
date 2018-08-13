const AWS = require('aws-sdk');
const fs = require('fs');

function detectCycle(workflowObject) {
    let slowNode = workflowObject.StartAt;
    let fastNode = workflowObject.StartAt;
    while (true) {
        slowNode = workflowObject.States[slowNode].Next;
        fastNode = workflowObject.States[fastNode].Next;
        if ((! slowNode) || (! fastNode)) {
            return false;
        }
        fastNode = workflowObject.States[fastNode].Next;
        if ((! fastNode)) {
            return false;
        }
        if (slowNode === fastNode) {
            return true;
        }
    }
    return false;
}

function executeWorkflow(jsonPath, workflowInput, region, callback) {
    function invokeCurrentLambda(currentState) {
        const paramsForCurrentLambda = {
            FunctionName: workflowObject.States[currentState.StateName].LambdaToInvoke,
            Payload: currentState.StateData
        };
        const lambdaInvocation = lambda.invoke(paramsForCurrentLambda, (err, data) => {
            console.log('data', data);
            if (! workflowObject.States[currentState.StateName].End) {
                const nextState = {
                    StateName: workflowObject.States[currentState.StateName].Next,
                    StateData: JSON.stringify({array: JSON.parse(data.Payload)})
                };
                invokeCurrentLambda(nextState);
            }
            else {
                callback(JSON.parse(data.Payload));
            }
        });
    }

    const lambda = new AWS.Lambda();
    AWS.config.update({region: region});
    const workflowObject = JSON.parse(fs.readFileSync(jsonPath));
    if (! workflowObject.StartAt) {
        throw new Error('Input JSON must specify a StartAt state');
    }
    if (detectCycle(workflowObject)) {
        throw new Error('Input JSON states form a cycle');
    }
    const startState = {
        StateName: workflowObject.StartAt,
        StateData: JSON.stringify(workflowInput)
    };
    invokeCurrentLambda(startState);
}

function testWorkflow() {
    executeWorkflow('test.json', {array: [10, 20, 30]}, 'us-east-1', (x) => console.log(x));
}

testWorkflow();