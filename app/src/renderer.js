// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

import mermaid from 'mermaid';
import React from 'react';
import { render } from 'react-dom';

import Florender from './parser';
import App from './components/App';
import '../../styles/main.scss';

const { ipcRenderer } = window.require('electron');

// mermaid.initialize({ startOnLoad: true });

// const changeButtonEl = document.querySelector('.change-color');

// changeButtonEl.addEventListener('click', () => {
//   ipcRenderer.send('run');
// });

let florender;

const store = {};

ipcRenderer.on('openFile', (event, { configObject, flowname }) => {
  store.flowname = flowname;
  florender = new Florender(configObject);
  const output = florender.startWorkFlow();

  mermaid.render('theGraph', output, (svgCode) => {
    store.svgCode = svgCode;
    render(<App {...store} />, document.getElementById('app'));
  });
});

ipcRenderer.on('statusUpdate', (event, log) => {
  console.log(log);
  const {
    Type: type,
    id,
    elapsedTime,
    Input: input,
    Step: step,
    lambdaURL,
    cloudURL,
    currentTime: timestamp,
  } = log;

  if (store.executionHistory === undefined) {
    store.executionHistory = [];
  }

  if (store.nodes === undefined) {
    store.nodes = {};
  }

  store.executionHistory.push({
    type,
    id,
    elapsedTime,
    input,
    step,
    lambdaURL,
    cloudURL,
    timestamp,
  });
  render(<App {...store} />, document.getElementById('app'));
});

ipcRenderer.on(
  'endOfExecution',
  (event, {
    executionStatus, output, id, elapsedTime, Input: input, currentTime, Type: type,
  }) => {
    store.executionHistory.push({
      executionStatus,
      output,
      id,
      elapsedTime,
      input,
      currentTime,
      type,
    });
    store.executionStatus = executionStatus;
    store.outputText = JSON.stringify(output, undefined, 2);
    render(<App {...store} />, document.getElementById('app'));
  },
);

ipcRenderer.on('render', (event, func, status) => {
  mermaidEl.removeAttribute('data-processed');
  const output = florender.setColor(func, status);
  mermaidEl.innerHTML = output;
  mermaid.init(undefined, mermaidEl);
});

render(<App svgCode={undefined} />, document.getElementById('app'));
