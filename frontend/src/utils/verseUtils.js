/**
 * verseUtils — utility functions for verse data manipulation.
 */

/**
 * filterVerses — filter a verse list.
 * Currently a pass-through; can be extended for tag/chapter filtering.
 *
 * @param {Array} verses - Array of verse objects
 * @param {Object} [filters] - Optional filter criteria
 * @returns {Array} Filtered verses
 */
export function filterVerses(verses, filters = {}) {
  if (!verses || !Array.isArray(verses)) return [];
  return verses;
}
