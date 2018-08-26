import React, { Fragment } from 'react';

import LogTableBodyRow from './LogTableBodyRow';
import { MyContext } from '../../../../../provider/MyProvider';

const LogTableBodyRows = () => (
  <MyContext.Consumer>
    {({ executionHistory }) => (
      <tbody>
        {executionHistory.map(log => (
          <LogTableBodyRow {...log} />
        ))}
      </tbody>
    )}
  </MyContext.Consumer>
);

export default LogTableBodyRows;
