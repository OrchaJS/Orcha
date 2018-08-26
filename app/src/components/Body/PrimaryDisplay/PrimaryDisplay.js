import React, { Fragment } from 'react';

import PrimaryDisplayHeader from './PrimaryDisplayHeader';
import PrimaryDisplayBody from './PrimaryDisplayBody';
import { MyContext } from '../../../provider/MyProvider';

const PrimaryDisplay = ({ svgCode }) => (
  <div className="primary-display">
    <MyContext.Consumer>
      {({ tab }) => (
        <Fragment>
          <PrimaryDisplayHeader tab={tab} />
          <PrimaryDisplayBody svgCode={svgCode} tab={tab} />
        </Fragment>
      )}
    </MyContext.Consumer>
  </div>
);

export default PrimaryDisplay;
