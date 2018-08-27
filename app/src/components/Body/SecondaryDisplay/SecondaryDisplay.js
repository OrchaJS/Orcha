import React, { Fragment } from 'react';

import Card from './Card/Card';
import { MyContext } from '../../../provider/MyProvider';

const SecondaryDisplay = () => (
  <div className="secondary-display">
    <MyContext.Consumer>
      {({
        state: {
          lambdaDetails, lambdaInput, lambdaOutput, secondaryActiveTab,
        },
      }) => {
        switch (secondaryActiveTab) {
          case 'Details':
            return (
              <Fragment>
                <Card title="Details" text={lambdaDetails} active />
                <Card title="Input" text={lambdaInput} active={false} />
                <Card title="Output" text={lambdaOutput} active={false} />
              </Fragment>
            );

            break;
          case 'Input':
            return (
              <Fragment>
                <Card title="Details" text={lambdaDetails} active={false} />
                <Card title="Input" text={lambdaInput} active />
                <Card title="Output" text={lambdaOutput} active={false} />
              </Fragment>
            );

            break;
          case 'Output':
            return (
              <Fragment>
                <Card title="Details" text={lambdaDetails} active={false} />
                <Card title="Input" text={lambdaInput} active={false} />
                <Card title="Output" text={lambdaOutput} active />
              </Fragment>
            );

            break;
          default:
            throw new Error(('secondaryTab wtf', secondaryActiveTab));
        }
      }}
    </MyContext.Consumer>
  </div>
);

export default SecondaryDisplay;
