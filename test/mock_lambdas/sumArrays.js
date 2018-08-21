function sumArrays(lambdaInputObject) {
  const resultArray = [];
  let sumTotal = 0;
  for (let i = 0; i < lambdaInputObject.length; i++) {
    for (let j = 0; j < lambdaInputObject[i].array.length; j++) {
      sumTotal += lambdaInputObject[i].array[j];
      if (resultArray[j] === undefined) {
        resultArray[j] = lambdaInputObject[i].array[j];
      }
      else {
        resultArray[j] += lambdaInputObject[i].array[j];
      }
    }
  }
  return { array: resultArray, sum: sumTotal };
};

module.exports = sumArrays;
