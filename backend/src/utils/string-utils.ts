import _ from 'lodash';

/** True when query/param is missing or the literal string `"undefined"`. */
export const isUndefinedOrUndefinedString = (value: unknown): boolean => {
  return _.isUndefined(value) || value === 'undefined' || value === '';
};
