import React from 'react';

import TopMenu from './TopMenu/TopMenu';
import MainMenu from './MainMenu/MainMenu';
import Body from './Body/Body';
import { MyProvider } from '../provider/MyProvider';

const App = ({ svgCode }) => (
  <MyProvider>
    <TopMenu />
    <MainMenu />
    <Body svgCode={svgCode} />
  </MyProvider>
);

export default App;
