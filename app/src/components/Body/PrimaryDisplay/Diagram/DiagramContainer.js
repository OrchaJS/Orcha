import React from 'react';

import Legend from './Legend';
import Diagram from './Diagram';

const DiagramContainer = ({ svgCode }) => (
  <div className="diagram-container">
    <Legend />
    <Diagram svgCode={svgCode} />
  </div>
);

export default DiagramContainer;
