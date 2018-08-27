import React from 'react';

const CardBody = ({ text, active, Component }) => (
  <div className="card">
    <CardHeader title={title} />
    <div className={`${active ? 'card__body--active' : 'card__body'}`}>
      {<Component text={text} />}
    </div>
  </div>
);

export default CardBody;
