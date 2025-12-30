const express = require("express");
const cors = require("cors");
const bodyParser = require("express").json;
const config = require("./config");

// consumers, services, controllers
const initBookingConsumer = require("./consumers/bookingConsumerSqlite");
const buildBookingService = require("./services/bookingService");
const buildBookingController = require("./controllers/bookingController");
const createBookingsRouter = require("./routes/bookings");

async function start() {
  const app = express();
  app.use(cors());
  app.use(bodyParser());

  const initRoomsConsumer = require("./consumers/roomsConsumer");
  const buildRoomsService = require("./services/roomsService");
  const buildRoomsController = require("./controllers/roomsController");
  const createRoomsRouter = require("./routes/rooms");
  const initRatesConsumer = require("./consumers/ratesConsumer");
  const buildRatesService = require("./services/ratesService");
  const buildRatesController = require("./controllers/ratesController");
  const createRatesRouter = require("./routes/rates");

  const roomsConsumer = await initRoomsConsumer();
  const roomsService = buildRoomsService(roomsConsumer);
  const roomsController = buildRoomsController(roomsService);
  const roomsRouter = createRoomsRouter(roomsController);

  const initOpeningHoursConsumer = require("./consumers/openingHoursConsumer");
  const openingHoursConsumer = await initOpeningHoursConsumer();
  const initColombianHolidaysConsumer = require("./consumers/colombianHolidaysConsumer");
  const colombianHolidaysConsumer = await initColombianHolidaysConsumer();
  const initGoogleCalendarConsumer = require("./consumers/googleCalendarConsumer");
  const calendarConsumer = await initGoogleCalendarConsumer(config.google);

  const ratesConsumer = await initRatesConsumer();
  const ratesService = buildRatesService(ratesConsumer);
  const ratesController = buildRatesController(ratesService);
  const ratesRouter = createRatesRouter(ratesController);

  // build layers (bookingConsumer is async to initialize)
  const bookingConsumer = await initBookingConsumer();
  const bookingService = buildBookingService(bookingConsumer, {
    roomsService,
    openingHoursConsumer,
    colombianHolidaysConsumer,
    ratesService,
    calendarConsumer,
  });
  const bookingController = buildBookingController(bookingService);
  const bookingsRouter = createBookingsRouter(bookingController);

  app.use("/api/bookings", bookingsRouter);
  app.use("/api/rooms", roomsRouter);
  app.use("/api/rates", ratesRouter);

  app.get("/health", (req, res) => res.json({ ok: true }));

  app.listen(config.port, () => {
    console.log(`Backend listening on http://localhost:${config.port}`);
  });
}

start().catch((err) => {
  console.error("Failed to start server", err);
  process.exit(1);
});
