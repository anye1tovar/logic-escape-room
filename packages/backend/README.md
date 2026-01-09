# Backend (local dev)

This backend is a minimal Express + Postgres app built to act as a local monolith during development. It uses a consumer/service/controller pattern so the data access (`consumer`) can later be swapped for another implementation.

Quick start

```bash
cd packages/backend
npm install
cp .env.example .env
# edit .env if needed
npm run dev
```

Endpoints

- `GET /api/bookings` — list bookings
- `POST /api/bookings` — create a booking (JSON body: `name`, `date`, `roomId`, `time`)

Notes

- Database connection is configured via `DATABASE_URL` (see `.env.example`).
- To swap the consumer later, implement the same methods in a new consumer file (e.g. `bookingConsumerDynamo.js`) and inject it into the service.

Usuarios de prueba en local
gamemaster@logic.com
q2bpIdLPi8KqAnET

admin@logic.com
eVOgGvFxvytFXupu
