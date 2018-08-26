import React from 'react';

const LegendKey = ({ color, status }) => (
  <div className="legend__key">
    <span className={`legend__key-color--${color}`}>{status}</span>
  </div>
);

export default LegendKey;
