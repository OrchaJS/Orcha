import React, { Fragment } from 'react';

import Card from './Card';
import { MyContext } from '../../../provider/MyProvider';

const SecondaryDisplay = ({ svgCode }) => (
  <div className="secondary-display">
    <MyContext.Consumer>
      {({ lambdaDetails, lambdaInput, lambdaOutput }) => (
        <Fragment>
          <Card title="Details" text={lambdaDetails} />
          <Card title="Input" text={lambdaInput} />
          <Card title="Output" text={lambdaOutput} />
        </Fragment>
      )}
    </MyContext.Consumer>
  </div>
);

export default SecondaryDisplay;
