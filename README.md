# Creator Card Microservice API

**Live base URL:** https://creator-card-api-p2md.onrender.com

A REST microservice that lets creators publish a shareable profile card showcasing
their links and service rates ("link-in-bio" cards with rate cards attached).

> Hosted on Render's free tier, which sleeps after ~15 min idle — the first request
> after inactivity may take ~30–60s to wake.

Built on the provided R17 Node.js scaffold, following its conventions exactly:
`endpoints → services → repository → models`, VSL field validation, and the
template's error utilities. See [documentation.md](./documentation.md) for the
architecture guide.

## Endpoints

All endpoints live at the root of the base URL (no versioning, no auth).

| Method | Path                     | Description                                  |
| ------ | ------------------------ | -------------------------------------------- |
| POST   | `/creator-cards`         | Create a card (validation, slug auto-gen)    |
| GET    | `/creator-cards/:slug`   | Public retrieval (respects draft / private)  |
| DELETE | `/creator-cards/:slug`   | Soft-delete a card by slug                   |

### Responses

Success:

```json
{ "status": "success", "message": "Creator Card Created Successfully.", "data": { "id": "01J...", "...": "..." } }
```

Error (business rule):

```json
{ "status": "error", "message": "Slug is already taken", "code": "SL02" }
```

The MongoDB `_id` is always serialized as `id`. `access_code` is returned by the
create/delete responses but never by the public retrieval endpoint. The internal
soft-delete flag is normalized so `deleted` is `null` for live cards.

### Error codes

| Code   | HTTP | Meaning                                              |
| ------ | ---- | --------------------------------------------------- |
| SL02   | 400  | Slug already taken                                  |
| AC01   | 400  | `access_code` required when `access_type` is private |
| AC05   | 400  | `access_code` not allowed on public cards           |
| NF01   | 404  | Card not found (or deleted)                          |
| NF02   | 404  | Card exists but is a draft                           |
| AC03   | 403  | Private card; access code required                  |
| AC04   | 403  | Invalid access code                                 |

Field-level validation failures (types, lengths, enums, required) are handled by
the template's VSL validator and return HTTP 400.

## Project layout (added for this feature)

```
endpoints/creator-card/   create | get | delete handlers
services/creator-card/    business logic + slug generator + serializer
repository/creator-card/   repository-factory wrapper
models/creator-card.js     Mongoose model (paranoid soft-delete, ULID _id)
messages/creator-card.js   human-readable messages
specs/creator-card/data/   VSL specs (canonical reference)
```

> Two small, additive core changes were required so business-rule errors honor the
> mandated response contract: the custom codes + their HTTP-status mappings were
> registered in `core/errors/constants.js`, and the server's error handler in
> `core/express/server.js` now surfaces the thrown `errorCode` as the response
> `code` field. Both are backward-compatible.

## Running locally

```bash
npm install
cp .env.example .env   # set PORT and MONGODB_URI
node bootstrap.js      # or: node app.js
```

Required env vars: `PORT`, `MONGODB_URI` (MongoDB Atlas free tier works).

## Deployment

Deploy to Render/Heroku. Start command: `node bootstrap.js` (see `Procfile`).
Set `PORT` and `MONGODB_URI` in the platform's environment. The base URL is
submitted with no path or version suffix, e.g. `https://your-app.onrender.com`.
