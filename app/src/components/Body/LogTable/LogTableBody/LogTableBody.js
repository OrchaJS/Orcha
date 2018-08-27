import React from 'react';

import LogTableBodyRows from './LogTableBodyRows/LogTableBodyRows';

const LogTableBody = () => (
  <table className="log-table__body">
    <thead className="log-table__body-header">
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
    <LogTableBodyRows />
  </table>
);

export default LogTableBody;
