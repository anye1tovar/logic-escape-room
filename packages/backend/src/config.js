const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const DEV_AUTH_SECRET = "dev-secret-change-me";
const isProductionLike =
	process.env.NODE_ENV === "production" ||
	Boolean(
		process.env.RENDER || process.env.RAILWAY_ENVIRONMENT || process.env.KOYEB,
	);

function resolveAuthSecret() {
	const secret = String(process.env.AUTH_SECRET || "").trim();

	if (secret && secret !== DEV_AUTH_SECRET) {
		return secret;
	}

	if (isProductionLike) {
		throw new Error(
			"AUTH_SECRET must be set to a strong non-default value in production.",
		);
	}

	console.warn(
		"WARNING: Using the development AUTH_SECRET fallback. Set AUTH_SECRET before deploying.",
	);
	return DEV_AUTH_SECRET;
}

module.exports = {
	port: process.env.PORT || 4000,
	databaseUrl: process.env.DATABASE_URL,
	databaseSsl: String(process.env.DATABASE_SSL || "").toLowerCase() === "true",
	auth: {
		secret: resolveAuthSecret(),
		tokenTtlSeconds: Number(process.env.AUTH_TOKEN_TTL_SECONDS || 8 * 60 * 60),
	},
};
