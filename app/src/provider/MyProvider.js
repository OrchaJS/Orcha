import React, { Component } from 'react';

const MyContext = React.createContext();

class MyProvider extends Component {
  state = {
    flowname: 'Open file',
    primaryActiveTab: 'Diagram',
    secondaryActiveTab: 'Details',
    svgCode: null,
    lambdaDetails: null,
    lambdaInput: null,
    lambdaOutput: null,
    executionHistory: [],
    executionStatus: 'Not Started',
    selectedLambda: null,
    inputText: '{"array":[1,2,3]}',
    outputText: '',
  };

  componentWillReceiveProps(props) {
    console.log(props);
    this.setState({ ...props });
  }

  updateSelectedLambda = (selectedLambda) => {
    this.setState({ selectedLambda });
  };

  handleClickPrimaryTab = (primaryActiveTab) => {
    this.setState({ primaryActiveTab });
  };

  handleClickSecondaryTab = (secondaryActiveTab) => {
    this.setState({ secondaryActiveTab });
  };

  handleOnChangeInput = (inputText) => {
    this.setState({ inputText });
  };

  render() {
    const {
      handleClickPrimaryTab,
      handleClickSecondaryTab,
      handleOnChangeInput,
      updateSelectedLambda,
      state,
    } = this;

    const { children } = this.props;

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
        {children}
      </MyContext.Provider>
    );
  }
}

export { MyProvider, MyContext };
