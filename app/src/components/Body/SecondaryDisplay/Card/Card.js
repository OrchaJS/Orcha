import React from 'react';

import CardHeader from './CardHeader';

const Card = ({ title, text, active }) => (
  <div className="card">
    <CardHeader title={title} />
    <div className={`${active ? 'card__body--active' : 'card__body'}`}>
      <span className="card__text">{text}</span>
    </div>
  </div>
);

export default Card;
