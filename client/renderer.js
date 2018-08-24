// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

const mermaid = require('mermaid');
const { ipcRenderer } = require('electron');
const Florender = require('./parser');
const orcha = require('../src/orcha');

mermaid.initialize({ startOnLoad: true });

const mermaidEl = document.querySelector('.mermaid');
const changeButtonEl = document.querySelector('.change-color');

changeButtonEl.addEventListener('click', () => {
  ipcRenderer.send('changeColor', 'addTwoArrays', 'red');
});

let florender;

ipcRenderer.on('ping', (event, flow) => {
  florender = new Florender(flow, mermaidEl);
  const output = florender.startWorkFlow(flow);

  mermaid.render('theGraph', output, (svgCode) => {
    mermaidEl.innerHTML = svgCode;
  });
});

ipcRenderer.on('runWorkflow', (event, flow, input) => {
  orcha.executeWorkflowParsed(flow, input, 'us-east-1', (data) => {
    alert(JSON.stringify(data));
  });
});

ipcRenderer.on('render', (event, func, color) => {
  mermaidEl.removeAttribute('data-processed');
  const output = florender.setColor(func, color);
  mermaidEl.innerHTML = output;
  mermaid.init(undefined, mermaidEl);
});
