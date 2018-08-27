import React, { Fragment } from 'react';

import { MyContext } from '../../provider/MyProvider';

const Status = () => (
  <div className="status">
    <MyContext.Consumer>
      {({ state: { executionStatus } }) => {
        let color;

        switch (executionStatus) {
          case 'Not Started':
            color = 'black';
            break;
          case 'Running':
            color = 'blue';
            break;
          case 'Failed':
            color = 'red';
            break;
          case 'Cancelled':
            color = 'grey';
            break;
          default:
            color = 'black';
        }

        return (
          <Fragment>
            <span className={`status__text status__text--${color}`}>Status</span>
            <span className="status__details">Execution status</span>
          </Fragment>
        );
      }}
    </MyContext.Consumer>
  </div>
);

export default Status;
