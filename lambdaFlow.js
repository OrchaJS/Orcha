'use strict';

const AWS = require('aws-sdk');

const maxInvocations = 20;
let currentInvocations = 0;

// read in the users JSON workflow file and start executing the workflow
function executeWorkflow(jsonPath, workflowInput, region, usersCallback) {
  // currentInvocations = 0;
  if (!region) {
    throw new Error("Must specify an AWS region (e.g. 'us-east-1')");
  }
  if (!usersCallback) {
    throw new Error('Please specify a callback function.');
  }
  AWS.config.update({ region: region });
  const awsLambdaController = new AWS.Lambda();
  const workflowObject = JSON.parse(fs.readFileSync(jsonPath));

  startWorkflow(
    awsLambdaController,
    workflowObject,
    workflowInput,
    usersCallback
  );
}

// Execute the workflow. Note that this may not be the entire JSON file.
// It may be the entire workflow, but it could also be called by executeParallel,
// meaning that the workflow is one branch in a tree of parallel execution.
function startWorkflow(
  awsLambdaController,
  workflowObject,
  workflowInput,
  callback
) {
  if (!workflowObject.StartAt) {
    throw new Error('Input JSON must specify a StartAt state');
  }

  const startState = {
    StateName: workflowObject.StartAt,
    StateData: workflowInput
  };

  executeState(awsLambdaController, workflowObject, startState, callback);
}

// executeState checks whether the state is a Task (e.g. Lambda Execution) state or
// a Parallel state, and runs the appropriate function. It passes a callback to that
// function to transition to the next state (the stateTransition function).
// In the future, we will aim to add support for other types of States (e.g. Choice State)
function executeState(awsLambdaController, workflowObject, state, callback) {
  function stateTransition(data, err) {
    if (err) {
      if (state.Retry) {
        async function handleRetry(workflowObject, state, err) {
          //change counter to be stored in workflowObject as method TimesAttempted --done
          //let counter = 0;
          for (let i = 0; i < state.Retry.length; i++) {
            if (
              err.message === workflowObject.States[state].Retry[i].ErrorEquals
            ) {
              state.Retry.TimesAttempted = 0;
              const stateToRetry = workflowObject.States[state];

              if (
                stateToRetry.Retry[i].TimesAttempted ===
                stateToRetry.Retry.MaxAttempts
              ) {
                // throw Error
                throw new Error(
                  `Exceeded Maximum Attempts; Lambda ${
                    stateToRetry.StateName
                  } threw Error: ${err}`
                );
              }
              if (
                stateToRetry.Retry[i].TimesAttempted <
                stateToRetry.Retry[i].MaxAttempts
              ) {
                let intervalTime =
                  stateToRetry.Retry[i].TimesAttempted === 0
                    ? stateToRetry.Retry[i].IntervalSeconds
                    : retryInterval(
                        stateToRetry.Retry[i].IntervalSeconds,
                        stateToRetry.Retry[i].BackoffRate,
                        stateToRetry.Retry[i].TimesAttempted
                      );
                // set async --done
                await setTimeout(
                  executeState(
                    awsLambdaController,
                    workflowObject,
                    stateToRetry,

                    callback
                  ),
                  intervalTime
                );
              }
              stateToRetry.Retry[i].TimesAttempted++;
            }
            //last line loop
          }
          function retryInterval(initial, backoff, counter) {
            for (let i = 0; i < counter; i++) {
              initial *= backoff;
            }
            return initial;
          }
        }
      }
      const errors = workflowObject.States[state.StateName].Catch;
      for (let i = 0; i < errors.length; i++) {
        if (err.message === errors[i].ErrorEquals[0]) {
          executeState(
            awsLambdaController,
            workflowObject,
            errors[i].ErrorsEquals[0],
            callback
          );
        }
      }
    }
    if (!workflowObject.States[state.StateName].End) {
      const nextState = {
        StateName: workflowObject.States[state.StateName].Next,
        StateData: data
      };
      executeState(awsLambdaController, workflowObject, nextState, callback);
    } else {
      callback(data);
    }
  }

  if (workflowObject.States[state.StateName].Visited) {
    throw new Error(
      `State ${
        state.StateName
      } has already been visited! There may be a cycle/infinite loop in your state transitions. Please check your JSON file.`
    );
  }
  workflowObject.States[state.StateName].Visited = true;
  switch (workflowObject.States[state.StateName].Type) {
    case 'Task':
      executeTask(awsLambdaController, workflowObject, state, stateTransition);
      break;
    case 'Parallel':
      executeParallel(
        awsLambdaController,
        workflowObject,
        state,
        stateTransition
      );
      break;
    case 'Choice':
      executeState(
        awsLambdaController,
        workflowObject,
        executeChoice(workflowObject, state),
        callback
      );
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
function executeParallel(
  awsLambdaController,
  workflowObject,
  currentState,
  stateTransition
) {
  const numberOfStates =
    workflowObject.States[currentState.StateName].Branches.length;
  let completeStates = 0;
  const resultArray = [];
  workflowObject.States[currentState.StateName].Branches.forEach(
    (branch, index) => {
      startWorkflow(
        awsLambdaController,
        workflowObject.States[currentState.StateName].Branches[index],
        currentState.StateData,
        stateComplete.bind(null, index)
      );
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
function executeTask(
  awsLambdaController,
  workflowObject,
  currentState,
  stateTransition
) {
  currentInvocations++;
  if (currentInvocations > maxInvocations) {
    throw new Error('Max invocations exceeded');
  } else {
    const paramsForCurrentLambda = {
      FunctionName:
        workflowObject.States[currentState.StateName].LambdaToInvoke,
      Payload: JSON.stringify(currentState.StateData)
    };
    awsLambdaController.invoke(paramsForCurrentLambda, (err, data) => {
      if (err) {
        //does error catch have to be right here??
        stateTransition(paramsForCurrentLambda.PayLoad, err);
        // throw new Error(`Lambda ${currentState.StateName} threw Error: ${err}`);
        stateTransition(data, err);
      } else {
        console.log('lambda name', currentState.StateName);
        console.log('lambda input', currentState.StateData);
        console.log('lambda output', data);
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
      if (
        choiceObject.Variable.substring(0, 2) !== '$.' ||
        choiceObject.Variable.length < 3
      ) {
        throw new Error(
          `Invalid variable name ${
            choiceObject.Variable
          }. Variable names should be of the format $.Property_Name`
        );
      }
      const variable =
        currentState.StateData[choiceObject.Variable.substring(2)];
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
  const choiceArray = workflowObject.States[currentState.StateName].Choices;
  for (let i = 0; i < choiceArray.length; i++) {
    if (evaluateChoice(choiceArray[i])) {
      currentState.StateName = choiceArray[i].Next;
      return currentState;
    }
  }
  currentState.StateName =
    workflowObject.States[currentState.StateName].Default;
  if (!currentState.StateName) {
    throw new Error('No default choice state to go to.');
  }
  return currentState;
}

function testWorkflow() {
  executeWorkflow('choiceTest.json', { array: [1, 1, 1] }, 'us-east-1', x =>
    console.log(x)
  );
}

testWorkflow();

const lambdaOrchestrator = {
  executeWorkflow: executeWorkflow
};

module.exports = lambdaOrchestrator;
