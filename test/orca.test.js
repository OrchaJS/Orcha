const orca = require('../src/orca');
const addOneToArrayNumbers = require('./mock_lambdas/addOneToArrayNumbers');
const squareArrayNumbers = require('./mock_lambdas/squareArrayNumbers.js');
const sumArrays = require('./mock_lambdas/sumArrays.js');

test('test ')

test('test mock lambda addOneToArrayNumbers', () => {
    const lambdaInput = {
        array: [5, 9, 2]
    };
    const expectedOutput = {
        array: [6, 10, 3]
    };
    expect(addOneToArrayNumbers(lambdaInput)).toEqual(expectedOutput);
})

test('test mock lambda squareArrayNumbers', () => {
    const lambdaInput = {
        array: [5, 2, 4]
    };
    const expectedOutput = {
        array: [25, 4, 16]
    };
    expect(squareArrayNumbers(lambdaInput)).toEqual(expectedOutput);
});

test('test mock lambda sumArrays', () => {
    const lambdaInput = [
        {
            array: [9, 2, -1]
        },
        {
            array: [3, -6, 11]
        },
        {
            array: [-10, 5, 8]
        }
    ];
    const expectedOutput = {
        array: [2, 1, 18],
        sum: 21
    };
    expect(sumArrays(lambdaInput)).toEqual(expectedOutput);
});