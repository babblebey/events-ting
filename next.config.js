/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";
import withFlowbiteReact from "flowbite-react/plugin/nextjs";

/** @type {import("next").NextConfig} */
const config = {};

export default withFlowbiteReact(config);
