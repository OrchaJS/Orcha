import React, { Fragment } from 'react';

import PrimaryDisplayHeader from './PrimaryDisplayHeader';
import PrimaryDisplayBody from './PrimaryDisplayBody';
import { MyContext } from '../../../provider/MyProvider';

const PrimaryDisplay = ({ svgCode }) => (
  <div className="primary-display">
    <MyContext.Consumer>
      {({ state: { primaryActiveTab }, handleClickPrimaryTab }) => (
        <Fragment>
          <PrimaryDisplayHeader
            tab={primaryActiveTab}
            handleClickPrimaryTab={handleClickPrimaryTab}
          />
          <PrimaryDisplayBody svgCode={svgCode} tab={primaryActiveTab} />
        </Fragment>
      )}
    </MyContext.Consumer>
  </div>
);

export default PrimaryDisplay;
