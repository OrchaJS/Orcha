import React from 'react';

const OutputContainer = ({ output }) => (
  <div className="output-container">
    <textarea className="output-container__textarea">{output}</textarea>
  </div>
);

export default OutputContainer;
