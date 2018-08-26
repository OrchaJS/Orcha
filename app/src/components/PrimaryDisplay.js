import React, { Component } from 'react';

import PrimaryDisplayHeader from './PrimaryDisplayHeader';
import PrimaryDisplayBody from './PrimaryDisplayBody';

class PrimaryDisplay extends Component {
  state = {
    tab: 1,
  };

  render() {
    const { svgCode } = this.props;
    const { tab } = this.state;

    return (
      <div className="primary-display">
        <PrimaryDisplayHeader />
        <PrimaryDisplayBody svgCode={svgCode} tab={tab} />
      </div>
    );
  }
}

export default PrimaryDisplay;
