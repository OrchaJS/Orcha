import React from 'react';

const LogTableBodyRow = ({
  id, type, step, resource, status, elapsedTime, timestamp,
}) => (
  <tr className="log-table__body-row">
    <td className="log-table__body-row-id">{id}</td>
    <td className="log-table__body-row-type">{type}</td>
    <td className="log-table__body-row-step">{step}</td>
    <td className="log-table__body-row-resource">{resource}</td>
    <td className="log-table__body-row-status">
      <span className={`badge--${status}`}>{status}</span>
    </td>
    <td className="log-table__body-row-elapsed-time">{elapsedTime}</td>
    <td className="log-table__body-row-timestamp">{timestamp}</td>
  </tr>
);

export default LogTableBodyRow;
