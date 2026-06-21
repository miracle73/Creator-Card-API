/**
 * Maps a stored Creator Card document to the public API response shape.
 * - Exposes the MongoDB `_id` as `id` (an `_id` in the response is incorrect).
 * - Normalizes the internal `deleted` flag (0 for live records) to `null`.
 * - Only includes `access_code` when explicitly requested (creation/deletion
 *   responses) — it is never exposed by the public retrieval endpoint.
 *
 * @param {Object} card - Stored creator card document.
 * @param {{ includeAccessCode?: boolean }} [options]
 * @returns {Object}
 */
function serializeCreatorCard(card, options = {}) {
  const response = {
    id: card._id,
    title: card.title,
    description: card.description ?? null,
    slug: card.slug,
    creator_reference: card.creator_reference,
    links: card.links ?? [],
    service_rates: card.service_rates ?? null,
    status: card.status,
    access_type: card.access_type,
  };

  if (options.includeAccessCode) {
    response.access_code = card.access_code ?? null;
  }

  response.created = card.created;
  response.updated = card.updated;
  response.deleted = card.deleted ? card.deleted : null;

  return response;
}

module.exports = serializeCreatorCard;
