/**
 * Shared parameter parsing utilities for route handlers.
 */

/**
 * Parse a route parameter that may be a string or string array.
 * Express-validator can return arrays for certain param configurations.
 *
 * @param param - The parameter value from req.params
 * @returns The parsed integer value
 *
 * @example
 * const id = parseParam(req.params.id);
 * const postId = parseParam(req.params.postId);
 */
export function parseParam(param: string | string[]): number {
  return parseInt(Array.isArray(param) ? param[0] : param);
}

/**
 * Parse a route parameter with NaN check.
 * Returns null if the parameter is not a valid number.
 *
 * @param param - The parameter value from req.params
 * @returns The parsed integer value or null if invalid
 */
export function parseParamSafe(param: string | string[] | undefined): number | null {
  if (!param) return null;
  const value = parseInt(Array.isArray(param) ? param[0] : param);
  return isNaN(value) ? null : value;
}
