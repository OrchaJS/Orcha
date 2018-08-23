const store = {};

function drawLine(a, b) {
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
  classDef orange fill:#ffd47f,stroke:#000,stroke-width:1px;
  class Start,End orange`;
}

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
  if (!state || store[currFunc]) return output;

  store[currFunc] = true;

  const type = state.Type;

  switch (type) {
    case 'Task':
      output += executeTask(state, currFunc, end);
      break;
    case 'Parallel':
      output += executeParallel(state, currFunc, end);
      break;
    case 'Choice':
      output += executeChoice(states, state, currFunc);
      break;
    default:
      throw new Error('WTF');
  }

  const nextState = states[state.Next];

  return executeStateObject(states, nextState, state.Next, output);
}

function executeChoice(states, state, currFunc) {
  let output = '';

  state.Choices.forEach((choice) => {
    output += drawLine(currFunc, choice.Next);
    output += executeStateObject(states, states[choice.Next], choice.Next);
  });

  output += drawLine(currFunc, state.Default);
  output += executeStateObject(states, states[state.Default], state.Default);

  return output;
}

function executeWorkflow({ StartAt: startAt, States: states }, end = 'End') {
  if (!startAt || !states) throw new Error('BAD CONFIG');

  const state = states[startAt];

  let output = '';
  if (end === 'End') {
    if (state.Type === 'Parallel') {
      state.Branches.forEach((branch) => {
        output += drawLine('Start', branch.StartAt);
      });
    } else if (state.Type === 'Task' || state.Type === 'Choice') {
      output += drawLine('Start', startAt);
    }
  }

  output += executeStateObject(states, state, startAt, undefined, end);
  return output;
}

function startWorkFlow(workFlow) {
  let output = defaults();
  output += executeWorkflow(workFlow);
  return output;
}

module.exports = { startWorkFlow };
