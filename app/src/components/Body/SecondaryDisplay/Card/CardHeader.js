import React from 'react';

import { MyContext } from '../../../../provider/MyProvider';

const CardHeader = ({ title }) => (
  <MyContext.Consumer>
    {({ handleClickSecondaryTab }) => (
      <div
        className="card__header heading-secondary"
        onClick={() => handleClickSecondaryTab(title)}
      >
        <span className="card__title">{title}</span>
      </div>
    )}
  </MyContext.Consumer>
);

export default CardHeader;
