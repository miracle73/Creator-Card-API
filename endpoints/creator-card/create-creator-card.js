const { createHandler } = require('@app-core/server');
const createCreatorCardService = require('@app/services/creator-card/create-creator-card');

module.exports = createHandler({
  path: '/creator-cards',
  method: 'post',
  middlewares: [],
  async handler(rc, helpers) {
    const responseData = await createCreatorCardService(rc.body);

    return {
      status: helpers.http_statuses.HTTP_200_OK,
      message: 'Creator Card Created Successfully.',
      data: responseData,
    };
  },
});
