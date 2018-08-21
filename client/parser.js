function executeParallel(state) {
  const { Branches: branches } = state;
  let output = `
  subgraph fuck`;

  branches.forEach((workFlow) => {
    output += initializeFunc(workFlow);
  });

  output += `
  end`;

  branches.forEach((workFlow) => {
    output += executeBranch(workFlow, state.Next);
  });

  return output;
}

function initializeFunc(workflow) {
  let output = '';
  console.log(workflow.States);
  Object.keys(workflow.States).forEach((key) => {
    output += `
    ${key}`;
  });
  return output;
}

function executeStateObject(state = {}, input, prevFunc, currFunc) {
  const type = state.Type;

  switch (type) {
    case 'Task':
      return drawLine(prevFunc, currFunc);
    case 'Parallel':
      return executeParallel(state);
    default:
      return drawLine(prevFunc, currFunc);
  }
}

function executeBranch(workFlow, cache) {
  const { StartAt: startAt, States: states } = workFlow;
  let state = states[startAt];
  let prevFunc;
  let currFunc = startAt;
  let input = '';

  while (true) {
    if (currFunc === undefined) {
      input += executeStateObject(state, input, prevFunc, cache);
      break;
    }
    input += executeStateObject(state, input, prevFunc, currFunc);
    prevFunc = currFunc;
    currFunc = state.Next;
    state = states[currFunc];
  }

  return input;
}

/** **********
 * options.start === true means outer workflow, else it's a branch
 * RETURNS: STRING
 */
function executeWorkflow(flowObject, input = '', options) {
  const { StartAt: startAt, States: states } = flowObject;
  let state = states[startAt];
  let prevFunc;
  let currFunc = startAt;

  while (true) {
    input += executeStateObject(state, input, prevFunc, currFunc, options);
    if (state === undefined) break;
    if (state.Type === 'Parallel') {
      prevFunc = currFunc;
      currFunc = state.Next;
      state = states[currFunc];
    }
    prevFunc = currFunc;
    currFunc = state.Next;
    state = states[currFunc];
  }

  return input;
}

function drawLine(a = 'Start', b = 'End') {
  let line = '-->';

  if (a === 'Start' || b === 'End') line = '-.->';

  return `
  ${a}${line}${b}`;
}

function defaults() {
  return `
  graph TB
  Start((Start))
  End((End))
  classDef green fill:#9f6,stroke:#333,stroke-width:2px;
  class Start,End green`;
}

function startWorkFlow(workFlow) {
  const output = defaults();
  return executeWorkflow(workFlow, output, { start: true });
}

module.exports = { startWorkFlow };
