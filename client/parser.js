function initializeFunc({ States: states }) {
  return Object.keys(states).reduce(
    (accum, key) => `
    ${accum + key}`,
    '',
  );
}

/**
 *
 * @param {Object} state
 * @param {String} prevFunc
 * @param {String} currFunc
 */
function executeTask(state, currFunc, end) {
  let output = '';

  if (state.End) {
    output += drawLine(currFunc, end, '-.->');
  } else {
    output += drawLine(currFunc, state.Next, '-->');
  }

  return output;
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
    output += executeWorkflow(workFlow, state.End || state.Next);
  });

  return output;
}

function executeStateObject(states, state, currFunc, output = '', end = 'End') {
  if (!state) return output;

  const type = state.Type;
  console.log(type);
  switch (type) {
    case 'Task':
      output += executeTask(state, currFunc, end);
      break;
    case 'Parallel':
      output += executeParallel(state, currFunc, end);
      break;
    case 'Choice':
      output += executeChoice(state.Choices, prevFunc, currFunc, end);
      break;
    default:
      throw new Error('WTF');
  }

  const nextState = states[state.Next];

  return executeStateObject(states, nextState, state.Next, output);
}

function executeChoice(choices, prevFunc, currFunc) {
  let output = `
  ${prevFunc} --> ${currFunc}`;
  choices.forEach((choice) => {
    output += `
    ${currFunc} --> ${choice.Next}`;
  });
  // we've reached the point where we need to run regular execution on "Next"
  return output;
}

function executeWorkflow({ StartAt: startAt, States: states }, end = 'End') {
  if (!startAt || !states) throw new Error('BAD CONFIG');

  const state = states[startAt];

  let output = '';

  // draws lines form start to startAt.
  if (state.Type !== 'Parallel') {
    output += drawLine('Start', startAt, '-.->');
  }

  output += executeStateObject(states, state, startAt, undefined, end);
  return output;
}

function drawLine(a, b, line) {
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
