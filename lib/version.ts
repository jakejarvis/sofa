import packageJson from "../package.json" with { type: "json" };

export const APP_VERSION = packageJson.version;
export const GIT_COMMIT = process.env.GIT_COMMIT_SHA?.slice(0, 7) || "";
