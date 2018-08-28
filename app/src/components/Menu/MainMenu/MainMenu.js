import React from 'react';
import FlowName from './FlowName';
import Status from './Status';
import Actions from './Actions';

const MainMenu = () => (
  <div className="main-menu">
    <FlowName flowname="FlowName" />
    <Status />
    <Actions action="Run" />
  </div>
);

export default MainMenu;
