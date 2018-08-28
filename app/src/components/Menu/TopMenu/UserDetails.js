import React from 'react';

const input = '{"array":[1,2,3]}';

const UserDetails = () => (
  <div className="user-details">
    <span className="user-details__text">{input}</span>
  </div>
);

export default UserDetails;
