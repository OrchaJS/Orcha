function squareArrayNumbers(lambdaInputObject) {
    const returnObject = {array:[]};
    lambdaInputObject.array.forEach(num => {
        returnObject.array.push(num*num);
    });
    return returnObject;
}

module.exports = squareArrayNumbers;