# Horchata

AWS Lambda Orchestrator. Allows you to give a JSON workflow file in the Amazon States Language, and execute lambda functions based on your workflow. You can open your workflow in the UI to see a diagram of your workflow. Executing your workflow requires that you have already created those lambda functions in AWS and have access to them.

## Prerequisites

You need to have access to your lambda functions through the AWS CLI. To test whether you do, run this in your terminal:

```
aws lambda list-functions
```

You should see a list of your lambda functions.

## Installing

Clone the repo and then run:

```
npm install
```

## Creating workflows

The workflow files should be written in the [Amazon States Language](https://docs.aws.amazon.com/step-functions/latest/dg/concepts-amazon-states-language.html).
See test/json_workflow_file_test_cases for example workflow files. These examples are
used by the unit tests in test/horchata.test.js

## Running your workflow

To run your workflow, require the source file, and run executeWorkflow:

```
const horchata = require('./src/horchata);
horchata.executeWorkflow(jsonPath, workflowInput, region, callback);
```

jsonPath is the path to your workflow, workflowInput is the input to your first lambda, region is the AWS region where your lambdas are, and callback is a function
that will run after your workflow is complete.
For example, to run a workflow and log the result to the console, you could run:

```
horchata.executeWorkflow('test.json', {users: ['Alice', 'Bob', 'Charlie']}, 'us-east-1', (workflowOutput) => console.log(workflowOutput));
```

## Using the UI

To run the UI run:

```
npm run client
```

You can then open a workflow file to view the workflow tree.

## Running the tests

To run the unit tests:

```
npm test
```
