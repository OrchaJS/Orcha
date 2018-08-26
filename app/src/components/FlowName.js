import React from 'react';

const FlowName = ({ flowname }) => (
  <div className="flowname">
    <span className="flowname__text">{flowname}</span>
    <span className="flowname__details">Workflow</span>
  </div>
);

export default FlowName;
