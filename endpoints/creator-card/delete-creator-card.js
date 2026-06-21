const { createHandler } = require('@app-core/server');
const deleteCreatorCardService = require('@app/services/creator-card/delete-creator-card');

module.exports = createHandler({
  path: '/creator-cards/:slug',
  method: 'delete',
  middlewares: [],
  async handler(rc, helpers) {
    const responseData = await deleteCreatorCardService({
      slug: rc.params.slug,
      creator_reference: rc.body?.creator_reference,
    });

    return {
      status: helpers.http_statuses.HTTP_200_OK,
      message: 'Creator Card Deleted Successfully.',
      data: responseData,
    };
  },
});
