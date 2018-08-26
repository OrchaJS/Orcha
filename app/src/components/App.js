import React, { Component } from 'react';
import TopMenu from './TopMenu';
import MainMenu from './MainMenu';
import Body from './Body';

class App extends Component {
  state = {};

  render() {
    const { svgCode } = this.props;

    return (
      <div>
        <TopMenu />
        <MainMenu />
        <Body svgCode={svgCode} />
      </div>
    );
  }
}

export default App;
