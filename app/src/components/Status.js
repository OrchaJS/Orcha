import React from 'react';

const Status = ({ status }) => (
  <div className="status">
    <span className="status__text">{status}</span>
    <span className="status__details">Status</span>
  </div>
);

export default Status;
