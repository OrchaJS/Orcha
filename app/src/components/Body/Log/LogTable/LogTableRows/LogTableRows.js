import React from 'react';

import LogTableRow from './LogTableRow';
import { MyContext } from '../../../../../provider/MyProvider';

const LogTableRows = () => (
  <MyContext.Consumer>
    {({ state }) => (
      <tbody>
        {state.executionHistory.map(log => (
          <LogTableRow {...log} />
        ))}
      </tbody>
    )}
  </MyContext.Consumer>
);

export default LogTableRows;
