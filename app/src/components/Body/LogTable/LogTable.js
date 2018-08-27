import React from 'react';

import LogTableHeader from './LogTableHeader';
import LogTableBody from './LogTableBody/LogTableBody';

const LogTable = () => (
  <div className="log-table">
    <LogTableHeader />
    <LogTableBody />
  </div>
);

export default LogTable;
