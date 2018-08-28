import React from 'react';

import { MyContext } from '../../../../provider/MyProvider';

const OutputContainer = () => (
  <MyContext.Consumer>
    {({ state }) => {
      const { outputText } = state;
      console.log(outputText);

      return (
        <div className="output-container">
          <textarea className="output-container__textarea" readOnly>
            {outputText}
          </textarea>
        </div>
      );
    }}
  </MyContext.Consumer>
);

export default OutputContainer;
