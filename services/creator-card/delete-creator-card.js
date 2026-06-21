const validator = require('@app-core/validator');
const { throwAppError, ERROR_CODE } = require('@app-core/errors');
const { appLogger } = require('@app-core/logger');
const { CreatorCardMessages } = require('@app/messages');
const CreatorCard = require('@app/repository/creator-card');
const serializeCreatorCard = require('./serialize-creator-card');

// Mirrors specs/creator-card/data/delete-creator-card.go
const spec = `root {
  slug string<trim|minLength:1>
  creator_reference string<length:20>
}`;
const parsedSpec = validator.parse(spec);

/**
 * Soft-deletes the card tied to the given slug and returns it in the creation
 * response format with `deleted` set. Missing (or already-deleted) cards yield
 * NF01. The paranoid repository stamps `deleted` and frees the unique slug, so
 * the card is no longer publicly retrievable afterwards.
 */
async function deleteCreatorCard(serviceData) {
  const data = validator.validate(serviceData, parsedSpec);
  let result;

  try {
    const card = await CreatorCard.findOne({ query: { slug: data.slug } });

    if (!card) {
      throwAppError(CreatorCardMessages.CARD_NOT_FOUND, ERROR_CODE.NF01);
    }

    await CreatorCard.deleteOne({ query: { _id: card._id } });
    card.deleted = Date.now();

    result = serializeCreatorCard(card, { includeAccessCode: true });
  } catch (error) {
    appLogger.error(error, 'delete-creator-card-error');
    throw error;
  }

  return result;
}

module.exports = deleteCreatorCard;
