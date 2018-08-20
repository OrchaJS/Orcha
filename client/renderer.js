// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

const mermaid = require('mermaid');
const { ipcRenderer } = require('electron');
const { executeWorkflow } = require('./parser');

mermaid.initialize({ startOnLoad: true });

const mermaidEl = document.querySelector('.mermaid');

ipcRenderer.on('ping', (event, flow) => {
  const output = executeWorkflow(flow);

  console.log(output);

  mermaid.render('theGraph', output, function(svgCode) {
    mermaidEl.innerHTML = svgCode;
  });
});
