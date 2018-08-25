class Florender {
  constructor(flow, element) {
    this.flow = flow;
    this.element = element;
    this.store = {};
    this.output = null;

    this.defaults = () => `
    graph TB
    Start((Start))
    End((End))
  
    classDef orange fill:#ffd47f,  stroke:#000,stroke-width:1px;
    classDef green  fill:#97f679,  stroke:#000,stroke-width:1px;
    classDef red    fill:#ff7d68,  stroke:#000,stroke-width:1px;
    classDef blue   fill:#76c7ff,  stroke:#000,stroke-width:1px;
    classDef grey   fill:#cbcbcb,  stroke:#000,stroke-width:1px;
  
    class Start,End orange`;

    this.drawLine = (a, b) => {
      let line = '-->';

      if (a === 'Start' || b === 'End') line = '-.->';

      return `
      ${a} ${line} ${b}`;
    };

    this.getColor = (func, color) => `
      class ${func} ${color}`;

    this.initializeFunc = ({ States: states }) => Object.keys(states).reduce(
      (accum, key) => `
          ${accum + key}`,
      '',
    );

    this.executeTask = (state, currFunc, end) => {
      let output = '';

      if (state.End) {
        output += this.drawLine(currFunc, end);
      } else {
        output += this.drawLine(currFunc, state.Next);
      }

      return output;
    };

    this.executeParallel = (state, funcName) => {
      const { Branches: branches } = state;
      let output = `
      subgraph ${funcName}`;

      branches.forEach((workFlow) => {
        output += this.initializeFunc(workFlow);
      });

      output += `
      end`;

      branches.forEach((workFlow) => {
        output += this.executeWorkflow(workFlow, state.End || state.Next);
      });

      return output;
    };

    this.executeChoice = (states, state, currFunc) => {
      let output = '';

      state.Choices.forEach((choice) => {
        output += this.drawLine(currFunc, choice.Next);
        output += this.executeStateObject(states, states[choice.Next], choice.Next);
      });

      output += this.drawLine(currFunc, state.Default);
      output += this.executeStateObject(states, states[state.Default], state.Default);

      return output;
    };

    this.executeWorkflow = ({ StartAt: startAt, States: states }, end = 'End') => {
      if (!startAt || !states) throw new Error('BAD CONFIG');

      const state = states[startAt];

      let output = '';

      if (end === 'End') {
        if (state.Type === 'Parallel') {
          state.Branches.forEach((branch) => {
            output += this.drawLine('Start', branch.StartAt);
          });
        } else if (state.Type === 'Task' || state.Type === 'Choice') {
          output += this.drawLine('Start', startAt);
        }
      }

      output += this.executeStateObject(states, state, startAt, undefined, end);

      return output;
    };
  }

  startWorkFlow() {
    if (!this.output) {
      let output = this.defaults();
      output += this.executeWorkflow(this.flow);
      this.output = output;
    }

    return this.output + this.getColors();
  }

  setColor(func, status) {
    let color;

    switch (status) {
      case 'complete':
        color = 'green';
        break;
      case 'fail':
        color = 'red';
        break;
      case 'running':
        color = 'blue';
        break;
      case 'cancel':
        color = 'grey';
        break;
      default:
        throw new Error('UNKNOWN STATUS');
    }

    this.store[func].color = color;

    return this.startWorkFlow();
  }

  getColors() {
    let output = '';

    Object.entries(this.store).forEach(([func, props]) => {
      if (props.color) {
        output += this.getColor(func, props.color);
      }
    });

    return output;
  }

  executeStateObject(states, state, currFunc, output = '', end = 'End') {
    if (!state || this.store[currFunc]) return output;

    this.store[currFunc] = { color: null };

    switch (state.Type) {
      case 'Task':
        output += this.executeTask(state, currFunc, end);
        break;
      case 'Parallel':
        output += this.executeParallel(state, currFunc, end);
        break;
      case 'Choice':
        output += this.executeChoice(states, state, currFunc);
        break;
      default:
        throw new Error('WTF');
    }

    return this.executeStateObject(states, states[state.Next], state.Next, output);
  }
}

module.exports = Florender;
