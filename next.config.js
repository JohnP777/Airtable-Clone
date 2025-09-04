/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";

/** @type {import("next").NextConfig} */
const config = {
	eslint: {
		// Ignore ESLint errors during production builds (e.g., Vercel)
		ignoreDuringBuilds: true,
	},
};

export default config;
