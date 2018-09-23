import React from 'react';

import PrimaryDisplay from './PrimaryDisplay/PrimaryDisplay';
import SecondaryDisplay from './SecondaryDisplay/SecondaryDisplay';
import Log from './Log/Log';

const Body = () => (
  <div className="body">
    <PrimaryDisplay />
    <SecondaryDisplay />
    <Log />
  </div>
);

export default Body;
