import React from 'react';

import PrimaryDisplay from './PrimaryDisplay/PrimaryDisplay';
import SecondaryDisplay from './SecondaryDisplay/SecondaryDisplay';
import Log from './Log/Log';

const Body = ({ svgCode }) => (
  <div className="body">
    <PrimaryDisplay svgCode={svgCode} />
    <SecondaryDisplay />
    <Log />
  </div>
);

export default Body;
