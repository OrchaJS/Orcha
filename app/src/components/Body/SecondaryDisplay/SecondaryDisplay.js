import React from 'react';

import Card from './Card/Card';
import DetailBody from './Card/DetailBody';

const SecondaryDisplay = () => (
  <div className="secondary-display">
    <Card
      title="Details"
      render={() => (
        <DetailBody
          name="ParallelMeUpFam"
          status="Running"
          arn="arn:aws:elasticbeanstalk:us-east-1:123456789012:environment:123456789012/My_App/My_Environment"
        />
      )}
      active
    />
    <Card
      title="Input"
      render={() => (
        <textarea className="step-textarea" readOnly>
          placeholder
        </textarea>
      )}
    />
    <Card
      title="Output"
      render={() => (
        <textarea className="step-textarea" readOnly>
          placeholder
        </textarea>
      )}
    />
  </div>
);

export default SecondaryDisplay;
