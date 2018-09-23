import React from 'react';

import Menu from './Menu/Menu';
import Body from './Body/Body';
import { MyProvider } from '../provider/MyProvider';

const App = props => (
  <MyProvider {...props}>
    <Menu />
    <Body />
  </MyProvider>
);

export default App;
