import React from 'react';

import LogTableRows from './LogTableRows/LogTableRows';

const LogTable = () => (
  <table className="log__table">
    <thead className="log__table-header">
      <tr>
        <th>ID</th>
        <th>Type</th>
        <th>Step</th>
        <th>Resource</th>
        <th>Status</th>
        <th>Elapsed Time (ms)</th>
        <th>Timestamp</th>
      </tr>
    </thead>
    <LogTableRows />
  </table>
);

export default LogTable;
