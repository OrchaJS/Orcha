import React, { Fragment } from 'react';

import PrimaryDisplayHeader from './PrimaryDisplayHeader';
import PrimaryDisplayBody from './PrimaryDisplayBody';
import { MyContext } from '../../../provider/MyProvider';

const PrimaryDisplay = () => (
  <div className="primary-display">
    <MyContext.Consumer>
      {({ state: { primaryActiveTab, svgCode }, handleClickPrimaryTab }) => (
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
