import React from 'react';

const OutputContainer = ({ output }) => (
  <div className="output-container">
    <textarea className="output-container__textarea" readOnly>
      {output}
    </textarea>
  </div>
);

export default OutputContainer;
