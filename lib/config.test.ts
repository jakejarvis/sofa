import { afterEach, describe, expect, test } from "bun:test";
import {
  getOidcProviderName,
  isOidcAutoRegisterEnabled,
  isOidcConfigured,
  isPasswordLoginDisabled,
  isTmdbConfigured,
} from "./config";

describe("isTmdbConfigured", () => {
  const orig = process.env.TMDB_API_READ_ACCESS_TOKEN;

  afterEach(() => {
    if (orig !== undefined) {
      process.env.TMDB_API_READ_ACCESS_TOKEN = orig;
    } else {
      delete process.env.TMDB_API_READ_ACCESS_TOKEN;
    }
  });

  test("returns true when token is set", () => {
    process.env.TMDB_API_READ_ACCESS_TOKEN = "some-token";
    expect(isTmdbConfigured()).toBe(true);
  });

  test("returns false when token is unset", () => {
    delete process.env.TMDB_API_READ_ACCESS_TOKEN;
    expect(isTmdbConfigured()).toBe(false);
  });

  test("returns false when token is empty string", () => {
    process.env.TMDB_API_READ_ACCESS_TOKEN = "";
    expect(isTmdbConfigured()).toBe(false);
  });
});

describe("isOidcConfigured", () => {
  const origId = process.env.OIDC_CLIENT_ID;
  const origSecret = process.env.OIDC_CLIENT_SECRET;
  const origIssuer = process.env.OIDC_ISSUER_URL;

  afterEach(() => {
    for (const [key, val] of [
      ["OIDC_CLIENT_ID", origId],
      ["OIDC_CLIENT_SECRET", origSecret],
      ["OIDC_ISSUER_URL", origIssuer],
    ] as const) {
      if (val !== undefined) {
        process.env[key] = val;
      } else {
        delete process.env[key];
      }
    }
  });

  test("returns true when all three vars are set", () => {
    process.env.OIDC_CLIENT_ID = "id";
    process.env.OIDC_CLIENT_SECRET = "secret";
    process.env.OIDC_ISSUER_URL = "https://issuer.example.com";
    expect(isOidcConfigured()).toBe(true);
  });

  test("returns false when client ID is missing", () => {
    delete process.env.OIDC_CLIENT_ID;
    process.env.OIDC_CLIENT_SECRET = "secret";
    process.env.OIDC_ISSUER_URL = "https://issuer.example.com";
    expect(isOidcConfigured()).toBe(false);
  });

  test("returns false when client secret is missing", () => {
    process.env.OIDC_CLIENT_ID = "id";
    delete process.env.OIDC_CLIENT_SECRET;
    process.env.OIDC_ISSUER_URL = "https://issuer.example.com";
    expect(isOidcConfigured()).toBe(false);
  });

  test("returns false when issuer URL is missing", () => {
    process.env.OIDC_CLIENT_ID = "id";
    process.env.OIDC_CLIENT_SECRET = "secret";
    delete process.env.OIDC_ISSUER_URL;
    expect(isOidcConfigured()).toBe(false);
  });
});

describe("getOidcProviderName", () => {
  const orig = process.env.OIDC_PROVIDER_NAME;

  afterEach(() => {
    if (orig !== undefined) {
      process.env.OIDC_PROVIDER_NAME = orig;
    } else {
      delete process.env.OIDC_PROVIDER_NAME;
    }
  });

  test("returns custom name when set", () => {
    process.env.OIDC_PROVIDER_NAME = "Okta";
    expect(getOidcProviderName()).toBe("Okta");
  });

  test("returns 'SSO' as default", () => {
    delete process.env.OIDC_PROVIDER_NAME;
    expect(getOidcProviderName()).toBe("SSO");
  });
});

describe("isOidcAutoRegisterEnabled", () => {
  const orig = process.env.OIDC_AUTO_REGISTER;

  afterEach(() => {
    if (orig !== undefined) {
      process.env.OIDC_AUTO_REGISTER = orig;
    } else {
      delete process.env.OIDC_AUTO_REGISTER;
    }
  });

  test("returns true by default", () => {
    delete process.env.OIDC_AUTO_REGISTER;
    expect(isOidcAutoRegisterEnabled()).toBe(true);
  });

  test("returns false when explicitly set to 'false'", () => {
    process.env.OIDC_AUTO_REGISTER = "false";
    expect(isOidcAutoRegisterEnabled()).toBe(false);
  });

  test("returns true for any other value", () => {
    process.env.OIDC_AUTO_REGISTER = "true";
    expect(isOidcAutoRegisterEnabled()).toBe(true);
  });
});

describe("isPasswordLoginDisabled", () => {
  const origDisable = process.env.DISABLE_PASSWORD_LOGIN;
  const origId = process.env.OIDC_CLIENT_ID;
  const origSecret = process.env.OIDC_CLIENT_SECRET;
  const origIssuer = process.env.OIDC_ISSUER_URL;

  afterEach(() => {
    for (const [key, val] of [
      ["DISABLE_PASSWORD_LOGIN", origDisable],
      ["OIDC_CLIENT_ID", origId],
      ["OIDC_CLIENT_SECRET", origSecret],
      ["OIDC_ISSUER_URL", origIssuer],
    ] as const) {
      if (val !== undefined) {
        process.env[key] = val;
      } else {
        delete process.env[key];
      }
    }
  });

  test("returns true when flag is 'true' and OIDC is configured", () => {
    process.env.DISABLE_PASSWORD_LOGIN = "true";
    process.env.OIDC_CLIENT_ID = "id";
    process.env.OIDC_CLIENT_SECRET = "secret";
    process.env.OIDC_ISSUER_URL = "https://issuer.example.com";
    expect(isPasswordLoginDisabled()).toBe(true);
  });

  test("returns false when flag is 'true' but OIDC is not configured", () => {
    process.env.DISABLE_PASSWORD_LOGIN = "true";
    delete process.env.OIDC_CLIENT_ID;
    delete process.env.OIDC_CLIENT_SECRET;
    delete process.env.OIDC_ISSUER_URL;
    expect(isPasswordLoginDisabled()).toBe(false);
  });

  test("returns false when flag is not set", () => {
    delete process.env.DISABLE_PASSWORD_LOGIN;
    process.env.OIDC_CLIENT_ID = "id";
    process.env.OIDC_CLIENT_SECRET = "secret";
    process.env.OIDC_ISSUER_URL = "https://issuer.example.com";
    expect(isPasswordLoginDisabled()).toBe(false);
  });
});
