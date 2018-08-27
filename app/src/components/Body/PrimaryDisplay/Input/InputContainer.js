import React from 'react';

import { MyContext } from '../../../../provider/MyProvider';

const InputContainer = () => (
  <div className="input-container">
    <MyContext.Consumer>
      {({ state: { inputText }, handleOnChangeInput }) => (
        <form>
          <input
            type="text"
            className="input-container__textarea"
            onChange={(e) => {
              console.log('hello');
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
