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

  handleClickSecondaryTab = (tab) => {
    this.setState({ secondaryActiveTab: tab });
  };

  handleOnChangeInput = (text) => {
    this.setState({ inputText: text });
  };

  render() {
    const {
      handleClickPrimaryTab,
      handleClickSecondaryTab,
      handleOnChangeInput,
      updateSelectedLambda,
      state,
    } = this;

    return (
      <MyContext.Provider
        value={{
          handleClickPrimaryTab,
          handleClickSecondaryTab,
          handleOnChangeInput,
          updateSelectedLambda,
          state,
        }}
      >
        {this.props.children}
      </MyContext.Provider>
    );
  }
}

export { MyProvider, MyContext };
