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
    inputText: '',
  };

  updateSelectedLambda = (lambda) => {
    this.setState({ selectedLambda: lambda });
  };

  handleClickPrimaryTab = (tab) => {
    this.setState({ primaryActiveTab: tab });
  };

  handleOnChangeInput = (text) => {
    this.setState({ inputText: text });
  };

  render() {
    const {
      updateSelectedLambda, handleClickPrimaryTab, handleOnChangeInput, state,
    } = this;

    return (
      <MyContext.Provider
        value={{
          state,
          updateSelectedLambda,
          handleClickPrimaryTab,
          handleOnChangeInput,
        }}
      >
        {this.props.children}
      </MyContext.Provider>
    );
  }
}

export { MyProvider, MyContext };
