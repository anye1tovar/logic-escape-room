const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

module.exports = {
  port: process.env.PORT || 4000,
  databaseFile: process.env.DATABASE_FILE || "./data/bookings.sqlite",
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    redirectUri:
      process.env.GOOGLE_REDIRECT_URI ||
      "http://localhost:4000/auth/google/callback",
  },
};
