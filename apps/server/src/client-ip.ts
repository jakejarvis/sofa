import { BlockList, isIP } from "node:net";

import type { Context } from "hono";
import { getConnInfo } from "hono/bun";

import { CLIENT_IP_HEADER } from "@sofa/auth/config";
import { createLogger } from "@sofa/logger";

const log = createLogger("server");

/** Loopback and private ranges: a reverse proxy on the same host or Docker network. */
export const DEFAULT_TRUSTED_PROXIES = [
  "127.0.0.0/8",
  "::1/128",
  "10.0.0.0/8",
  "172.16.0.0/12",
  "192.168.0.0/16",
  "fc00::/7",
];

/**
 * Parses `TRUSTED_PROXIES`: a comma-separated list of IPs/CIDRs. Unset or blank → the defaults;
 * "none" → trust nothing (the TCP peer address is always the client).
 */
export function parseTrustedProxies(raw: string | undefined): string[] {
  const value = raw?.trim();
  if (!value) return DEFAULT_TRUSTED_PROXIES;
  if (value.toLowerCase() === "none") return [];
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

/** Builds the matcher for trusted proxies; malformed entries are returned in `invalid`. */
export function buildTrustedProxyList(entries: readonly string[]): {
  list: BlockList;
  invalid: string[];
} {
  const list = new BlockList();
  const invalid: string[] = [];
  for (const entry of entries) {
    const [address = "", prefix, ...rest] = entry.split("/");
    const family = isIP(address);
    const bits = prefix === undefined ? undefined : Number(prefix);
    const maxBits = family === 6 ? 128 : 32;
    if (
      family === 0 ||
      rest.length > 0 ||
      (prefix !== undefined && (!/^\d+$/.test(prefix) || (bits ?? 0) > maxBits))
    ) {
      invalid.push(entry);
      continue;
    }
    const type = family === 6 ? "ipv6" : "ipv4";
    if (bits === undefined) list.addAddress(address, type);
    else list.addSubnet(address, bits, type);
  }
  return { list, invalid };
}

/** Strips the IPv4-mapped IPv6 prefix Bun reports on dual-stack sockets ("::ffff:1.2.3.4"). */
export function normalizeAddress(address: string): string {
  const mapped = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i.exec(address);
  return mapped ? mapped[1] : address;
}

function isTrusted(address: string, trusted: BlockList): boolean {
  const family = isIP(address);
  return family !== 0 && trusted.check(address, family === 6 ? "ipv6" : "ipv4");
}

/**
 * The client IP for rate limiting. Walks from the TCP peer address leftwards through
 * X-Forwarded-For, skipping trusted proxies; the first untrusted hop is the client. If every hop
 * is trusted (a LAN client), the left-most one is the client. A malformed hop stops the walk at
 * the last valid hop to its right. Returns null only when the peer address is unknown or invalid,
 * so a client-sent header is never trusted on its own.
 */
export function resolveClientIp(
  forwardedFor: string | null,
  peerAddress: string | undefined,
  trusted: BlockList,
): string | null {
  if (!peerAddress) return null;
  const hops = (forwardedFor ?? "")
    .split(",")
    .map((hop) => hop.trim())
    .filter(Boolean);
  hops.push(peerAddress);
  let client: string | null = null;
  for (let i = hops.length - 1; i >= 0; i--) {
    const hop = normalizeAddress(hops[i]);
    if (isIP(hop) === 0) break;
    client = hop;
    if (!isTrusted(hop, trusted)) break;
  }
  return client;
}

const configured = parseTrustedProxies(process.env.TRUSTED_PROXIES);
const { list: trustedProxies, invalid } = buildTrustedProxyList(configured);
if (invalid.length > 0) {
  log.warn(`Ignoring invalid TRUSTED_PROXIES entries: ${invalid.join(", ")}`);
}
let warnedUntrustedForwarder = false;

/**
 * A copy of `req` whose CLIENT_IP_HEADER holds the resolved client IP (or is removed when the
 * peer address is unknown). Better Auth rate-limits on that header.
 */
export function withClientIp(c: Context, req: Request): Request {
  let peer: string | undefined;
  try {
    peer = getConnInfo(c).remote.address;
  } catch {
    // No Bun server in c.env (tests): the peer is unknown.
  }
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (
    forwardedFor &&
    peer &&
    configured.length > 0 &&
    !warnedUntrustedForwarder &&
    !isTrusted(normalizeAddress(peer), trustedProxies)
  ) {
    warnedUntrustedForwarder = true;
    log.warn(
      `Ignored X-Forwarded-For from ${normalizeAddress(peer)}, which is not in TRUSTED_PROXIES. ` +
        "If that is your reverse proxy, add its address to TRUSTED_PROXIES so sign-in rate limits apply per client.",
    );
  }
  const headers = new Headers(req.headers);
  const clientIp = resolveClientIp(forwardedFor, peer, trustedProxies);
  if (clientIp) headers.set(CLIENT_IP_HEADER, clientIp);
  else headers.delete(CLIENT_IP_HEADER);
  return new Request(req, { headers });
}
