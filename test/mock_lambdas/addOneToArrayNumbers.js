function addOneToArrayNumbers(lambdaInputObject) {
  const returnObject = { array: [] };
  lambdaInputObject.array.forEach(num => {
    returnObject.array.push(num + 1);
  });
  return returnObject;
}

module.exports = addOneToArrayNumbers;