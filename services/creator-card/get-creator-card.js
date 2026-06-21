const validator = require('@app-core/validator');
const { throwAppError, ERROR_CODE } = require('@app-core/errors');
const { appLogger } = require('@app-core/logger');
const { CreatorCardMessages } = require('@app/messages');
const CreatorCard = require('@app/repository/creator-card');
const serializeCreatorCard = require('./serialize-creator-card');

// Mirrors specs/creator-card/data/get-creator-card.go
const spec = `root {
  slug string<trim|minLength:1>
  access_code? string
}`;
const parsedSpec = validator.parse(spec);

/**
 * Public retrieval of a creator card by slug. Access rules are applied strictly
 * in order: NF01 (missing) -> NF02 (draft) -> AC03 (private, no code) ->
 * AC04 (private, wrong code) -> success. Soft-deleted cards are excluded by the
 * paranoid repository, so they surface as NF01.
 */
async function getCreatorCard(serviceData) {
  const data = validator.validate(serviceData, parsedSpec);
  let result;

  try {
    const card = await CreatorCard.findOne({ query: { slug: data.slug } });

    if (!card) {
      throwAppError(CreatorCardMessages.CARD_NOT_FOUND, ERROR_CODE.NF01);
    }

    if (card.status === 'draft') {
      throwAppError(CreatorCardMessages.CARD_NOT_FOUND, ERROR_CODE.NF02);
    }

    if (card.access_type === 'private') {
      if (!data.access_code) {
        throwAppError(CreatorCardMessages.PRIVATE_CARD_CODE_REQUIRED, ERROR_CODE.AC03);
      }
      if (data.access_code !== card.access_code) {
        throwAppError(CreatorCardMessages.INVALID_ACCESS_CODE, ERROR_CODE.AC04);
      }
    }

    result = serializeCreatorCard(card, { includeAccessCode: false });
  } catch (error) {
    appLogger.error(error, 'get-creator-card-error');
    throw error;
  }

  return result;
}

module.exports = getCreatorCard;
