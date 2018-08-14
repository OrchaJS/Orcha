"use strict";

const AWS = require('aws-sdk');
const fs = require('fs');

const maxInvocations = 20;
let currentInvocations = 0;

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

function executeWorkflow(jsonPath, workflowInput, region, usersCallback) {
    // currentInvocations = 0;
    if (! region) {
        throw new Error('Must specify an AWS region (e.g. \'us-east-1\')');
    }
    if (! usersCallback) {
        throw new Error('Please specify a callback function.');
    }
    AWS.config.update({region: region});
    const lambda = new AWS.Lambda();
    const workflowObject = JSON.parse(fs.readFileSync(jsonPath));

    startWorkflow(lambda, workflowObject, workflowInput, usersCallback);
}

function startWorkflow(lambda, workflowObject, workflowInput, callback) {
    if (! workflowObject.StartAt) {
        throw new Error('Input JSON must specify a StartAt state');
    }

    const startState = {
        StateName: workflowObject.StartAt,
        StateData: workflowInput
    };

    executeState(lambda, workflowObject, startState, callback);
}

function executeState(lambda, workflowObject, state, callback) {
    function stateTransition(data) {
        if (! workflowObject.States[state.StateName].End) {
            const nextState = {
                StateName: workflowObject.States[state.StateName].Next,
                StateData: data
            };
            executeState(lambda, workflowObject, nextState, callback);
        }
        else {
            callback(data);
        }
    }

    if (workflowObject.States[state.StateName].Visited) {
        throw new Error(`State ${state.StateName} has already been visited! There may be a cycle/infinite loop in your state transitions. Please check your JSON file.`);
    }
    workflowObject.States[state.StateName].Visited = true;
    switch (workflowObject.States[state.StateName].Type) {
        case "Task":
            executeTask(lambda, workflowObject, state, stateTransition);
            break;
        case "Parallel":
            executeParallel(lambda, workflowObject, state, stateTransition);
            break;
        default:
            throw new Error(`State type for ${state.StateName} missing or incorrect`);
    }
}

function executeParallel(lambda, workflowObject, currentState, callback) {
    const numberOfStates = workflowObject.States[currentState.StateName].Branches.length;
    let completeStates = 0;
    const resultArray = [];
    workflowObject.States[currentState.StateName].Branches.forEach((branch, index) => {
        startWorkflow(lambda, workflowObject.States[currentState.StateName].Branches[index], currentState.StateData, stateComplete.bind(null, index));
    });
    function stateComplete(stateIndex, data) {
        completeStates++;
        resultArray[stateIndex] = data;
        if (completeStates === numberOfStates) {
            callback(resultArray);
        }
    }
}

function executeTask(lambda, workflowObject, currentState, callback) {
    currentInvocations++;
    if (currentInvocations > maxInvocations) {
        throw new Error("Max invocations exceeded");
    }
    else {
        const paramsForCurrentLambda = {
            FunctionName: workflowObject.States[currentState.StateName].LambdaToInvoke,
            Payload: JSON.stringify(currentState.StateData)
        };
        lambda.invoke(paramsForCurrentLambda, (err, data) => {
            if (err) {
                throw new Error(`Lambda ${currentState.StateName} threw Error: ${err}`);
            }
            else {
                console.log('lambda name', currentState.StateName);
                console.log('lambda input', currentState.StateData);
                console.log('lambda output', data);
                callback(JSON.parse(data.Payload));
            }
        });
    }
}

function executeWorkflowOld(jsonPath, workflowInput, region, callback = () => {}) {
    let invocations = 0;
    function invokeCurrentLambda(currentState) {
        const paramsForCurrentLambda = {
            FunctionName: workflowObject.States[currentState.StateName].LambdaToInvoke,
            Payload: currentState.StateData
        };
        // limit invocations. just to safeguard the dev environment
        if (invocations < maxInvocations) {
            invocations++;
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
        else {
            throw new Error('Max Invocations Exceeded');
        }
    }
    if (! region) {
        throw new Error('Must specify an AWS region (e.g. \'us-east-1\')');
    }
    const lambda = new AWS.Lambda();
    AWS.config.update({region: region});
    const workflowObject = JSON.parse(fs.readFileSync(jsonPath));
    if (! workflowObject.StartAt) {
        throw new Error('Input JSON must specify a StartAt state');
    }
    if (detectCycle(workflowObject)) {
        throw new Error('Input JSON states form a cycle, please correct');
    }
    const startState = {
        StateName: workflowObject.StartAt,
        StateData: JSON.stringify(workflowInput)
    };
    invokeCurrentLambda(startState);
}

function testWorkflow() {
    executeWorkflow('test.json', {array: [4, 5, 6]}, 'us-east-1', (x) => console.log(x));
}

testWorkflow();