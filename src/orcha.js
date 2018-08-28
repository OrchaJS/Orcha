'use strict';

const AWS = require('aws-sdk');
const fs = require('fs');

const maxInvocations = 20;
const globalWorkflowState = {};

// read in the users JSON workflow file and start executing the workflow
function executeWorkflow(configObject) {
  const { jsonPath, region, workflowInput, statusUpdateCallback, endOfExecutionCallback, errorCallback } = configObject;
  const workflowObject = (jsonPath) ? JSON.parse(fs.readFileSync(jsonPath)) : configObject.workflowObject;
  if (!jsonPath && !workflowObject) {
    throw new Error("Please specify a path to your JSON workflow.")
  }
  if (!region) {
    throw new Error("Must specify an AWS region (e.g. 'us-east-1')");
  }
  if (!endOfExecutionCallback) {
    throw new Error('Please specify a callback function to run at the end of workflow execution.');
  }
  AWS.config.update({ region: region });
  const awsLambdaController = new AWS.Lambda();
  globalWorkflowState.currentInvocations = 0;
  globalWorkflowState.statusUpdateCallback = statusUpdateCallback;
  globalWorkflowState.region = region;
  globalWorkflowState.errorCallback = errorCallback;
  globalWorkflowState.awsLambdaController = awsLambdaController;
  globalWorkflowState.endOfExecutionCallback = endOfExecutionCallback;
  globalWorkflowState.id = 1;
  globalWorkflowState.workflowInput = workflowInput;
  globalWorkflowState.startTime = Date.now();
  sendStatusUpdate({
    Type: 'ExecutionStarted'
  });
  endOfExecutionCallback.finalFunction = true;
  startWorkflow(workflowObject, workflowInput, endOfExecutionCallback);
}

// Execute the workflow. Note that this may not be the entire JSON file.
// It may be the entire workflow, but it could also be called by executeParallel,
// meaning that the workflow is one branch in a tree of parallel execution.
function startWorkflow(workflowObject, workflowInput, endOfWorkflowCallback) {
  if (!workflowObject.StartAt) {
    throw new Error('Input JSON must specify a StartAt state');
  }

  const startState = {
    StateName: workflowObject.StartAt,
    StateData: workflowInput
  };
  executeState(workflowObject, startState, endOfWorkflowCallback);
}

function sendStatusUpdate(statusObject) {
  statusObject.id = globalWorkflowState.id;
  statusObject.elapsedTime = Date.now() - globalWorkflowState.startTime;
  globalWorkflowState.id++;
  if (statusObject.Lambda) {
    statusObject.lambdaURL = 'https://console.aws.amazon.com/lambda/home?region=' + globalWorkflowState.region + '#/functions/' + statusObject.Lambda;
    statusObject.cloudURL = 'https://console.aws.amazon.com/cloudwatch/home?region=' + globalWorkflowState.region + '#logStream:group=/aws/lambda/' + statusObject.Lambda;
  }
  globalWorkflowState.statusUpdateCallback(statusObject);
}

function endWorkflow(endOfExecutionObject) {
  endOfExecutionObject.id = globalWorkflowState.id;
  endOfExecutionObject.elapsedTime = Date.now() - globalWorkflowState.startTime;
  endOfExecutionObject.Input = globalWorkflowState.workflowInput;
  if (endOfExecutionObject.executionStatus === 'Succeeded') {
    globalWorkflowState.endOfExecutionCallback(endOfExecutionObject);
  }
  else {
    if (globalWorkflowState.errorCallback) {
      globalWorkflowState.errorCallback(endOfExecutionObject);
    }
    throw new Error(endOfExecutionObject.exceptionMessage);
  }
}

// executeState checks whether the state is a Task (e.g. Lambda Execution) state or
// a Parallel state, and runs the appropriate function. It passes a callback to that
// function to transition to the next state (the stateTransition function).
// In the future, we will aim to add support for other types of States (e.g. Choice State)
function executeState(workflowObject, state, endOfWorkflowCallback) {
  sendStatusUpdate({
    Type: 'TaskStateEntered',
    Input: state.StateData,
    IsLambdaStatus: false,
    Step: state.StateName
  });
  function stateTransition(data, err) {
    if (err) {
      sendStatusUpdate({
        Type: 'LambdaFunctionFailed',
        Input: state.StateData,
        Step: state.StateName,
        Exception: err,
        Lambda: workflowObject.States[currentState.StateName].LambdaToInvoke
      });
      const stateObject = workflowObject.States[state.StateName];
      let retried = false;
      if (stateObject.Retry) {
        const stateToRetry = stateObject;
        for (let i = 0; i < stateToRetry.Retry.length; i++) {
          for (let j = 0; j < stateToRetry.Retry[i].ErrorEquals.length; j++) {
            if (err.errorType === stateToRetry.Retry[i].ErrorEquals[j]) {
              if (!stateToRetry.Retry[i].TimesRetried) {
                stateToRetry.Retry[i].TimesRetried = {};
              }
              const timesRetriedObject = stateToRetry.Retry[i].TimesRetried;
              if (!timesRetriedObject[err.errorType]) {
                timesRetriedObject[err.errorType] = 0;
              }
              const timesRetried = timesRetriedObject[err.errorType];
              const maxRetryAttempts = stateToRetry.Retry[i].MaxAttempts || 3;
              if (timesRetried === maxRetryAttempts) {
                break;
              }
              if (timesRetried < maxRetryAttempts) {
                const waitTime = timesRetried === 0
                  ? stateToRetry.Retry[i].IntervalSeconds * 1000 || 1000
                  : stateToRetry.Retry[i].BackoffRate * 1000 || 2000;
                state.Retrying = true;
                sendStatusUpdate({
                  Type: 'RetryingState',
                  Input: state.StateData,
                  Step: state.StateName,
                  Exception: err
                });
                setTimeout(executeState.bind(null, workflowObject, state, endOfWorkflowCallback), waitTime);
                retried = true;
                timesRetriedObject[err.errorType]++;
                break;
              }
            }
          }
          if (retried) {
            break;
          }
        }
      }
      let caught = false;
      if ((!retried) && stateObject.Catch) {
        const errors = stateObject.Catch;
        for (let i = 0; i < errors.length; i++) {
          for (let j = 0; j < errors[i].ErrorEquals.length; j++) {
            if (err.errorType === errors[i].ErrorEquals[j]) {
              const catchState = {
                StateName: errors[i].Next,
                StateData: state.StateData,
                Error: err.errorType,
                Cause: err.errorMessage
              };
              sendStatusUpdate({
                Type: 'ExceptionCaught',
                Input: state.StateData,
                Step: state.StateName,
                Exception: err
              });
              sendStatusUpdate({
                Type: 'TaskStateExited',
                Output: state.StateData,
                Step: state.StateName
              });
              executeState(workflowObject, catchState, endOfWorkflowCallback);
              caught = true;
              break;
            }
          }
          if (caught) {
            break;
          }
        }
      }
      else if (!caught && !retried) {
        sendStatusUpdate({
          Type: 'TaskStateExited',
          Output: state.StateData,
          Step: state.StateName
        });
        sendStatusUpdate({
          Type: 'ExecutionFailed',
          Input: state.StateData,
          Step: state.StateName,
          Exception: err
        });
        endWorkflow({
          executionStatus: 'Failed',
          exceptionMessage: `${err.errorType} not caught for state ${state.StateName}`
        });
      }
    }
    else if (!workflowObject.States[state.StateName].End) {
      sendStatusUpdate({
        Type: 'TaskStateExited',
        Output: data,
        Step: state.StateName
      });
      const nextState = {
        StateName: workflowObject.States[state.StateName].Next,
        StateData: data
      };
      executeState(workflowObject, nextState, endOfWorkflowCallback);
    } else {
      sendStatusUpdate({
        Type: 'TaskStateExited',
        Output: data,
        Step: state.StateName
      });
      if (endOfWorkflowCallback.finalFunction) {
        endWorkflow({
          executionStatus: 'Succeeded',
          output: data
        });
      }
      else {
        endOfWorkflowCallback(data);
      }
    }
  }

  if (workflowObject.States[state.StateName].Visited && (!states.Retrying)) {
    endWorkflow({
      executionStatus: 'Failed',
      exceptionMessage: `State ${state.StateName} has already been visited! There may be a cycle/infinite loop in your state transitions. Please check your JSON file.`
    });
  }
  workflowObject.States[state.StateName].Visited = true;
  switch (workflowObject.States[state.StateName].Type) {
    case 'Task':
      executeTask(workflowObject, state, stateTransition);
      break;
    case 'Parallel':
      executeParallel(workflowObject, state, stateTransition);
      break;
    case 'Choice':
      const nextState = executeChoice(workflowObject, state);
      // sendStatusUpdate('TaskStateExited', state, state.StateData);
      sendStatusUpdate({
        Type: 'TaskStateExited',
        Output: state.StateData,
        Step: state.StateName
      });
      executeState(workflowObject, nextState, endOfWorkflowCallback);
      break;
    case 'Succeed':
      sendStatusUpdate({
        Type: 'TaskStateExited',
        Output: state.StateData,
        Step: state.StateName
      });
      if (endOfWorkflowCallback.finalFunction) {
        endWorkflow({
          executionStatus: 'Succeeded',
          output: data
        });
      }
      else {
        endOfWorkflowCallback(data);
      }
      break;
    default:
      endWorkflow({
        executionStatus: 'Failed',
        exceptionMessage: `State type for ${state.StateName} missing or incorrect`
      });
  }
}

// Kicks off a new workflow for each branch. The results from the workflow are pushed
// into an array. When the workflow is complete, stateTransition is run with the array as its argument
function executeParallel(workflowObject, currentState, stateTransition) {
  const numberOfStates = workflowObject.States[currentState.StateName].Branches.length;
  let completeStates = 0;
  const resultArray = [];
  workflowObject.States[currentState.StateName].Branches.forEach(
    (branch, index) => {
      startWorkflow(workflowObject.States[currentState.StateName].Branches[index], currentState.StateData, stateComplete.bind(null, index));
    }
  );
  function stateComplete(stateIndex, data) {
    completeStates++;
    resultArray[stateIndex] = data;
    if (completeStates === numberOfStates) {
      stateTransition(resultArray);
    }
  }
}

// Executes a lambda and calls stateTransition on its result
function executeTask(workflowObject, currentState, stateTransition) {
  globalWorkflowState.currentInvocations++;
  if (globalWorkflowState.currentInvocations > maxInvocations) {
    endWorkflow({
      executionStatus: 'Failed',
      exceptionMessage: 'Max invocations exceeded'
    });
  } else {
    const lambdaName = workflowObject.States[currentState.StateName].LambdaToInvoke;
    const paramsForCurrentLambda = {
      FunctionName: lambdaName,
      Payload: JSON.stringify(currentState.StateData)
      //,LogType: 'Tail'
    };
    sendStatusUpdate({
      Type: 'LambdaFunctionStarted',
      Input: currentState.stateData,
      Lambda: lambdaName
    });
    globalWorkflowState.awsLambdaController.invoke(paramsForCurrentLambda, (err, data) => {
      if (err) {
        stateTransition(paramsForCurrentLambda, err);
      } else if (data.FunctionError) {
        const parsedPayload = JSON.parse(data.Payload);
        stateTransition(paramsForCurrentLambda, parsedPayload);
      } else {
        const parsedPayload = JSON.parse(data.Payload);
        sendStatusUpdate({
          Type: 'LambdaFunctionSucceeded',
          Input: currentState.stateData,
          Output: parsedPayload,
          Lambda: lambdaName
        });
        // console.log statements for debugging and display purposes in dev
        // console.log('lambda name', currentState.StateName);
        // console.log('lambda input', currentState.StateData);
        // console.log('lambda output', data);
        stateTransition(parsedPayload);
      }
    });
  }
}

// Execute choice state. Allows conditional jumping to the next state based on the result of a previous state.
function executeChoice(workflowObject, currentState, stateTransition) {
  function evaluateChoice(choiceObject) {
    if (choiceObject.And) {
      for (let i = 0; i < choiceObject.And.length; i++) {
        if (!evaluateChoice(choiceObject.And[i])) {
          return false;
        }
      }
      return true;
    } else if (choiceObject.Or) {
      for (let i = 0; i < choiceObject.And.length; i++) {
        if (evaluateChoice(choiceObject.Or[i])) {
          return true;
        }
      }
      return false;
    } else if (choiceObject.Not) {
      return !evaluateChoice(choiceObject.Not);
    } else {
      if (choiceObject.Variable.substring(0, 2) !== '$.' || choiceObject.Variable.length < 3) {
        endWorkflow({
          executionStatus: 'Failed',
          exceptionMessage: `Invalid variable name ${choiceObject.Variable}. Variable names should be of the format $.Property_Name`
        });
      }
      const variable = currentState.StateData[choiceObject.Variable.substring(2)];
      for (let prop in choiceObject) {
        if (prop === 'Variable') {
          continue;
        } else if (prop === 'Next') {
          continue;
        } else {
          switch (prop) {
            case 'BooleanEquals':
              return Boolean(variable) === Boolean(choiceObject[prop]);
            case 'NumericEquals':
              return Number(variable) === Number(choiceObject[prop]);
            case 'NumericGreaterThan':
              return Number(variable) > Number(choiceObject[prop]);
            case 'NumericGreaterThanEquals':
              return Number(variable) >= Number(choiceObject[prop]);
            case 'NumericLessThan':
              return Number(variable) < Number(choiceObject[prop]);
            case 'NumericLessThanEquals':
              return Number(variable) <= Number(choiceObject[prop]);
            case 'StringEquals':
              return String(variable) === String(choiceObject[prop]);
            case 'StringGreaterThan':
              return String(variable) > String(choiceObject[prop]);
            case 'StringGreaterThanEquals':
              return String(variable) >= String(choiceObject[prop]);
            case 'StringLessThan':
              return String(variable) < String(choiceObject[prop]);
            case 'StringLessThanEquals':
              return String(variable) <= String(choiceObject[prop]);
            case 'TimestampEquals':
              return Date(variable) === Date(choiceObject[prop]);
            case 'TimestampGreaterThan':
              return Date(variable) > Date(choiceObject[prop]);
            case 'TimestampGreaterThanEquals':
              return Date(variable) >= Date(choiceObject[prop]);
            case 'TimestampLessThan':
              return Date(variable) < Date(choiceObject[prop]);
            case 'TimestampLessThanEquals':
              return Date(variable) <= Date(choiceObject[prop]);
            default:
              endWorkflow({
                executionStatus: 'Failed',
                exceptionMessage: `${prop} incorrect`
              });
          }
        }
      }
    }
  }
  const nextState = { StateData: currentState.StateData };
  const choiceArray = workflowObject.States[currentState.StateName].Choices;
  for (let i = 0; i < choiceArray.length; i++) {
    if (evaluateChoice(choiceArray[i])) {
      nextState.StateName = choiceArray[i].Next;
      return currentState;
    }
  }
  nextState.StateName = workflowObject.States[currentState.StateName].Default;
  if (!currentState.StateName) {
    endWorkflow({
      executionStatus: 'Failed',
      exceptionMessage: 'No default choice state to go to.'
    });
  }
  return nextState;
}

function testWorkflow() {
  executeWorkflow({
    jsonPath: '../test/json_workflow_file_test_cases/parallelChoice.json',
    workflowInput: { array: [-2, 4, 5] },
    region: 'us-east-1',
    endOfExecutionCallback: x => console.log(x),
    statusUpdateCallback: x => console.log(x)
  });
  // const { jsonPath, region, workflowInput, statusUpdateCallback, endOfExecutionCallback, errorCallback } = configObject;
}

testWorkflow();

const orcha = {
  executeWorkflow
};

module.exports = orcha;
