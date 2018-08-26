import React from 'react';

import PrimaryDisplay from './PrimaryDisplay/PrimaryDisplay';
import SecondaryDisplay from './SecondaryDisplay/SecondaryDisplay';
import LogTable from './LogTable/LogTable';

const Body = ({ svgCode }) => (
  <div className="body">
    <PrimaryDisplay svgCode={svgCode} />
    <SecondaryDisplay />
    <LogTable />
  </div>
);

export default Body;
