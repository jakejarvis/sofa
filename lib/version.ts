import packageJson from "../package.json";

export const APP_VERSION = packageJson.version;
export const GIT_COMMIT = process.env.GIT_COMMIT_SHA ?? "unknown";
