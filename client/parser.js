// function executeParallel(state, input) {}

function executeStateObject(state = {}, input, prevFunc, currFunc) {
  const type = state.Type;

  switch (type) {
    case 'Task':
      return drawLine(prevFunc, currFunc);
    case 'Parallel':
      return executeParallel(state, input);
    default:
      return drawLine(prevFunc, currFunc);
  }
}

function executeWorkflow(flowObject, input = '', options) {
  const { StartAt: startAt, States: states } = flowObject;
  let state = states[startAt];
  let prevFunc;
  let currFunc = startAt;

  while (true) {
    input += executeStateObject(state, input, prevFunc, currFunc);
    if (state === undefined) break;
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

function startWorkFlow(flowObject) {
  const output = defaults();
  return executeWorkflow(flowObject, output, { start: true });
}

module.exports = { startWorkFlow };
