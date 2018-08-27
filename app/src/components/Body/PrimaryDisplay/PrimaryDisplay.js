import React, { Fragment } from 'react';

import PrimaryDisplayHeader from './PrimaryDisplayHeader';
import PrimaryDisplayBody from './PrimaryDisplayBody';
import { MyContext } from '../../../provider/MyProvider';

const PrimaryDisplay = ({ svgCode }) => (
  <div className="primary-display">
    <MyContext.Consumer>
      {({ state }) => (
        <Fragment>
          <PrimaryDisplayHeader tab={state.primaryActiveTab} />
          <PrimaryDisplayBody svgCode={svgCode} tab={state.primaryActiveTab} />
        </Fragment>
      )}
    </MyContext.Consumer>
  </div>
);

export default PrimaryDisplay;
