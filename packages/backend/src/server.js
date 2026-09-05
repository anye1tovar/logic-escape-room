const express = require("express");
const cors = require("cors");
const bodyParser = require("express").json;
const config = require("./config");

const allowedOrigins = String(process.env.CORS_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const corsOptions =
  allowedOrigins.length > 0
    ? {
        origin: (origin, callback) => {
          if (!origin) return callback(null, true);
          if (allowedOrigins.includes(origin)) return callback(null, true);
          return callback(new Error("Not allowed by CORS"));
        },
      }
    : undefined;

// consumers, services, controllers
const initBookingConsumer = require("./consumers/bookingConsumer");
const buildBookingService = require("./services/bookingService");
const buildBookingController = require("./controllers/bookingController");
const createBookingsRouter = require("./routes/bookings");
const initUsersConsumer = require("./consumers/usersConsumer");
const buildUsersService = require("./services/usersService");
const buildUsersController = require("./controllers/usersController");
const createUsersRouter = require("./routes/users");
const buildAuthService = require("./services/authService");
const buildAuthController = require("./controllers/authController");
const createAuthRouter = require("./routes/auth");
const requireAuth = require("./middleware/requireAuth");
const db = require("./db/initDb");
const initAdminUsersConsumer = require("./consumers/adminUsersConsumer");
const buildAdminUsersService = require("./services/adminUsersService");
const buildAdminUsersController = require("./controllers/adminUsersController");
const createAdminUsersRouter = require("./routes/adminUsers");

const initAdminRoomsConsumer = require("./consumers/adminRoomsConsumer");
const buildAdminRoomsService = require("./services/adminRoomsService");
const buildAdminRoomsController = require("./controllers/adminRoomsController");
const createAdminRoomsRouter = require("./routes/adminRooms");

const initAdminRatesConsumer = require("./consumers/adminRatesConsumer");
const buildAdminRatesService = require("./services/adminRatesService");
const buildAdminRatesController = require("./controllers/adminRatesController");
const createAdminRatesRouter = require("./routes/adminRates");

const initAdminOpeningHoursConsumer = require("./consumers/adminOpeningHoursConsumer");
const buildAdminOpeningHoursService = require("./services/adminOpeningHoursService");
const buildAdminOpeningHoursController = require("./controllers/adminOpeningHoursController");
const createAdminOpeningHoursRouter = require("./routes/adminOpeningHours");

const initAdminHolidaysConsumer = require("./consumers/adminHolidaysConsumer");
const buildAdminHolidaysService = require("./services/adminHolidaysService");
const buildAdminHolidaysController = require("./controllers/adminHolidaysController");
const createAdminHolidaysRouter = require("./routes/adminHolidays");

const initAdminSettingsConsumer = require("./consumers/adminSettingsConsumer");
const buildAdminSettingsService = require("./services/adminSettingsService");
const buildAdminSettingsController = require("./controllers/adminSettingsController");
const createAdminSettingsRouter = require("./routes/adminSettings");

const initAdminReservationsConsumer = require("./consumers/adminReservationsConsumer");
const buildAdminReservationsService = require("./services/adminReservationsService");
const buildAdminReservationsController = require("./controllers/adminReservationsController");
const createAdminReservationsRouter = require("./routes/adminReservations");

const initAdminCafeteriaProductsConsumer = require("./consumers/adminCafeteriaProductsConsumer");
const buildAdminCafeteriaProductsService = require("./services/adminCafeteriaProductsService");
const buildAdminCafeteriaProductsController = require("./controllers/adminCafeteriaProductsController");
const createAdminCafeteriaProductsRouter = require("./routes/adminCafeteriaProducts");
const initAdminFinancialAccountsConsumer = require("./consumers/adminFinancialAccountsConsumer");
const buildAdminFinancialAccountsService = require("./services/adminFinancialAccountsService");
const buildAdminFinancialAccountsController = require("./controllers/adminFinancialAccountsController");
const createAdminFinancialAccountsRouter = require("./routes/adminFinancialAccounts");
const initAdminVisitAccountsConsumer = require("./consumers/adminVisitAccountsConsumer");
const buildAdminVisitAccountsService = require("./services/adminVisitAccountsService");
const buildAdminVisitAccountsController = require("./controllers/adminVisitAccountsController");
const createAdminVisitAccountsRouter = require("./routes/adminVisitAccounts");
const initAdminInventoryPurchasesConsumer = require("./consumers/adminInventoryPurchasesConsumer");
const buildAdminInventoryPurchasesService = require("./services/adminInventoryPurchasesService");
const buildAdminInventoryPurchasesController = require("./controllers/adminInventoryPurchasesController");
const createAdminInventoryPurchasesRouter = require("./routes/adminInventoryPurchases");
const initAdminDailyClosesConsumer = require("./consumers/adminDailyClosesConsumer");
const buildAdminDailyClosesService = require("./services/adminDailyClosesService");
const buildAdminDailyClosesController = require("./controllers/adminDailyClosesController");
const createAdminDailyClosesRouter = require("./routes/adminDailyCloses");
const initAdminReportsConsumer = require("./consumers/adminReportsConsumer");
const buildAdminReportsService = require("./services/adminReportsService");
const buildAdminReportsController = require("./controllers/adminReportsController");
const createAdminReportsRouter = require("./routes/adminReports");
const initAdminCostAllocationRulesConsumer = require("./consumers/adminCostAllocationRulesConsumer");
const buildAdminCostAllocationRulesService = require("./services/adminCostAllocationRulesService");
const buildAdminCostAllocationRulesController = require("./controllers/adminCostAllocationRulesController");
const createAdminCostAllocationRulesRouter = require("./routes/adminCostAllocationRules");
const initAdminIncomeStatementConsumer = require("./consumers/adminIncomeStatementConsumer");
const buildAdminIncomeStatementService = require("./services/adminIncomeStatementService");
const buildAdminIncomeStatementController = require("./controllers/adminIncomeStatementController");
const createAdminIncomeStatementRouter = require("./routes/adminIncomeStatement");
const initAdminFinancialDashboardConsumer = require("./consumers/adminFinancialDashboardConsumer");
const buildAdminFinancialDashboardService = require("./services/adminFinancialDashboardService");
const buildAdminFinancialDashboardController = require("./controllers/adminFinancialDashboardController");
const createAdminFinancialDashboardRouter = require("./routes/adminFinancialDashboard");
const initAdminSuppliesConsumer = require("./consumers/adminSuppliesConsumer");
const buildAdminSuppliesService = require("./services/adminSuppliesService");
const buildAdminSuppliesController = require("./controllers/adminSuppliesController");
const createAdminSuppliesRouter = require("./routes/adminSupplies");
const initAdminSupplyPurchasesConsumer = require("./consumers/adminSupplyPurchasesConsumer");
const buildAdminSupplyPurchasesService = require("./services/adminSupplyPurchasesService");
const buildAdminSupplyPurchasesController = require("./controllers/adminSupplyPurchasesController");
const createAdminSupplyPurchasesRouter = require("./routes/adminSupplyPurchases");
const initAdminRecipesConsumer = require("./consumers/adminRecipesConsumer");
const buildAdminRecipesService = require("./services/adminRecipesService");
const buildAdminRecipesController = require("./controllers/adminRecipesController");
const createAdminRecipesRouter = require("./routes/adminRecipes");
const buildMetaCapiService = require("./services/metaCapiService");
const buildMetaTrackingService = require("./services/metaTrackingService");
const buildMetaTrackingController = require("./controllers/metaTrackingController");
const createMetaTrackingRouter = require("./routes/metaTracking");

const initCafeteriaProductsConsumer = require("./consumers/cafeteriaProductsConsumer");
const buildCafeteriaProductsService = require("./services/cafeteriaProductsService");
const buildCafeteriaProductsController = require("./controllers/cafeteriaProductsController");
const createCafeteriaProductsRouter = require("./routes/cafeteriaProducts");

async function start() {
  await db.ready;
  const app = express();
  app.set("trust proxy", true);
  app.use(cors(corsOptions));
  app.use(bodyParser());
  const metaCapiService = buildMetaCapiService(config.meta);

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
    cafeteriaProductsConsumer,
  );
  const cafeteriaProductsController = buildCafeteriaProductsController(
    cafeteriaProductsService,
  );
  const cafeteriaProductsRouter = createCafeteriaProductsRouter(
    cafeteriaProductsController,
  );

  // build layers (bookingConsumer is async to initialize)
  const bookingConsumer = await initBookingConsumer();
  const bookingService = buildBookingService(bookingConsumer, {
    roomsService,
    openingHoursConsumer,
    colombianHolidaysConsumer,
    ratesService,
    metaCapiService,
  });
  const bookingController = buildBookingController(bookingService, {
    auth: config.auth,
    verifyToken: requireAuth.verifyToken,
  });
  const bookingsRouter = createBookingsRouter(bookingController);

  const usersConsumer = await initUsersConsumer();
  const usersService = buildUsersService(usersConsumer);
  const usersController = buildUsersController(usersService);
  const usersRouter = createUsersRouter(usersController);

  const authService = buildAuthService(usersConsumer, config.auth);
  const authController = buildAuthController(authService);
  const authRouter = createAuthRouter(authController);

  const adminAuth = requireAuth(config.auth, { roles: ["admin"] });
  const adminOrGameMasterAuth = requireAuth(config.auth, {
    roles: ["admin", "game_master"],
  });

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
    adminOpeningHoursConsumer,
  );
  const adminOpeningHoursController = buildAdminOpeningHoursController(
    adminOpeningHoursService,
  );
  const adminOpeningHoursRouter = createAdminOpeningHoursRouter(
    adminOpeningHoursController,
  );

  const adminHolidaysConsumer = await initAdminHolidaysConsumer();
  const adminHolidaysService = buildAdminHolidaysService(adminHolidaysConsumer);
  const adminHolidaysController =
    buildAdminHolidaysController(adminHolidaysService);
  const adminHolidaysRouter = createAdminHolidaysRouter(
    adminHolidaysController,
  );

  const adminSettingsConsumer = await initAdminSettingsConsumer();
  const adminSettingsService = buildAdminSettingsService(adminSettingsConsumer);
  const adminSettingsController =
    buildAdminSettingsController(adminSettingsService);
  const adminSettingsRouter = createAdminSettingsRouter(
    adminSettingsController,
  );

  const adminReservationsConsumer = await initAdminReservationsConsumer();
  const adminReservationsService = buildAdminReservationsService(
    adminReservationsConsumer,
    { bookingService, roomsService, metaCapiService },
  );
  const adminReservationsController = buildAdminReservationsController(
    adminReservationsService,
  );
  const adminReservationsRouter = createAdminReservationsRouter(
    adminReservationsController,
  );

  const adminCafeteriaProductsConsumer =
    await initAdminCafeteriaProductsConsumer();
  const adminCafeteriaProductsService = buildAdminCafeteriaProductsService(
    adminCafeteriaProductsConsumer,
  );
  const adminCafeteriaProductsController =
    buildAdminCafeteriaProductsController(adminCafeteriaProductsService);
  const adminCafeteriaProductsRouter = createAdminCafeteriaProductsRouter(
    adminCafeteriaProductsController,
  );

  const adminUsersConsumer = await initAdminUsersConsumer();
  const adminUsersService = buildAdminUsersService(adminUsersConsumer);
  const adminUsersController = buildAdminUsersController(adminUsersService);
  const adminUsersRouter = createAdminUsersRouter(adminUsersController);

  const adminFinancialAccountsConsumer =
    await initAdminFinancialAccountsConsumer();
  const adminFinancialAccountsService = buildAdminFinancialAccountsService(
    adminFinancialAccountsConsumer,
  );
  const adminFinancialAccountsController =
    buildAdminFinancialAccountsController(adminFinancialAccountsService);
  const adminFinancialAccountsRouter = createAdminFinancialAccountsRouter(
    adminFinancialAccountsController,
  );

  const adminVisitAccountsConsumer = await initAdminVisitAccountsConsumer();
  const adminVisitAccountsService = buildAdminVisitAccountsService(
    adminVisitAccountsConsumer,
  );
  const adminVisitAccountsController = buildAdminVisitAccountsController(
    adminVisitAccountsService,
  );
  const adminVisitAccountsRouter = createAdminVisitAccountsRouter(
    adminVisitAccountsController,
  );

  const adminInventoryPurchasesConsumer =
    await initAdminInventoryPurchasesConsumer();
  const adminInventoryPurchasesService = buildAdminInventoryPurchasesService(
    adminInventoryPurchasesConsumer,
  );
  const adminInventoryPurchasesController =
    buildAdminInventoryPurchasesController(adminInventoryPurchasesService);
  const adminInventoryPurchasesRouter = createAdminInventoryPurchasesRouter(
    adminInventoryPurchasesController,
  );

  const adminDailyClosesConsumer = await initAdminDailyClosesConsumer();
  const adminDailyClosesService = buildAdminDailyClosesService(
    adminDailyClosesConsumer,
  );
  const adminDailyClosesController =
    buildAdminDailyClosesController(adminDailyClosesService);
  const adminDailyClosesRouter = createAdminDailyClosesRouter(
    adminDailyClosesController,
  );

  const adminReportsConsumer = await initAdminReportsConsumer();
  const adminReportsService = buildAdminReportsService(adminReportsConsumer);
  const adminReportsController =
    buildAdminReportsController(adminReportsService);
  const adminReportsRouter = createAdminReportsRouter(adminReportsController);

  const adminCostAllocationRulesConsumer =
    await initAdminCostAllocationRulesConsumer();
  const adminCostAllocationRulesService = buildAdminCostAllocationRulesService(
    adminCostAllocationRulesConsumer,
  );
  const adminCostAllocationRulesController =
    buildAdminCostAllocationRulesController(adminCostAllocationRulesService);
  const adminCostAllocationRulesRouter = createAdminCostAllocationRulesRouter(
    adminCostAllocationRulesController,
  );

  const adminIncomeStatementConsumer = await initAdminIncomeStatementConsumer();
  const adminIncomeStatementService = buildAdminIncomeStatementService(
    adminIncomeStatementConsumer,
  );
  const adminIncomeStatementController = buildAdminIncomeStatementController(
    adminIncomeStatementService,
  );
  const adminIncomeStatementRouter = createAdminIncomeStatementRouter(
    adminIncomeStatementController,
  );

  const adminFinancialDashboardConsumer =
    await initAdminFinancialDashboardConsumer();
  const adminFinancialDashboardService = buildAdminFinancialDashboardService(
    adminIncomeStatementConsumer,
    adminFinancialDashboardConsumer,
  );
  const adminFinancialDashboardController =
    buildAdminFinancialDashboardController(adminFinancialDashboardService);
  const adminFinancialDashboardRouter = createAdminFinancialDashboardRouter(
    adminFinancialDashboardController,
  );

  const adminSuppliesConsumer = await initAdminSuppliesConsumer();
  const adminSuppliesService = buildAdminSuppliesService(adminSuppliesConsumer);
  const adminSuppliesController =
    buildAdminSuppliesController(adminSuppliesService);
  const adminSuppliesRouter = createAdminSuppliesRouter(adminSuppliesController);

  const adminSupplyPurchasesConsumer =
    await initAdminSupplyPurchasesConsumer();
  const adminSupplyPurchasesService = buildAdminSupplyPurchasesService(
    adminSupplyPurchasesConsumer,
  );
  const adminSupplyPurchasesController =
    buildAdminSupplyPurchasesController(adminSupplyPurchasesService);
  const adminSupplyPurchasesRouter = createAdminSupplyPurchasesRouter(
    adminSupplyPurchasesController,
  );

  const adminRecipesConsumer = await initAdminRecipesConsumer();
  const adminRecipesService = buildAdminRecipesService(adminRecipesConsumer);
  const adminRecipesController = buildAdminRecipesController(adminRecipesService);
  const adminRecipesRouter = createAdminRecipesRouter(adminRecipesController);

  const metaTrackingService = buildMetaTrackingService(metaCapiService);
  const metaTrackingController =
    buildMetaTrackingController(metaTrackingService);
  const metaTrackingRouter = createMetaTrackingRouter(metaTrackingController);

  app.use("/api/bookings", bookingsRouter);
  app.use("/api/tracking", metaTrackingRouter);
  app.use("/api/rooms", roomsRouter);
  app.use("/api/rates", ratesRouter);
  app.use("/api/cafeteria/products", cafeteriaProductsRouter);
  app.use("/api/users", adminAuth, usersRouter);
  app.use("/api/auth", authRouter);
  app.use(
    "/api/admin/rooms",
    (req, res, next) => {
      if (req.method === "GET") {
        return adminOrGameMasterAuth(req, res, next);
      }
      return adminAuth(req, res, next);
    },
    adminRoomsRouter,
  );
  app.use("/api/admin/rates", adminAuth, adminRatesRouter);
  app.use("/api/admin/opening-hours", adminAuth, adminOpeningHoursRouter);
  app.use("/api/admin/holidays", adminAuth, adminHolidaysRouter);
  app.use("/api/admin/settings", adminAuth, adminSettingsRouter);
  app.use(
    "/api/admin/reservations",
    adminOrGameMasterAuth,
    adminReservationsRouter,
  );
  app.use("/api/admin/users", adminAuth, adminUsersRouter);
  app.use(
    "/api/admin/cafeteria-products",
    adminOrGameMasterAuth,
    adminCafeteriaProductsRouter,
  );
  app.use(
    "/api/admin/financial-accounts",
    (req, res, next) => {
      const gameMasterPaths = [
        "/operation-accounts",
        "/expenses",
        "/owner-contributions",
        "/transfers",
      ];
      const gameMasterPathPrefixes = [
        "/expenses/",
        "/owner-contributions/",
        "/transfers/",
      ];
      if (
        gameMasterPaths.includes(req.path) ||
        gameMasterPathPrefixes.some((prefix) => req.path.startsWith(prefix))
      ) {
        return adminOrGameMasterAuth(req, res, next);
      }
      return adminAuth(req, res, next);
    },
    adminFinancialAccountsRouter,
  );
  app.use(
    "/api/admin/visit-accounts",
    adminOrGameMasterAuth,
    adminVisitAccountsRouter,
  );
  app.use(
    "/api/admin/inventory-purchases",
    adminOrGameMasterAuth,
    adminInventoryPurchasesRouter,
  );
  app.use(
    "/api/admin/daily-closes",
    adminOrGameMasterAuth,
    adminDailyClosesRouter,
  );
  app.use("/api/admin/reports", adminAuth, adminReportsRouter);
  app.use(
    "/api/admin/cost-allocation-rules",
    adminAuth,
    adminCostAllocationRulesRouter,
  );
  app.use(
    "/api/admin/income-statement",
    adminAuth,
    adminIncomeStatementRouter,
  );
  app.use(
    "/api/admin/financial-dashboard",
    adminAuth,
    adminFinancialDashboardRouter,
  );
  app.use(
    "/api/admin/supplies",
    (req, res, next) => {
      if (req.method === "GET" && req.path === "/") {
        return adminOrGameMasterAuth(req, res, next);
      }
      return adminAuth(req, res, next);
    },
    adminSuppliesRouter,
  );
  app.use(
    "/api/admin/supply-purchases",
    adminOrGameMasterAuth,
    adminSupplyPurchasesRouter,
  );
  app.use("/api/admin/recipes", adminAuth, adminRecipesRouter);

  app.get("/health", (req, res) => res.json({ ok: true }));

  app.listen(config.port, () => {
    console.log(`Backend listening on http://localhost:${config.port}`);
  });
}

start().catch((err) => {
  console.error("Failed to start server", err);
  process.exit(1);
});
