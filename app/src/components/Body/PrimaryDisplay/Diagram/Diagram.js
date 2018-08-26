import React from 'react';

const Diagram = ({ svgCode }) => (
  <div className="mermaid" dangerouslySetInnerHTML={{ __html: svgCode }} />
);

export default Diagram;

