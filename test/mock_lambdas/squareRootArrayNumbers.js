// takes the square root of each number, rounded to three decimal places
function squareRootArrayNumbers(lambdaInputObject) {
  const returnObject = { array: [] };
  lambdaInputObject.array.forEach((num, index) => {
    if (num < 0) {
      const negativeNumberError = new Error(`Cannot take the square root of number ${num} at array position ${index}`);
      negativeNumberError.name = 'SquareRootOfNegativeNumberError';
      return negativeNumberError;
    }
    returnObject.array.push(Number(Math.sqrt(num).toFixed(3)));
  });
  return returnObject;
}

module.exports = squareRootArrayNumbers;