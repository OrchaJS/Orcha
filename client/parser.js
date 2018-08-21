function initializeFunc({ States: states }) {
  return Object.keys(states).reduce(
    (accum, key) => `
    ${accum + key}`,
    '',
  );
}

function executeParallel(state, funcName) {
  const { Branches: branches } = state;
  let output = `
  subgraph ${funcName}`;

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

function executeStateObject(state = {}, prevFunc, currFunc) {
  const type = state.Type;

  switch (type) {
    case 'Task':
      return drawLine(prevFunc, currFunc);
    case 'Parallel':
      return executeParallel(state, currFunc);
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

  while (currFunc) {
    input += executeStateObject(state, prevFunc, currFunc);
    prevFunc = currFunc;
    currFunc = state.Next;
    state = states[currFunc];
  }

  input += executeStateObject(state, prevFunc, cache);

  return input;
}

/** **********
 * options.start === true means outer workflow, else it's a branch
 * RETURNS: STRING
 */
function executeWorkflow(flowObject) {
  const { StartAt: startAt, States: states } = flowObject;
  let state = states[startAt];
  let prevFunc;
  let currFunc = startAt;
  let input = '';

  while (true) {
    input += executeStateObject(state, prevFunc, currFunc);
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
  ${a} ${line} ${b}`;
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
  let output = defaults();
  output += executeWorkflow(workFlow);
  return output;
}

module.exports = { startWorkFlow };
