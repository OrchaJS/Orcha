import React from 'react';

import PrimaryDisplay from './PrimaryDisplay';

const Body = ({ svgCode }) => (
  <div className="body">
    <PrimaryDisplay svgCode={svgCode} />
  </div>
);

export default Body;
