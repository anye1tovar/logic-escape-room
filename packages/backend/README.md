# Backend (local dev)

This backend is a minimal Express + SQLite app built to act as a local monolith during development. It uses a consumer/service/controller pattern so the data access (`consumer`) can later be swapped for a DynamoDB implementation (for deploying as Lambdas).

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

- DB file is `./data/bookings.sqlite` by default (see `.env.example`).
- To swap the consumer later, implement the same methods in a new consumer file (e.g. `bookingConsumerDynamo.js`) and inject it into the service.
