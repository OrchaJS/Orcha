import React from 'react';

import { MyContext } from '../../../provider/MyProvider';
import Card from './Card/Card';
import DetailBody from './Card/DetailBody';

const SecondaryDisplay = () => (
  <MyContext.Consumer>
    {({ state }) => {
      const { executionHistory, selectedLambda } = state;
      const input = executionHistory.length > 0 && selectedLambda !== null
        ? executionHistory.filter(
          execution => execution.step === selectedLambda && execution.type === 'TaskStateEntered',
        )[0].input
        : '';

      return (
        <div className="secondary-display">
          <Card
            title="Details"
            render={() => (
              <DetailBody
                name={selectedLambda}
                status="Running"
                arn="arn:aws:elasticbeanstalk:us-east-1:123456789012:environment:123456789012/My_App/My_Environment"
              />
            )}
            active
          />
          <Card
            title="Input"
            render={() => (
              <textarea className="step-textarea" value={JSON.stringify(input)} readOnly />
            )}
          />
          <Card
            title="Output"
            render={() => (
              <textarea className="step-textarea" value={JSON.stringify(input)} readOnly />
            )}
          />
        </div>
      );
    }}
  </MyContext.Consumer>
);

export default SecondaryDisplay;
