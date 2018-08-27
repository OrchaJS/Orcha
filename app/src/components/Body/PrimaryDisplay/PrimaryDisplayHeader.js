import React from 'react';

const PrimaryDisplayHeader = ({ tab, handleClickPrimaryTab }) => (
  <div className="primary-display__header">
    <div
      className="primary-display__header-tab"
      onClick={() => {
        handleClickPrimaryTab('Diagram');
      }}
    >
      <span className="heading-secondary">Diagram</span>
    </div>
    <div
      className="primary-display__header-tab"
      onClick={() => {
        handleClickPrimaryTab('Input');
      }}
    >
      <span className="heading-secondary">Input</span>
    </div>
    <div
      className="primary-display__header-tab"
      onClick={() => {
        handleClickPrimaryTab('Output');
      }}
    >
      <span className="heading-secondary">Output</span>
    </div>
  </div>
);

export default PrimaryDisplayHeader;
