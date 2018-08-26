import React, { Component } from 'react';

const { ipcRenderer } = window.require('electron');

class InputContainer extends Component {
  state = {
    text: '',
  };

  render() {
    return (
      <div className="input-container">
        <textarea className="input-container__textarea">{text}</textarea>
      </div>
    );
  }
}

export default InputContainer;
