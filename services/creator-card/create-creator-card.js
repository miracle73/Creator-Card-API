const validator = require('@app-core/validator');
const { throwAppError, ERROR_CODE } = require('@app-core/errors');
const { randomBytes } = require('@app-core/randomness');
const { appLogger } = require('@app-core/logger');
const { CreatorCardMessages } = require('@app/messages');
const CreatorCard = require('@app/repository/creator-card');
const serializeCreatorCard = require('./serialize-creator-card');
const generateSlug = require('./generate-slug');

// Mirrors specs/creator-card/data/create-creator-card.go
const spec = `root {
  title string<trim|lengthBetween:3,100>
  description? string<trim|maxLength:500>
  slug? string<trim|lengthBetween:5,50>
  creator_reference string<length:20>
  links[]? {
    title string<trim|lengthBetween:1,100>
    url string<trim|maxLength:200>
  }
  service_rates? {
    currency string(NGN|USD|GBP|GHS)
    rates[] {
      name string<trim|lengthBetween:3,100>
      description? string<trim|maxLength:250>
      amount number<min:1>
    }
  }
  status string(draft|published)
  access_type? string(public|private)
  access_code? string<length:6>
}`;
const parsedSpec = validator.parse(spec);

const SLUG_PATTERN = /^[A-Za-z0-9_-]+$/;
const ACCESS_CODE_PATTERN = /^[A-Za-z0-9]{6}$/;
const URL_PATTERN = /^https?:\/\//;

async function isSlugTaken(slug) {
  const existing = await CreatorCard.findOne({ query: { slug } });
  return !!existing;
}

/**
 * Validates supplementary field rules that the VSL validator cannot express.
 * All failures are validation errors and resolve to HTTP 400.
 */
function assertFieldRules(data) {
  if (data.slug && !SLUG_PATTERN.test(data.slug)) {
    throwAppError(CreatorCardMessages.INVALID_SLUG_FORMAT, ERROR_CODE.VALIDATIONERR);
  }

  if (data.access_code && !ACCESS_CODE_PATTERN.test(data.access_code)) {
    throwAppError(CreatorCardMessages.INVALID_ACCESS_CODE_FORMAT, ERROR_CODE.VALIDATIONERR);
  }

  (data.links || []).forEach((link) => {
    if (!URL_PATTERN.test(link.url)) {
      throwAppError(CreatorCardMessages.INVALID_LINK_URL, ERROR_CODE.VALIDATIONERR);
    }
  });

  if (data.service_rates) {
    const { rates } = data.service_rates;
    if (!Array.isArray(rates) || rates.length === 0) {
      throwAppError(CreatorCardMessages.EMPTY_SERVICE_RATES, ERROR_CODE.VALIDATIONERR);
    }
    rates.forEach((rate) => {
      if (!Number.isInteger(rate.amount) || rate.amount < 1) {
        throwAppError(CreatorCardMessages.INVALID_RATE_AMOUNT, ERROR_CODE.VALIDATIONERR);
      }
    });
  }
}

/**
 * Enforces the conditional access_code business rules (AC01 / AC05).
 */
function assertAccessRules(accessType, accessCode) {
  if (accessType === 'private' && !accessCode) {
    throwAppError(CreatorCardMessages.ACCESS_CODE_REQUIRED_PRIVATE, ERROR_CODE.AC01);
  }
  if (accessType !== 'private' && accessCode) {
    throwAppError(CreatorCardMessages.ACCESS_CODE_ONLY_PRIVATE, ERROR_CODE.AC05);
  }
}

/**
 * Resolves the final slug: validates a client-provided slug for uniqueness
 * (SL02 on collision) or auto-generates one from the title.
 */
async function resolveSlug(data) {
  let slug;

  if (data.slug) {
    if (await isSlugTaken(data.slug)) {
      throwAppError(CreatorCardMessages.SLUG_TAKEN, ERROR_CODE.SL02);
    }
    slug = data.slug;
  } else {
    const base = generateSlug(data.title).slice(0, 50);
    slug = base;

    if (base.length < 5 || (await isSlugTaken(base))) {
      do {
        slug = `${base.slice(0, 43)}-${randomBytes(3)}`;
        // eslint-disable-next-line no-await-in-loop
      } while (await isSlugTaken(slug));
    }
  }

  return slug;
}

async function createCreatorCard(serviceData) {
  const data = validator.validate(serviceData, parsedSpec);
  let result;

  try {
    assertFieldRules(data);

    const accessType = data.access_type || 'public';
    assertAccessRules(accessType, data.access_code);

    const slug = await resolveSlug(data);

    const card = await CreatorCard.create({
      ...data,
      slug,
      access_type: accessType,
      access_code: accessType === 'private' ? data.access_code : null,
    });

    result = serializeCreatorCard(card, { includeAccessCode: true });
  } catch (error) {
    appLogger.error(error, 'create-creator-card-error');
    throw error;
  }

  return result;
}

module.exports = createCreatorCard;
