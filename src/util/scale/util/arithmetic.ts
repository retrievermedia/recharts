/**
 * @fileOverview Some common arithmetic methods
 * @author xile611
 * @date 2015-09-17
 */

/**
 * Get the digit count of a number.
 * If the absolute value is in the interval [0.1, 1), the result is 0.
 * If the absolute value is in the interval [0.01, 0.1), the digit count is -1.
 * If the absolute value is in the interval [0.001, 0.01), the digit count is -2.
 *
 * @param  {Number} value The number
 * @return {Integer}      Digit count
 */
function getDigitCount(value: number) {
  let result;

  if (value === 0) {
    result = 1;
  } else {
    result = Math.floor(Math.log10(Math.abs(value))) + 1;
  }

  return result;
}

/**
 * Get the data in the interval [start, end) with a fixed step.
 * Also handles JS calculation precision issues.
 *
 * @param  {Decimal} start Start point
 * @param  {Decimal} end   End point, not included
 * @param  {Decimal} step  Step size
 * @return {Array}         Array of numbers
 */
function rangeStep(start: number, end: number, step: number): Array<number> {
  let num = start;
  let i = 0;
  const result: Array<number> = [];

  // magic number to prevent infinite loop
  while (num < end && i < 100000) {
    result.push(num);

    num += step;
    i++;
  }

  return result;
}

export { rangeStep, getDigitCount };
