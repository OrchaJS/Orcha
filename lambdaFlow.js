"use strict";

const AWS = require('aws-sdk');
const fs = require('fs');

const maxInvocations = 20;
let currentInvocations = 0;

// Was using to detect cycle in a simple workflow (ie not parallel lambdas).
// Don't think we need it anymore.
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

// read in the users JSON workflow file and start executing the workflow
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

// Execute the workflow. Note that this may not be the entire JSON file.
// It may be the entire workflow, but it could also be called executeParallel,
// meaning that the workflow is one branch in a tree of parallel execution.
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

// executeState checks whether the state is a Task (e.g. Lambda Execution) state or
// a Parallel state, and runs the appropriate function. It passes a callback to that
// function to transition to the next state (the stateTransition function).
// In the future, we will aim to add support for other types of States (e.g. Choice State)
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

// Kicks off a new workflow for each branch. The results from the workflow are pushed
// into an array. When the workflow is complete, stateTransition is run with the array as its argument
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

// Executes a lambda and calls stateTransition with its result
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

// Old function to execute a simple workflow (ie no parallel lambdas).
// Don't think we need anymore.
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

const lambdaOrchestrator = {
    executeWorkflow: executeWorkflow
};

module.exports = lambdaOrchestrator;