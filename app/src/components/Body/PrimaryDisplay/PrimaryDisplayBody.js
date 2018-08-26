import React from 'react';

import DiagramContainer from './Diagram/DiagramContainer';
import InputContainer from './Input/InputContainer';
import OutputContainer from './Output/OutputContainer';

const PrimaryDisplayBody = ({ svgCode, tab }) => {
  let view;

  switch (tab) {
    case '1':
      view = <DiagramContainer svgCode={svgCode} />;
      break;
    case '2':
      view = <InputContainer svgCode={svgCode} />;
      break;
    case '3':
      view = <OutputContainer svgCode={svgCode} />;
      break;
    default:
      throw new Error(('tab wtf', tab));
  }

  return <div className="primary-display__body">{view}</div>;
};

export default PrimaryDisplayBody;
