import React from 'react';

import DiagramContainer from './DiagramContainer';
import InputContainer from './InputContainer';
import OutputContainer from './OutputContainer';

const PrimaryDisplayBody = ({ svgCode, tab }) => {
  let view;

  switch (tab) {
    case 1:
      view = <DiagramContainer svgCode={svgCode} />;
      break;
    case 2:
      view = <DiagramContainer svgCode={svgCode} />;
      break;
    case 3:
      view = <DiagramContainer svgCode={svgCode} />;
      break;
    default:
      throw new Error('tab wtf');
  }

  return <div className="primary-display__body">{view}</div>;
};

export default PrimaryDisplayBody;
