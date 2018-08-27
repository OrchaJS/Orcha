import React from 'react';

import { MyContext } from '../../../../provider/MyProvider';

const InputContainer = () => (
  <div className="input-container">
    <MyContext.Consumer>
      {({ state: { inputText }, handleOnChangeInput }) => (
        <textarea
          className="input-container__textarea"
          onChange={(e) => {
            handleOnChangeInput(e.target.value);
          }}
          value={inputText}
        />
      )}
    </MyContext.Consumer>
  </div>
);

export default InputContainer;
