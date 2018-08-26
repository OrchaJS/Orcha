import React from 'react';

const Card = ({ title, text }) => (
  <div className="card">
    <div className="card__header">
      <span className="card__title">{title}</span>
    </div>
    <div className="card__body">
      <span className="card__text">{text}</span>
    </div>
  </div>
);

export default Card;
