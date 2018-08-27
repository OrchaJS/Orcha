import React from 'react';

import DiagramContainer from './Diagram/DiagramContainer';
import InputContainer from './Input/InputContainer';
import OutputContainer from './Output/OutputContainer';

const PrimaryDisplayBody = ({ svgCode, tab }) => {
  let view;

  switch (tab) {
    case 'Diagram':
      view = <DiagramContainer svgCode={svgCode} />;
      break;
    case 'Input':
      view = <InputContainer text="poop" />;
      break;
    case 'Output':
      view = <OutputContainer />;
      break;
    default:
      throw new Error(('tab wtf', tab));
  }

  return <div className="primary-display__body">{view}</div>;
};

export default PrimaryDisplayBody;
