import React from 'react';

import { MyContext } from '../../../../provider/MyProvider';

const CardHeader = ({ title, handleClickSecondaryTab, secondaryActiveTab }) => {
  let className = 'card__header heading-secondary';

  if (title === secondaryActiveTab) {
    className += ' heading-secondary--active';
  }

  return (
    <div className={className} onClick={() => handleClickSecondaryTab(title)}>
      <span className="card__title">{title}</span>
    </div>
  );
};

export default CardHeader;
