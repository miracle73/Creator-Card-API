/**
 * Builds a base slug from a card title:
 *   1. lowercase the title
 *   2. replace whitespace runs with hyphens
 *   3. drop any character that is not a letter, number, hyphen or underscore
 * Collapses repeated/edge hyphens for a cleaner identifier. Uniqueness and the
 * minimum-length fallback (random suffix) are handled by the create service.
 *
 * @param {String} title
 * @returns {String}
 */
function generateSlug(title) {
  const slug = String(title)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9_-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

  return slug;
}

module.exports = generateSlug;
