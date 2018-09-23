import React from 'react';

import { MyContext } from '../../../provider/MyProvider';

const { ipcRenderer } = window.require('electron');

const Actions = ({ action }) => (
  <MyContext.Consumer>
    {({ state }) => {
      const { inputText } = state;

      return (
        <div
          className="actions"
          onClick={(e) => {
            ipcRenderer.send('run', inputText);
          }}
        >
          <span className="actions__text">{action}</span>
          <span className="actions__details">Action</span>
        </div>
      );
    }}
  </MyContext.Consumer>
);

export default Actions;
