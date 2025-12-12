/**
 * @fileOverview calculate tick values of scale
 * @author xile611, arcthur
 * @date 2015-09-17
 */
import { range } from './util/utils';
import { getDigitCount, rangeStep } from './util/arithmetic';
import { NumberDomain } from '../types';

/**
 * Calculate a interval of a minimum value and a maximum value
 *
 * @param  {Number} min       The minimum value
 * @param  {Number} max       The maximum value
 * @return {Array} An interval
 */
export const getValidInterval = ([min, max]: [number, number]): [number, number] => {
  let [validMin, validMax] = [min, max];

  // exchange
  if (min > max) {
    [validMin, validMax] = [max, min];
  }

  return [validMin, validMax];
};

/**
 * Calculate the step which is easy to understand between ticks, like 10, 20, 25
 *
 * @param  roughStep        The rough step calculated by dividing the difference by the tickCount
 * @param  allowDecimals    Allow the ticks to be decimals or not
 * @param  correctionFactor A correction factor
 * @return The step which is easy to understand between two ticks
 */
export const getFormatStep = (roughStep: number, allowDecimals: boolean, correctionFactor: number): number => {
  if (roughStep <= 0 || !Number.isFinite(roughStep)) {
    return 0;
  }

  // Find order of magnitude for roughStep
  const digitCount = getDigitCount(roughStep);
  const pow10 = 10 ** (digitCount - 1);
  const stepRatio = roughStep / pow10;

  // Pick a nice step
  const stepRatioScale = digitCount !== 1 ? 0.05 : 0.1;
  const stepRatioAmend = Math.ceil(stepRatio / stepRatioScale) + correctionFactor;
  let niceStep = stepRatioAmend * stepRatioScale * pow10;

  if (!allowDecimals) {
    niceStep = Math.ceil(niceStep);
  }

  return niceStep;
};

/**
 * calculate the ticks when the minimum value equals to the maximum value
 *
 * @param  value         The minimum value which is also the maximum value
 * @param  tickCount     The count of ticks
 * @param  allowDecimals Allow the ticks to be decimals or not
 * @return array of ticks
 */
export const getTickOfSingleValue = (value: number, tickCount: number, allowDecimals: boolean): Array<number> => {
  // If only one tick, just return value
  if (tickCount <= 1) {
    return [value];
  }

  let step = 1;
  let middle = value;

  if (allowDecimals && Math.abs(value) < 1 && value !== 0) {
    step = 10 ** (getDigitCount(value) - 1);
    middle = Math.floor(value / step) * step;
  } else if (!allowDecimals || Number.isInteger(value)) {
    middle = Math.floor(value);
  } else if (value === 0) {
    middle = Math.floor((tickCount - 1) / 2);
  }

  const middleIndex = Math.floor((tickCount - 1) / 2);

  const ticks = range(0, tickCount).map((n: number) => middle + (n - middleIndex) * step);
  return ticks;
};

/**
 * Calculate the step
 *
 * @param  min              The minimum value of an interval
 * @param  max              The maximum value of an interval
 * @param  tickCount        The count of ticks
 * @param  allowDecimals    Allow the ticks to be decimals or not
 * @param  correctionFactor A correction factor
 * @return The step, minimum value of ticks, maximum value of ticks
 */
export const calculateStep = (
  min: number,
  max: number,
  tickCount: number,
  allowDecimals: boolean,
  correctionFactor: number = 0,
): {
  step: number;
  tickMin: number;
  tickMax: number;
} => {
  // dirty hack (for recharts' test)
  if (!Number.isFinite((max - min) / (tickCount - 1))) {
    return {
      step: 0,
      tickMin: 0,
      tickMax: 0,
    };
  }

  // The step which is easy to understand between two ticks
  const step = getFormatStep((max - min) / (tickCount - 1), allowDecimals, correctionFactor);

  // A medial value of ticks
  let middle: number;

  // When 0 is inside the interval, 0 should be a tick
  if (min <= 0 && max >= 0) {
    middle = 0;
  } else {
    // calculate the middle value
    middle = (min + max) / 2;
    // minus modulo value
    middle -= ((middle % step) + step) % step;
  }

  let belowCount = Math.ceil((middle - min) / step);
  let upCount = Math.ceil((max - middle) / step);
  const scaleCount = belowCount + upCount + 1;

  if (scaleCount > tickCount) {
    // When more ticks need to cover the interval, step should be bigger.
    return calculateStep(min, max, tickCount, allowDecimals, correctionFactor + 1);
  }
  if (scaleCount < tickCount) {
    // When less ticks can cover the interval, we should add some additional ticks
    if (max > 0) {
      upCount += tickCount - scaleCount;
    } else {
      belowCount += tickCount - scaleCount;
    }
  }

  return {
    step,
    tickMin: middle - belowCount * step,
    tickMax: middle + upCount * step,
  };
};

/**
 * Calculate the ticks of an interval. Ticks can appear outside the interval
 * if it makes them more rounded and nice.
 *
 * @param tuple of [min,max] min: The minimum value, max: The maximum value
 * @param tickCount     The count of ticks
 * @param allowDecimals Allow the ticks to be decimals or not
 * @return array of ticks
 */
export const getNiceTickValues = ([min, max]: NumberDomain, tickCount = 6, allowDecimals = true): number[] => {
  // More than two ticks should be return
  const count = Math.max(tickCount, 2);
  const [cormin, cormax] = getValidInterval([min, max]);

  if (cormin === -Infinity || cormax === Infinity) {
    const values =
      cormax === Infinity
        ? [cormin, ...range(0, tickCount - 1).map(() => Infinity)]
        : [...range(0, tickCount - 1).map(() => -Infinity), cormax];

    return min > max ? values.reverse() : values;
  }

  if (cormin === cormax) {
    return getTickOfSingleValue(cormin, tickCount, allowDecimals);
  }

  // Get the step between two ticks
  const { step, tickMin, tickMax } = calculateStep(cormin, cormax, count, allowDecimals, 0);

  // To address floating-point issues, add a small epsilon to the range's upper value
  const epsilon = 0.1 * step;
  const values = rangeStep(tickMin, tickMax + epsilon, step);

  return min > max ? values.reverse() : values;
};

/**
 * Calculate the ticks of an interval.
 * Ticks will be constrained to the interval [min, max] even if it makes them less rounded and nice.
 *
 * @param tuple of [min,max] min: The minimum value, max: The maximum value
 * @param tickCount     The count of ticks. This function may return less than tickCount ticks if the interval is too small.
 * @param allowDecimals Allow the ticks to be decimals or not
 * @return array of ticks
 */
export const getTickValuesFixedDomain = ([min, max]: NumberDomain, tickCount: number, allowDecimals = true) => {
  // More than two ticks should be return
  const [cormin, cormax] = getValidInterval([min, max]);

  if (cormin === -Infinity || cormax === Infinity) {
    return [min, max];
  }

  if (cormin === cormax) {
    return [cormin];
  }

  const count = Math.max(tickCount, 2);
  const step = getFormatStep((cormax - cormin) / (count - 1), allowDecimals, 0);
  let values = [...rangeStep(cormin, cormax, step), cormax];

  if (allowDecimals === false) {
    /*
     * allowDecimals is false means that we want to have integer ticks.
     * The step is guaranteed to be an integer in the code above which is great start
     * but when the first step is not an integer, it will start stepping from a decimal value anyway.
     * So we need to round all the values to integers after the fact.
     */
    values = values.map(value => Math.round(value));
  }

  return min > max ? values.reverse() : values;
};
