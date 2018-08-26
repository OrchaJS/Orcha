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

mermaid.initialize({ startOnLoad: true });

// const changeButtonEl = document.querySelector('.change-color');

// changeButtonEl.addEventListener('click', () => {
//   ipcRenderer.send('run');
// });

let florender;

ipcRenderer.on('openFile', (event, flow) => {
  florender = new Florender(flow);
  const output = florender.startWorkFlow(flow);

  mermaid.render('theGraph', output, (svgCode) => {
    render(<App svgCode={svgCode} />, document.getElementById('app'));
  });
});

// ipcRenderer.on('rerender', (event, func, status) => {
//   mermaidEl.removeAttribute('data-processed');
//   const output = florender.setColor(func, status);
//   mermaidEl.innerHTML = output;
//   mermaid.init(undefined, mermaidEl);
// });

render(<App svgCode={undefined} />, document.getElementById('app'));
