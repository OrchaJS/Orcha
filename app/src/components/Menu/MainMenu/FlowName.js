import React from 'react';

import { MyContext } from '../../../provider/MyProvider';

const FlowName = () => (
  <MyContext.Consumer>
    {({ state }) => {
      const { flowname } = state;

      return (
        <div className="flowname">
          <span className="flowname__text">{flowname}</span>
          <span className="flowname__details">Workflow</span>
        </div>
      );
    }}
  </MyContext.Consumer>
);

export default FlowName;
