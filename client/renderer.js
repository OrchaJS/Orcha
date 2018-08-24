// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

const mermaid = require('mermaid');
const { ipcRenderer } = require('electron');
const Florender = require('./parser');

mermaid.initialize({ startOnLoad: true });

const mermaidEl = document.querySelector('.mermaid');
const changeButtonEl = document.querySelector('.change-color');

changeButtonEl.addEventListener('click', () => {
  ipcRenderer.send('run');
});

let florender;

ipcRenderer.on('openFile', (event, flow) => {
  florender = new Florender(flow, mermaidEl);
  const output = florender.startWorkFlow(flow);

  mermaid.render('theGraph', output, (svgCode) => {
    mermaidEl.innerHTML = svgCode;
  });
});

ipcRenderer.on('rerender', (event, func, status) => {
  mermaidEl.removeAttribute('data-processed');
  const output = florender.setColor(func, status);
  mermaidEl.innerHTML = output;
  mermaid.init(undefined, mermaidEl);
});
