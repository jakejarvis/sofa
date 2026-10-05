import { getIP } from "@better-auth/core/utils/ip";
import { describe, expect, test } from "vitest";

import { CLIENT_IP_HEADER } from "@sofa/auth/config";

import {
  buildTrustedProxyList,
  DEFAULT_TRUSTED_PROXIES,
  normalizeAddress,
  parseTrustedProxies,
  resolveClientIp,
} from "../src/client-ip";

const defaults = buildTrustedProxyList(DEFAULT_TRUSTED_PROXIES).list;
const none = buildTrustedProxyList([]).list;

describe("resolveClientIp", () => {
  test("direct internet client spoofing X-Forwarded-For is keyed on the peer", () => {
    expect(resolveClientIp("6.6.6.6", "203.0.113.9", defaults)).toBe("203.0.113.9");
  });

  test("direct internet client with no header", () => {
    expect(resolveClientIp(null, "203.0.113.9", defaults)).toBe("203.0.113.9");
  });

  test("LAN client direct, no header (all-trusted fallback)", () => {
    expect(resolveClientIp(null, "192.168.1.5", defaults)).toBe("192.168.1.5");
  });

  test("dual-stack mapped peer is normalized", () => {
    expect(resolveClientIp(null, "::ffff:192.168.1.5", defaults)).toBe("192.168.1.5");
  });

  test("local proxy, internet client", () => {
    expect(resolveClientIp("198.51.100.7", "172.18.0.5", defaults)).toBe("198.51.100.7");
  });

  test("local proxy, LAN client", () => {
    expect(resolveClientIp("192.168.1.5", "127.0.0.1", defaults)).toBe("192.168.1.5");
  });

  test("spoof through a local proxy", () => {
    expect(resolveClientIp("6.6.6.6, 198.51.100.7", "172.18.0.5", defaults)).toBe("198.51.100.7");
  });

  test("malformed hop left of a LAN client", () => {
    expect(resolveClientIp("garbage, 192.168.1.5", "127.0.0.1", defaults)).toBe("192.168.1.5");
  });

  test("malformed hop right after the peer", () => {
    expect(resolveClientIp("garbage", "127.0.0.1", defaults)).toBe("127.0.0.1");
  });

  test("trust nothing", () => {
    expect(resolveClientIp("6.6.6.6", "127.0.0.1", none)).toBe("127.0.0.1");
  });

  test("IPv6 client through a local proxy", () => {
    expect(resolveClientIp("2001:db8::1", "::1", defaults)).toBe("2001:db8::1");
  });

  test("unknown peer", () => {
    expect(resolveClientIp("6.6.6.6", undefined, defaults)).toBeNull();
  });
});

describe("TRUSTED_PROXIES parsing", () => {
  test("parseTrustedProxies", () => {
    expect(parseTrustedProxies(undefined)).toBe(DEFAULT_TRUSTED_PROXIES);
    expect(parseTrustedProxies("  ")).toBe(DEFAULT_TRUSTED_PROXIES);
    expect(parseTrustedProxies("None")).toEqual([]);
    expect(parseTrustedProxies(" 1.2.3.4 , 10.0.0.0/24 ")).toEqual(["1.2.3.4", "10.0.0.0/24"]);
  });

  test("buildTrustedProxyList reports invalid entries", () => {
    expect(
      buildTrustedProxyList([
        "1.2.3.4",
        "10.0.0.0/24",
        "nope",
        "10.0.0.0/33",
        "::1/129",
        "1.2.3.4/8/1",
        "10.0.0.0/x",
      ]).invalid,
    ).toEqual(["nope", "10.0.0.0/33", "::1/129", "1.2.3.4/8/1", "10.0.0.0/x"]);
    expect(buildTrustedProxyList(DEFAULT_TRUSTED_PROXIES).invalid).toEqual([]);
  });

  test("normalizeAddress leaves plain IPv6 unchanged", () => {
    expect(normalizeAddress("2001:db8::1")).toBe("2001:db8::1");
  });
});

describe("Better Auth reads the resolved header", () => {
  const options = { advanced: { ipAddress: { ipAddressHeaders: [CLIENT_IP_HEADER] } } };

  test("uses the internal header and ignores a client-sent X-Forwarded-For", () => {
    expect(getIP(new Headers({ [CLIENT_IP_HEADER]: "198.51.100.7" }), options)).toBe(
      "198.51.100.7",
    );
    expect(
      getIP(
        new Headers({ [CLIENT_IP_HEADER]: "192.168.1.5", "x-forwarded-for": "6.6.6.6" }),
        options,
      ),
    ).toBe("192.168.1.5");
  });
});
