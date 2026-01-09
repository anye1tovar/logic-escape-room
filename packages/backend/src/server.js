const express = require("express");
const cors = require("cors");
const bodyParser = require("express").json;
const config = require("./config");

// consumers, services, controllers
const initBookingConsumer = require("./consumers/bookingConsumerSqlite");
const buildBookingService = require("./services/bookingService");
const buildBookingController = require("./controllers/bookingController");
const createBookingsRouter = require("./routes/bookings");
const initUsersConsumer = require("./consumers/usersConsumerSqlite");
const buildUsersService = require("./services/usersService");
const buildUsersController = require("./controllers/usersController");
const createUsersRouter = require("./routes/users");
const buildAuthService = require("./services/authService");
const buildAuthController = require("./controllers/authController");
const createAuthRouter = require("./routes/auth");
const requireAuth = require("./middleware/requireAuth");
const db = require("./db/initDb");

const initAdminRoomsConsumer = require("./consumers/adminRoomsConsumerSqlite");
const buildAdminRoomsService = require("./services/adminRoomsService");
const buildAdminRoomsController = require("./controllers/adminRoomsController");
const createAdminRoomsRouter = require("./routes/adminRooms");

const initAdminRatesConsumer = require("./consumers/adminRatesConsumerSqlite");
const buildAdminRatesService = require("./services/adminRatesService");
const buildAdminRatesController = require("./controllers/adminRatesController");
const createAdminRatesRouter = require("./routes/adminRates");

const initAdminOpeningHoursConsumer = require("./consumers/adminOpeningHoursConsumerSqlite");
const buildAdminOpeningHoursService = require("./services/adminOpeningHoursService");
const buildAdminOpeningHoursController = require("./controllers/adminOpeningHoursController");
const createAdminOpeningHoursRouter = require("./routes/adminOpeningHours");

const initAdminHolidaysConsumer = require("./consumers/adminHolidaysConsumerSqlite");
const buildAdminHolidaysService = require("./services/adminHolidaysService");
const buildAdminHolidaysController = require("./controllers/adminHolidaysController");
const createAdminHolidaysRouter = require("./routes/adminHolidays");

const initAdminSettingsConsumer = require("./consumers/adminSettingsConsumerSqlite");
const buildAdminSettingsService = require("./services/adminSettingsService");
const buildAdminSettingsController = require("./controllers/adminSettingsController");
const createAdminSettingsRouter = require("./routes/adminSettings");

const initAdminReservationsConsumer = require("./consumers/adminReservationsConsumerSqlite");
const buildAdminReservationsService = require("./services/adminReservationsService");
const buildAdminReservationsController = require("./controllers/adminReservationsController");
const createAdminReservationsRouter = require("./routes/adminReservations");

const initAdminCafeteriaProductsConsumer = require("./consumers/adminCafeteriaProductsConsumerSqlite");
const buildAdminCafeteriaProductsService = require("./services/adminCafeteriaProductsService");
const buildAdminCafeteriaProductsController = require("./controllers/adminCafeteriaProductsController");
const createAdminCafeteriaProductsRouter = require("./routes/adminCafeteriaProducts");

const initCafeteriaProductsConsumer = require("./consumers/cafeteriaProductsConsumer");
const buildCafeteriaProductsService = require("./services/cafeteriaProductsService");
const buildCafeteriaProductsController = require("./controllers/cafeteriaProductsController");
const createCafeteriaProductsRouter = require("./routes/cafeteriaProducts");

async function start() {
  await db.ready;
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

  const ratesConsumer = await initRatesConsumer();
  const ratesService = buildRatesService(ratesConsumer);
  const ratesController = buildRatesController(ratesService);
  const ratesRouter = createRatesRouter(ratesController);

  const cafeteriaProductsConsumer = await initCafeteriaProductsConsumer();
  const cafeteriaProductsService = buildCafeteriaProductsService(
    cafeteriaProductsConsumer
  );
  const cafeteriaProductsController = buildCafeteriaProductsController(
    cafeteriaProductsService
  );
  const cafeteriaProductsRouter = createCafeteriaProductsRouter(
    cafeteriaProductsController
  );

  // build layers (bookingConsumer is async to initialize)
  const bookingConsumer = await initBookingConsumer();
  const bookingService = buildBookingService(bookingConsumer, {
    roomsService,
    openingHoursConsumer,
    colombianHolidaysConsumer,
    ratesService,
  });
  const bookingController = buildBookingController(bookingService);
  const bookingsRouter = createBookingsRouter(bookingController);

  const usersConsumer = await initUsersConsumer();
  const usersService = buildUsersService(usersConsumer);
  const usersController = buildUsersController(usersService);
  const usersRouter = createUsersRouter(usersController);

  const authService = buildAuthService(usersConsumer, config.auth);
  const authController = buildAuthController(authService);
  const authRouter = createAuthRouter(authController);

  const adminAuth = requireAuth(config.auth);

  const adminRoomsConsumer = await initAdminRoomsConsumer();
  const adminRoomsService = buildAdminRoomsService(adminRoomsConsumer);
  const adminRoomsController = buildAdminRoomsController(adminRoomsService);
  const adminRoomsRouter = createAdminRoomsRouter(adminRoomsController);

  const adminRatesConsumer = await initAdminRatesConsumer();
  const adminRatesService = buildAdminRatesService(adminRatesConsumer);
  const adminRatesController = buildAdminRatesController(adminRatesService);
  const adminRatesRouter = createAdminRatesRouter(adminRatesController);

  const adminOpeningHoursConsumer = await initAdminOpeningHoursConsumer();
  const adminOpeningHoursService = buildAdminOpeningHoursService(
    adminOpeningHoursConsumer
  );
  const adminOpeningHoursController = buildAdminOpeningHoursController(
    adminOpeningHoursService
  );
  const adminOpeningHoursRouter = createAdminOpeningHoursRouter(
    adminOpeningHoursController
  );

  const adminHolidaysConsumer = await initAdminHolidaysConsumer();
  const adminHolidaysService = buildAdminHolidaysService(adminHolidaysConsumer);
  const adminHolidaysController = buildAdminHolidaysController(
    adminHolidaysService
  );
  const adminHolidaysRouter = createAdminHolidaysRouter(adminHolidaysController);

  const adminSettingsConsumer = await initAdminSettingsConsumer();
  const adminSettingsService = buildAdminSettingsService(adminSettingsConsumer);
  const adminSettingsController = buildAdminSettingsController(
    adminSettingsService
  );
  const adminSettingsRouter = createAdminSettingsRouter(adminSettingsController);

  const adminReservationsConsumer = await initAdminReservationsConsumer();
  const adminReservationsService = buildAdminReservationsService(
    adminReservationsConsumer
  );
  const adminReservationsController = buildAdminReservationsController(
    adminReservationsService
  );
  const adminReservationsRouter = createAdminReservationsRouter(
    adminReservationsController
  );

  const adminCafeteriaProductsConsumer =
    await initAdminCafeteriaProductsConsumer();
  const adminCafeteriaProductsService = buildAdminCafeteriaProductsService(
    adminCafeteriaProductsConsumer
  );
  const adminCafeteriaProductsController =
    buildAdminCafeteriaProductsController(adminCafeteriaProductsService);
  const adminCafeteriaProductsRouter = createAdminCafeteriaProductsRouter(
    adminCafeteriaProductsController
  );

  app.use("/api/bookings", bookingsRouter);
  app.use("/api/rooms", roomsRouter);
  app.use("/api/rates", ratesRouter);
  app.use("/api/cafeteria/products", cafeteriaProductsRouter);
  app.use("/api/users", usersRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/admin/rooms", adminAuth, adminRoomsRouter);
  app.use("/api/admin/rates", adminAuth, adminRatesRouter);
  app.use("/api/admin/opening-hours", adminAuth, adminOpeningHoursRouter);
  app.use("/api/admin/holidays", adminAuth, adminHolidaysRouter);
  app.use("/api/admin/settings", adminAuth, adminSettingsRouter);
  app.use("/api/admin/reservations", adminAuth, adminReservationsRouter);
  app.use(
    "/api/admin/cafeteria-products",
    adminAuth,
    adminCafeteriaProductsRouter
  );

  app.get("/health", (req, res) => res.json({ ok: true }));

  app.listen(config.port, () => {
    console.log(`Backend listening on http://localhost:${config.port}`);
  });
}

start().catch((err) => {
  console.error("Failed to start server", err);
  process.exit(1);
});
