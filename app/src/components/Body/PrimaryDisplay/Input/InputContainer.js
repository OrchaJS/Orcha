import React from 'react';

import { MyContext } from '../../../../provider/MyProvider';

const InputContainer = () => (
  <div className="input-container">
    <MyContext.Consumer>
      {({ state: { inputText }, handleOnChangeInput }) => (
        <form className="input-container__form">
          <textarea
            type="text"
            className="input-container__textarea"
            onChange={(e) => {
              handleOnChangeInput(e.target.value);
            }}
            value={inputText}
          />
        </form>
      )}
    </MyContext.Consumer>
  </div>
);

export default InputContainer;
