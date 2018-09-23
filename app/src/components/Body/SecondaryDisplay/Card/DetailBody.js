import React from 'react';

const DetailBody = ({ name, status, arn }) => {
  let statusClassName = 'detail-body__status';

  switch (status) {
    case 'Succeeded':
      statusClassName += ' color-green';
      break;
    case 'Running':
      statusClassName += ' color-blue';
      break;
    case 'Failed':
      statusClassName += ' color-red';
      break;
    case 'Cancelled':
      statusClassName += ' color-grey';
      break;
    default:
      throw new Error(('detail body wtf', status));
  }

  return (
    <div className="detail-body">
      <span className="detail-body__title">Name:</span>
      <span className="detail-body__name">{name}</span>
      <span className="detail-body__title">Status:</span>
      <span className={statusClassName}>{status}</span>
      <span className="detail-body__title">Resource:</span>
      <span className="detail-body__resource">{arn}</span>
    </div>
  );
};

export default DetailBody;
