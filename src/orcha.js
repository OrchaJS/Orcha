const AWS = require('aws-sdk');
const fs = require('fs');

const maxInvocations = 20;
const globalWorkflowState = {};

class Orcha {
  constructor(workflowObject, workflowInput, statusUpdateCallback, errorCallback,
    endOfExecutionCallback, awsLambdaController) {
    this.maxInvocations = 100;
    this.currentInvocations = 0;
    this.workflowObject = workflowObject;
    this.workflowInput = workflowInput;
    this.startTime = Date.now();
    this.statusId = 1;
    this.statusUpdateCallback = statusUpdateCallback;
    this.errorCallback = errorCallback;
    this.endOfExecutionCallback = endOfExecutionCallback;
    this.endOfExecutionCallback.finalFunction = true;
    this.awsLambdaController = awsLambdaController;
    this.sendStatusUpdate({
      Type: 'ExecutionStarted',
    });
  }

  // Start running the JSON workflow
  runWorkflow() {
    this.startWorkflow(this.workflowObject, this.workflowInput, this.endOfExecutionCallback);
  }

  // Execute the workflow. Note that this may not be the entire JSON file.
  // It may be the entire workflow, but it could also be called by executeParallel,
  // meaning that the workflow is one branch in a tree of parallel execution.
  startWorkflow(workflowObject, workflowInput, endOfWorkflowCallback) {
    if (!workflowObject.StartAt) {
      throw new Error('Input JSON must specify a StartAt state');
    }

    const startState = {
      StateName: workflowObject.StartAt,
      StateData: workflowInput,
    };
    this.executeState(workflowObject, startState, endOfWorkflowCallback);
  }

  // executeState checks whether the state is a Task (e.g. Lambda Execution) state,
  // a Parallel state, or a Choice state, and runs the appropriate function.
  executeState(workflowObject, state, endOfWorkflowCallback) {
    this.sendStatusUpdate({
      Type: 'TaskStateEntered',
      Input: state.StateData,
      IsLambdaStatus: false,
      Step: state.StateName,
    });
    if (workflowObject.States[state.StateName].Visited && (!state.Retrying)) {
      this.endWorkflow({
        Type: 'ExecutionFailed',
        executionStatus: 'Failed',
        exceptionMessage: `State ${state.StateName} has already been visited! There may be a cycle/infinite loop in your state transitions. Please check your JSON file.`,
      });
    }
    workflowObject.States[state.StateName].Visited = true;
    switch (workflowObject.States[state.StateName].Type) {
      case 'Task':
        this.executeTask(workflowObject, state, endOfWorkflowCallback);
        break;
      case 'Parallel':
        this.executeParallel(workflowObject, state, endOfWorkflowCallback);
        break;
      case 'Choice':
        const nextState = this.executeChoice(workflowObject, state);
        this.sendStatusUpdate({
          Type: 'TaskStateExited',
          Output: state.StateData,
          Step: state.StateName,
        });
        this.executeState(workflowObject, nextState, endOfWorkflowCallback);
        break;
      case 'Succeed':
        this.sendStatusUpdate({
          Type: 'TaskStateExited',
          Output: state.StateData,
          Step: state.StateName,
        });
        if (endOfWorkflowCallback.finalFunction) {
          this.endWorkflow({
            Type: 'ExecutionSucceeded',
            executionStatus: 'Succeeded',
            output: state.StateData,
          });
        } else {
          endOfWorkflowCallback(state.StateData);
        }
        break;
      default:
        this.endWorkflow({
          Type: 'ExecutionFailed',
          executionStatus: 'Failed',
          exceptionMessage: `State type for ${state.StateName} missing or incorrect`,
        });
    }
  }

  // Executes a lambda and calls stateTransition on its result
  executeTask(workflowObject, currentState, endOfWorkflowCallback) {
    this.currentInvocations += 1;
    if (this.currentInvocations > this.maxInvocations) {
      this.endWorkflow({
        Type: 'ExecutionFailed',
        executionStatus: 'Failed',
        exceptionMessage: 'Max invocations exceeded',
      });
    } else {
      const lambdaName = workflowObject.States[currentState.StateName].LambdaToInvoke;
      const paramsForCurrentLambda = {
        FunctionName: lambdaName,
        Payload: JSON.stringify(currentState.StateData),
      };
      this.sendStatusUpdate({
        Type: 'LambdaFunctionStarted',
        Input: currentState.StateData,
        Lambda: lambdaName,
      });
      this.awsLambdaController.invoke(paramsForCurrentLambda, (err, data) => {
        if (err) {
          this.stateTransition(currentState, workflowObject, endOfWorkflowCallback,
            paramsForCurrentLambda, err);
        } else if (data.FunctionError) {
          const parsedPayload = JSON.parse(data.Payload);
          this.stateTransition(currentState, workflowObject, endOfWorkflowCallback,
            paramsForCurrentLambda, parsedPayload);
        } else {
          const parsedPayload = JSON.parse(data.Payload);
          this.sendStatusUpdate({
            Type: 'LambdaFunctionSucceeded',
            Input: currentState.StateData,
            Output: parsedPayload,
            Lambda: lambdaName,
          });
          // console.log statements for debugging and display purposes in dev
          // console.log('lambda name', currentState.StateName);
          // console.log('lambda input', currentState.StateData);
          // console.log('lambda output', data);
          this.stateTransition(currentState, workflowObject, endOfWorkflowCallback, parsedPayload);
        }
      });
    }
  }

  // Kicks off a new workflow for each branch. The results from the workflow are pushed
  // into an array. When the workflow is complete, stateTransition
  // is run with the array as its argument
  executeParallel(workflowObject, currentState, endOfWorkflowCallback) {
    const numberOfStates = workflowObject.States[currentState.StateName].Branches.length;
    let completeStates = 0;
    const resultArray = [];
    function stateComplete(stateIndex, data) {
      completeStates += 1;
      resultArray[stateIndex] = data;
      if (completeStates === numberOfStates) {
        this.stateTransition(currentState, workflowObject, endOfWorkflowCallback, resultArray);
      }
    }
    workflowObject.States[currentState.StateName].Branches.forEach(
      (branch, index) => {
        this.startWorkflow(workflowObject.States[currentState.StateName].Branches[index],
          currentState.StateData, stateComplete.bind(this, index));
      },
    );
  }

  // Execute choice state. Allows conditional jumping to the next state
  // based on the result of a previous state. Uses evaluateChoice to evaluate
  // each choice in the order they appear in the workflow JSON, and will return
  // when a valid choice is found.
  executeChoice(workflowObject, currentState) {
    const nextState = { StateData: currentState.StateData };
    const choiceArray = workflowObject.States[currentState.StateName].Choices;
    for (let i = 0; i < choiceArray.length; i += 1) {
      if (this.evaluateChoice(choiceArray[i], currentState)) {
        nextState.StateName = choiceArray[i].Next;
        return nextState;
      }
    }
    nextState.StateName = workflowObject.States[currentState.StateName].Default;
    if (!nextState.StateName) {
      this.endWorkflow({
        Type: 'ExecutionFailed',
        executionStatus: 'Failed',
        exceptionMessage: 'No default choice state to go to.',
      });
    }
    return nextState;
  }

  // evaluateChoice is used by executeChoice to evaluate
  // whether a choice's condition is true or false
  evaluateChoice(choiceObject, currentState) {
    if (choiceObject.And) {
      for (let i = 0; i < choiceObject.And.length; i += 1) {
        if (!this.evaluateChoice(choiceObject.And[i], currentState)) {
          return false;
        }
      }
      return true;
    }
    if (choiceObject.Or) {
      for (let i = 0; i < choiceObject.And.length; i += 1) {
        if (this.evaluateChoice(choiceObject.Or[i], currentState)) {
          return true;
        }
      }
      return false;
    }
    if (choiceObject.Not) {
      return !this.evaluateChoice(choiceObject.Not, currentState);
    }
    if (choiceObject.Variable.substring(0, 2) !== '$.' || choiceObject.Variable.length < 3) {
      this.endWorkflow({
        Type: 'ExecutionFailed',
        executionStatus: 'Failed',
        exceptionMessage: `Invalid variable name ${choiceObject.Variable}. Variable names should be of the format $.Property_Name`,
      });
      return;
    }
    const variable = currentState.StateData[choiceObject.Variable.substring(2)];
    const choiceKeys = Object.keys(choiceObject);
    for (let i = 0; i < choiceKeys.length; i += 1) {
      const prop = choiceKeys[i];
      if (prop !== 'Variable' && prop !== 'Next') {
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
            this.endWorkflow({
              Type: 'ExecutionFailed',
              executionStatus: 'Failed',
              exceptionMessage: `${prop} incorrect`,
            });
            return;
        }
      }
    }
    this.endWorkflow({
      Type: 'ExecutionFailed',
      executionStatus: 'Failed',
      exceptionMessage: `${currentState.StateName} malformed`,
    });
  }

  // stateTransition handles the transition from one state to next, given the workflow object.
  // If the invoked state was successful, it will move to the next state, or end workflow execution
  // if the invoked state is the end state. If the invoked state was unsuccessful, it will
  // attempt to retry the state or catch the error, as specified by the workflow object.
  // If the error is unable to be caught, the workflow will end unsuccessfully.
  stateTransition(state, workflowObject, endOfWorkflowCallback, data, err) {
    if (err) {
      this.sendStatusUpdate({
        Type: 'LambdaFunctionFailed',
        Input: state.StateData,
        Step: state.StateName,
        Exception: err,
        Lambda: workflowObject.States[state.StateName].LambdaToInvoke,
      });
      const stateObject = workflowObject.States[state.StateName];
      if (stateObject.Retry) {
        if (this.retryState(state, workflowObject, endOfWorkflowCallback, err)) {
          // able to retry failed state, done with stateTransition
          return;
        }
      }
      if (stateObject.Catch) {
        if (this.catchFailedState(state, workflowObject, endOfWorkflowCallback, err)) {
          // error caught and handled, done with stateTransition
          return;
        }
      }
      // Unable to retry or catch error. Workflow has failed
      this.sendStatusUpdate({
        Type: 'TaskStateExited',
        Output: state.StateData,
        Step: state.StateName,
      });
      this.sendStatusUpdate({
        Type: 'ExecutionFailed',
        Input: state.StateData,
        Step: state.StateName,
        Exception: err,
      });
      this.endWorkflow({
        Type: 'ExecutionFailed',
        executionStatus: 'Failed',
        exceptionMessage: `${err.errorType} not caught for state ${state.StateName}`,
      });
    } else if (!workflowObject.States[state.StateName].End) {
      this.sendStatusUpdate({
        Type: 'TaskStateExited',
        Output: data,
        Step: state.StateName,
      });
      const nextState = {
        StateName: workflowObject.States[state.StateName].Next,
        StateData: data,
      };
      this.executeState(workflowObject, nextState, endOfWorkflowCallback);
    } else {
      this.sendStatusUpdate({
        Type: 'TaskStateExited',
        Output: data,
        Step: state.StateName,
      });
      if (endOfWorkflowCallback.finalFunction) {
        this.endWorkflow({
          Type: 'ExecutionSucceeded',
          executionStatus: 'Succeeded',
          output: data,
        });
      } else {
        endOfWorkflowCallback(data);
      }
    }
  }

  // retryState is used by stateTransition to retry a failed state,
  // if specified by the workflow object
  retryState(state, workflowObject, endOfWorkflowCallback, err) {
    const stateToRetry = workflowObject.States[state.StateName];
    for (let i = 0; i < stateToRetry.Retry.length; i += 1) {
      for (let j = 0; j < stateToRetry.Retry[i].ErrorEquals.length; j += 1) {
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
            this.sendStatusUpdate({
              Type: 'RetryingState',
              Input: state.StateData,
              Step: state.StateName,
              Exception: err,
            });
            setTimeout(this.executeState.bind(this, workflowObject, state, endOfWorkflowCallback),
              waitTime);
            timesRetriedObject[err.errorType] += 1;
            return true;
          }
        }
      }
    }
    return false;
  }

  // catchFailedState is used by stateTransition to catch a failed state,
  // if specified by the workflow object
  catchFailedState(state, workflowObject, endOfWorkflowCallback, err) {
    const errors = workflowObject.States[state.StateName].Catch;
    for (let i = 0; i < errors.length; i += 1) {
      for (let j = 0; j < errors[i].ErrorEquals.length; j += 1) {
        if (err.errorType === errors[i].ErrorEquals[j]) {
          const catchState = {
            StateName: errors[i].Next,
            StateData: state.StateData,
            Error: err.errorType,
            Cause: err.errorMessage,
          };
          this.sendStatusUpdate({
            Type: 'ExceptionCaught',
            Input: state.StateData,
            Step: state.StateName,
            Exception: err,
          });
          this.sendStatusUpdate({
            Type: 'TaskStateExited',
            Output: state.StateData,
            Step: state.StateName,
          });
          this.executeState(workflowObject, catchState, endOfWorkflowCallback);
          return true;
        }
      }
    }
    return false;
  }

  // Sends an update to the user based on the user's specified
  // status update callback
  sendStatusUpdate(statusObject) {
    if (this.statusUpdateCallback) {
      const callbackObject = {
        ...statusObject,
        id: this.statusId,
        elapsedTime: Date.now() - this.startTime,
        currentTime: Date.now(),
      };
      this.statusId += 1;
      if (statusObject.Lambda) {
        callbackObject.lambdaURL = `https://console.aws.amazon.com/lambda/home?region=${globalWorkflowState.region}#/functions/${statusObject.Lambda}`;
        callbackObject.cloudURL = `https://console.aws.amazon.com/cloudwatch/home?region=${globalWorkflowState.region}#logStream:group=/aws/lambda/${statusObject.Lambda}`;
      }
      this.statusUpdateCallback(statusObject);
    }
  }

  // endWorkflow ends the execution of the workflow, either returning
  // successfully and invoking the user's end of execution callback,
  // or by throwing an error if execution was unsuccessful
  endWorkflow(endOfExecutionObject) {
    const callbackObject = {
      ...endOfExecutionObject,
      id: this.statusId,
      elapsedTime: Date.now() - this.startTime,
      Input: this.workflowInput,
      currentTime: Date.now(),
    };
    if (endOfExecutionObject.executionStatus === 'Succeeded') {
      this.endOfExecutionCallback(callbackObject);
    } else {
      if (this.errorCallback) {
        this.errorCallback(callbackObject);
      }
      throw new Error(endOfExecutionObject.exceptionMessage);
    }
  }
}

function executeWorkflow(configObject) {
  const {
    jsonPath, region, workflowInput, statusUpdateCallback, endOfExecutionCallback, errorCallback,
  } = configObject;
  const workflowObject = (jsonPath) ? JSON.parse(fs.readFileSync(jsonPath))
    : configObject.workflowObject;
  if (!jsonPath && !workflowObject) {
    throw new Error('Please specify a path to your JSON workflow.');
  }
  if (!region) {
    throw new Error('Must specify an AWS region (e.g. \'us-east-1\')');
  }
  if (!endOfExecutionCallback) {
    throw new Error('Please specify a callback function to run at the end of workflow execution.');
  }
  AWS.config.update({ region });
  const awsLambdaController = new AWS.Lambda();
  const orchaController = new Orcha(workflowObject, workflowInput, statusUpdateCallback,
    errorCallback, endOfExecutionCallback, awsLambdaController);
  orchaController.runWorkflow();
}

function testWorkflow() {
  executeWorkflow({
    jsonPath: '../test/json_workflow_file_test_cases/simpleRetry.json',
    workflowInput: { array: [1, -1, 0] },
    region: 'us-east-1',
    endOfExecutionCallback: x => console.log(x),
    statusUpdateCallback: x => console.log(x),
  });
}

// testWorkflow();

const orcha = {
  executeWorkflow,
};

module.exports = orcha;
