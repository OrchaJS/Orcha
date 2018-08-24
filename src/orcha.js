'use strict';

const AWS = require('aws-sdk');
const fs = require('fs');
const { ipcRenderer } = require('electron');

const maxInvocations = 20;
let currentInvocations = 0;

// read in the users JSON workflow file and start executing the workflow
function executeWorkflow(jsonPath, workflowInput, region, usersCallback) {
  currentInvocations = 0;
  if (!region) {
    throw new Error("Must specify an AWS region (e.g. 'us-east-1')");
  }
  if (!usersCallback) {
    throw new Error('Please specify a callback function.');
  }
  AWS.config.update({ region: region });
  const awsLambdaController = new AWS.Lambda();
  const workflowObject = JSON.parse(fs.readFileSync(jsonPath));

  startWorkflow(awsLambdaController, workflowObject, workflowInput, usersCallback, false);
}

// same as executeWorkflow but file has already been parsed into json
// some duplication of code here, will refactor soon.
function executeWorkflowParsed(workflowObject, workflowInput, region, usersCallback) {
  currentInvocations = 0;
  if (! region) {
      throw new Error('Must specify an AWS region (e.g. \'us-east-1\')');
  }
  if (! usersCallback) {
      throw new Error('Please specify a callback function.');
  }
  AWS.config.update({region: region});
  const awsLambdaController = new AWS.Lambda();
  startWorkflow(awsLambdaController, workflowObject, workflowInput, usersCallback, true);
}

// Execute the workflow. Note that this may not be the entire JSON file.
// It may be the entire workflow, but it could also be called by executeParallel,
// meaning that the workflow is one branch in a tree of parallel execution.
function startWorkflow(awsLambdaController, workflowObject, workflowInput, callback, inGUI) {
  if (!workflowObject.StartAt) {
    throw new Error('Input JSON must specify a StartAt state');
  }

  const startState = {
    StateName: workflowObject.StartAt,
    StateData: workflowInput
  };

  executeState(awsLambdaController, workflowObject, startState, callback, inGUI);
}

// executeState checks whether the state is a Task (e.g. Lambda Execution) state or
// a Parallel state, and runs the appropriate function. It passes a callback to that
// function to transition to the next state (the stateTransition function).
// In the future, we will aim to add support for other types of States (e.g. Choice State)
function executeState(awsLambdaController, workflowObject, state, callback, inGUI) {
  if (inGUI) ipcRenderer.send('changeColor', state.StateName, 'orange');
  function stateTransition(data, err) {
    if (err) {
      const stateObject = workflowObject.States[state.StateName];
      let retried = false;
      if (stateObject.Retry) {
        const stateToRetry = stateObject;
        // console.log('stateToRetry', stateToRetry);
        // console.log('stateToRetry ErrorEquals', stateToRetry.Retry[0].ErrorEquals);
        // console.log('err ErrorType', err);
        for (let i = 0; i < stateToRetry.Retry.length; i++) {
          for (let j = 0; j < stateToRetry.Retry[i].ErrorEquals.length; j++) {
            if (err.errorType === stateToRetry.Retry[i].ErrorEquals[j]) {
              // console.log('found error');
              if (! stateToRetry.Retry[i].TimesRetried) {
                stateToRetry.Retry[i].TimesRetried = {};
              }
              const timesRetriedObject = stateToRetry.Retry[i].TimesRetried;
              if (! timesRetriedObject[err.errorType]) {
                timesRetriedObject[err.errorType] = 0;
              }
              const timesRetried = timesRetriedObject[err.errorType];
              const maxRetryAttempts = stateToRetry.Retry[i].MaxAttempts || 3;
              if (timesRetried === maxRetryAttempts) {
                //throw new Error(`Exceeded Maximum Retry Attempts; Lambda ${stateToRetry.StateName} threw Error: ${err}`);
                break;
              }
              if (timesRetried < maxRetryAttempts) {
                const waitTime = timesRetried === 0
                  ? stateToRetry.Retry[i].IntervalSeconds * 1000 || 1000
                  : stateToRetry.Retry[i].BackoffRate * 1000 || 2000;
                state.Retrying = true;
                setTimeout(executeState.bind(null, awsLambdaController, workflowObject, state, callback, inGUI), waitTime);
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
      if ((! retried) && stateObject.Catch) {
        const errors = stateObject.Catch;
        let caught = false;
        for (let i = 0; i < errors.length; i++) {
          for (let j = 0; j < errors[i].ErrorEquals.length; j++) {
            if (err.errorType === errors[i].ErrorEquals[j]) {
              const catchState = {
                StateName: errors[i].Next,
                StateData: state.StateData,
                Error: err.errorType,
                Cause: err.errorMessage
              };
              executeState(awsLambdaController, workflowObject, catchState, callback, inGUI);
              caught = true;
              break;
            }
          }
          if (caught) {
            break;
          }
        }
        if (! caught) {
          if (inGUI) ipcRenderer.send('changeColor', state.StateName, 'red');
          throw new Error(`${err.errorType} not caught for state ${state.StateName}`);
        }
      }
      else if (! retried) {
        if (inGUI) ipcRenderer.send('changeColor', state.StateName, 'red');
        throw new Error(`${err.errorType} not caught for state ${state.StateName}`);
      }
    }
    else if (!workflowObject.States[state.StateName].End) {
      if (inGUI) ipcRenderer.send('changeColor', state.StateName, 'green');
      const nextState = {
        StateName: workflowObject.States[state.StateName].Next,
        StateData: data
      };
      executeState(awsLambdaController, workflowObject, nextState, callback, inGUI);
    } else {
      if (inGUI) ipcRenderer.send('changeColor', state.StateName, 'green');
      callback(data);
    }
  }

  if (workflowObject.States[state.StateName].Visited && (! states.Retrying)) {
    throw new Error(`State ${state.StateName} has already been visited! There may be a cycle/infinite loop in your state transitions. Please check your JSON file.`);
  }
  workflowObject.States[state.StateName].Visited = true;
  switch (workflowObject.States[state.StateName].Type) {
    case 'Task':
      executeTask(awsLambdaController, workflowObject, state, stateTransition);
      break;
    case 'Parallel':
      executeParallel(awsLambdaController, workflowObject, state, stateTransition, inGUI);
      break;
    case 'Choice':
      const nextState = executeChoice(workflowObject, state);
      if (inGUI) ipcRenderer.send('changeColor', state.StateName, 'green');      
      executeState(awsLambdaController, workflowObject, nextState, callback, inGUI);
      break;
    case 'Succeed':
      callback(state.StateData);
      break;
    default:
      throw new Error(`State type for ${state.StateName} missing or incorrect`);
  }
}

// Kicks off a new workflow for each branch. The results from the workflow are pushed
// into an array. When the workflow is complete, stateTransition is run with the array as its argument
function executeParallel(awsLambdaController, workflowObject, currentState, stateTransition, inGUI) {
  const numberOfStates = workflowObject.States[currentState.StateName].Branches.length;
  let completeStates = 0;
  const resultArray = [];
  workflowObject.States[currentState.StateName].Branches.forEach(
    (branch, index) => {
      startWorkflow(awsLambdaController, workflowObject.States[currentState.StateName].Branches[index], currentState.StateData, stateComplete.bind(null, index), inGUI);
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
function executeTask(awsLambdaController, workflowObject, currentState, stateTransition) {
  currentInvocations++;
  if (currentInvocations > maxInvocations) {
    throw new Error('Max invocations exceeded');
  } else {
    const paramsForCurrentLambda = {
      FunctionName: workflowObject.States[currentState.StateName].LambdaToInvoke,
      Payload: JSON.stringify(currentState.StateData)
    };
    awsLambdaController.invoke(paramsForCurrentLambda, (err, data) => {
      if (data.FunctionError) {
        const returnObject = JSON.parse(data.Payload);
        stateTransition(paramsForCurrentLambda, returnObject);
      } else {
        // console.log statements for debugging and display purposes in dev
        // console.log('lambda name', currentState.StateName);
        // console.log('lambda input', currentState.StateData);
        // console.log('lambda output', data);
        stateTransition(JSON.parse(data.Payload));
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
        throw new Error(`Invalid variable name ${choiceObject.Variable}. Variable names should be of the format $.Property_Name`);
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
              throw new Error(`${prop} incorrect`);
          }
        }
      }
    }
  }
  const nextState = {StateData: currentState.StateData};
  const choiceArray = workflowObject.States[currentState.StateName].Choices;
  for (let i = 0; i < choiceArray.length; i++) {
    if (evaluateChoice(choiceArray[i])) {
      nextState.StateName = choiceArray[i].Next;
      return currentState;
    }
  }
  nextState.StateName = workflowObject.States[currentState.StateName].Default;
  if (!currentState.StateName) {
    throw new Error('No default choice state to go to.');
  }
  return nextState;
}

function testWorkflow() {
  executeWorkflow('../test/json_workflow_file_test_cases/simpleRetry.json', { array: [-2, 3, 4] }, 'us-east-1', x => console.log(x));
}

//testWorkflow();

const orcha = {
  executeWorkflow, executeWorkflowParsed
};

module.exports = orcha;
