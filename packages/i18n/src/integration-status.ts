import type { I18n } from "@lingui/core";
import { msg } from "@lingui/core/macro";

import { formatRelativeTime } from "./format";
import { i18n as defaultI18n } from "./index";

/** Status line for webhook integrations (last event time). */
export function webhookStatus(lastEventAt: string | null, i18n: I18n = defaultI18n): string {
  if (lastEventAt) {
    const relativeTime = formatRelativeTime(lastEventAt);
    return i18n._(msg`Last event ${relativeTime}`);
  }
  return i18n._(msg`Ready — nothing received yet`);
}

/** Status line for list integrations (last poll time). */
export function listStatus(lastEventAt: string | null, i18n: I18n = defaultI18n): string {
  if (lastEventAt) {
    const relativeTime = formatRelativeTime(lastEventAt);
    return i18n._(msg`Last polled ${relativeTime}`);
  }
  return i18n._(msg`Ready — not polled yet`);
}
