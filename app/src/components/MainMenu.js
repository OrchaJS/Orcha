import React from 'react';
import FlowName from './FlowName';
import Status from './Status';
import Actions from './Actions';

const MainMenu = () => (
  <div className="top-menu">
    <FlowName flowname="MyWorkFlowNameHere" />
    <Status status="CurrentStatus" />
    <Actions action="Run" />
  </div>
);

export default MainMenu;
