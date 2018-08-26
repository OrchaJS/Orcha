import React from 'react';

import LegendKey from './LegendKey';

const Legend = () => (
  <div className="legend">
    <LegendKey status="Completed" color="green" />
    <LegendKey status="Running" color="blue" />
    <LegendKey status="Failed" color="red" />
    <LegendKey status="Cancelled" color="grey" />
  </div>
);

export default Legend;
