import React, { Component } from 'react';

const MyContext = React.createContext();

class MyProvider extends Component {
  state = {
    primaryActiveTab: 'Diagram',
    secondaryActiveTab: 'Details',
    svgCode: null,
    lambdaDetails: null,
    lambdaInput: null,
    lambdaOutput: null,
    executionHistory: [],
    executionStatus: 'Not Started',
    selectedLambda: null,
  };

  updateSelectedLambda = (lambda) => {
    this.setState({ selectedLambda: lambda });
  };

  render() {
    return (
      <MyContext.Provider
        value={{ state: this.state, updateSelectedLambda: this.updateSelectedLambda }}
      >
        {this.props.children}
      </MyContext.Provider>
    );
  }
}

export { MyProvider, MyContext };
