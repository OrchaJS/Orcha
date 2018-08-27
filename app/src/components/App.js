import React from 'react';

import Menu from './Menu/Menu';
import Body from './Body/Body';
import { MyProvider } from '../provider/MyProvider';

const App = ({ svgCode }) => (
  <MyProvider>
    <Menu />
    <Body svgCode={svgCode} />
  </MyProvider>
);

export default App;
