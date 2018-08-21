const AWS = require('aws-sdk-mock');
const path = require('path');
const orcha = require('../src/orcha');
const addOneToArrayNumbers = require('./mock_lambdas/addOneToArrayNumbers');
const squareArrayNumbers = require('./mock_lambdas/squareArrayNumbers.js');
const sumArrays = require('./mock_lambdas/sumArrays.js');
const squareRootArrayNumbers = require('./mock_lambdas/squareRootArrayNumbers.js');

const mockedLambdas = {
  addOneToArrayNumbers,
  squareArrayNumbers,
  sumArrays,
  squareRootArrayNumbers
};

const jsonWorkflowPaths = path.join(__dirname, './json_workflow_file_test_cases/');
const workflowPaths = {
  simple: path.join(jsonWorkflowPaths, 'simple.json'),
  parallel: path.join(jsonWorkflowPaths, 'parallel.json'),
  choice: path.join(jsonWorkflowPaths, 'parallelChoice.json'),
  simpleRetry: path.join(jsonWorkflowPaths, 'simpleRetry.json')
};

AWS.mock('Lambda', 'invoke', (params, callback) => {
  const parsedPayloadToLambda = JSON.parse(params.Payload);
  const lambdaReturnValue = mockedLambdas[params.FunctionName](JSON.parse(params.Payload));
  const objectReturnedFromLambda = { Payload: JSON.stringify(lambdaReturnValue) };
  // when we invoke mock lambda, return null for err and return value for data
  // see orcha.executeTask for detail
  callback(null, objectReturnedFromLambda);
});

test('simple workflow', () => {
  const testCase = { array: [1, 3, 4] };
  const testWorkflow = addOneToArrayNumbers(squareArrayNumbers(addOneToArrayNumbers(testCase)));
  orcha.executeWorkflow(workflowPaths.simple, testCase, 'us-east-1', (data) => {
    expect(data).toEqual(testWorkflow);
    expect(data).toEqual({ array: [5, 17, 26] });
  });
});

test('parallel workflow', () => {
  const testCase = { array: [1, 3, 4] };
  const testWorkflow = sumArrays([addOneToArrayNumbers(testCase), squareArrayNumbers(testCase)])
  orcha.executeWorkflow(workflowPaths.parallel, testCase, 'us-east-1', (data) => {
    expect(data).toEqual(testWorkflow);
    expect(data).toEqual({ array: [3, 13, 21], sum: 37 });
  });
});

test('choice workflow first choice chosen', () => {
  const testCase = { array: [1, 2, 3] };
  const beforeChoiceWorkflow = sumArrays([addOneToArrayNumbers(testCase), squareArrayNumbers(testCase)]);
  const afterChoiceWorkflow = addOneToArrayNumbers(beforeChoiceWorkflow);
  orcha.executeWorkflow(workflowPaths.choice, testCase, 'us-east-1', (data) => {
    expect(data).toEqual(afterChoiceWorkflow);
    expect(data).toEqual({ array: [4, 8, 14] });
  });
});

test('choice workflow second choice chosen', () => {
  const testCase = { array: [0, 1, 2] };
  const beforeChoiceWorkflow = sumArrays([addOneToArrayNumbers(testCase), squareArrayNumbers(testCase)]);
  const afterChoiceWorkflow = addOneToArrayNumbers(addOneToArrayNumbers(beforeChoiceWorkflow));
  orcha.executeWorkflow(workflowPaths.choice, testCase, 'us-east-1', (data) => {
    expect(data).toEqual(afterChoiceWorkflow);
    expect(data).toEqual({ array: [3, 5, 9] });
  });
});

test('choice workflow default choice chosen', () => {
  const testCase = { array: [2, 3, 4] };
  const beforeChoiceWorkflow = sumArrays([addOneToArrayNumbers(testCase), squareArrayNumbers(testCase)]);
  const afterChoiceWorkflow = addOneToArrayNumbers(addOneToArrayNumbers(addOneToArrayNumbers(beforeChoiceWorkflow)));
  orcha.executeWorkflow(workflowPaths.choice, testCase, 'us-east-1', (data) => {
    expect(data).toEqual(afterChoiceWorkflow);
    expect(data).toEqual({ array: [10, 16, 24] });
  });
});

test('mock lambda addOneToArrayNumbers', () => {
  const lambdaInput = {
    array: [5, 9, 2]
  };
  const expectedOutput = {
    array: [6, 10, 3]
  };
  expect(addOneToArrayNumbers(lambdaInput)).toEqual(expectedOutput);
});

test('mock lambda squareArrayNumbers', () => {
  const lambdaInput = {
    array: [5, 2, 4]
  };
  const expectedOutput = {
    array: [25, 4, 16]
  };
  expect(squareArrayNumbers(lambdaInput)).toEqual(expectedOutput);
});

test('mock lambda sumArrays', () => {
  const lambdaInput = [
    {
      array: [9, 2, -1]
    },
    {
      array: [3, -6, 11]
    },
    {
      array: [-10, 5, 8]
    }
  ];
  const expectedOutput = {
    array: [2, 1, 18],
    sum: 21
  };
  expect(sumArrays(lambdaInput)).toEqual(expectedOutput);
});

test('mock lambda squareRootArrayNumbers', () => {
  const lambdaInput = {
    array: [9, 4, 25]
  };
  const expectedOutput = {
    array: [3, 2, 5]
  };
  expect(squareRootArrayNumbers(lambdaInput)).toEqual(expectedOutput);
});