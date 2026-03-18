import type { I18n } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import type { SvgProps } from "react-native-svg";

import {
  EmbyIcon,
  JellyfinIcon,
  PlexIcon,
  RadarrIcon,
  SonarrIcon,
} from "@/components/settings/icons";
import { getServerUrl } from "@/lib/server";
import { formatRelativeTime } from "@sofa/i18n/format";

export interface IntegrationConfig {
  provider: "plex" | "jellyfin" | "emby" | "sonarr" | "radarr";
  label: string;
  icon: React.ComponentType<SvgProps>;
  type: "webhook" | "list";
  buildUrl: (token: string) => string;
  urlLabel: string;
  connectedStatus: (lastEventAt: string | null) => string;
  requirementNote?: string;
  setupSteps: string[];
}

function webhookStatus(i18n: I18n, lastEventAt: string | null): string {
  if (lastEventAt) {
    const timeAgo = formatRelativeTime(new Date(lastEventAt));
    return i18n._(msg`Last event ${timeAgo}`);
  }
  return i18n._(msg`Ready — nothing received yet`);
}

function listStatus(i18n: I18n, lastEventAt: string | null): string {
  if (lastEventAt) {
    const timeAgo = formatRelativeTime(new Date(lastEventAt));
    return i18n._(msg`Last polled ${timeAgo}`);
  }
  return i18n._(msg`Ready — not polled yet`);
}

export function getIntegrationConfigs(i18n: I18n): IntegrationConfig[] {
  return [
    {
      provider: "plex",
      label: "Plex",
      icon: PlexIcon,
      type: "webhook",
      buildUrl: (token) => `${getServerUrl()}/api/webhooks/${token}`,
      urlLabel: i18n._(msg`Webhook URL`),
      connectedStatus: (lastEventAt) => webhookStatus(i18n, lastEventAt),
      requirementNote: i18n._(msg`Requires an active Plex Pass subscription.`),
      setupSteps: [
        i18n._(msg`Open Plex, go to Settings > Webhooks`),
        i18n._(msg`Click "Add Webhook" and paste the URL above`),
        i18n._(msg`Sofa will automatically log movies and episodes when you finish watching them`),
      ],
    },
    {
      provider: "jellyfin",
      label: "Jellyfin",
      icon: JellyfinIcon,
      type: "webhook",
      buildUrl: (token) => `${getServerUrl()}/api/webhooks/${token}`,
      urlLabel: i18n._(msg`Webhook URL`),
      connectedStatus: (lastEventAt) => webhookStatus(i18n, lastEventAt),
      setupSteps: [
        i18n._(msg`Install the Webhook plugin from Jellyfin's plugin catalog`),
        i18n._(msg`Go to Dashboard > Plugins > Webhook`),
        i18n._(msg`Add a "Generic Destination" and paste the URL above`),
        i18n._(msg`Enable the "Playback Stop" notification type`),
        i18n._(msg`Sofa will automatically log movies and episodes when you finish watching them`),
      ],
    },
    {
      provider: "emby",
      label: "Emby",
      icon: EmbyIcon,
      type: "webhook",
      buildUrl: (token) => `${getServerUrl()}/api/webhooks/${token}`,
      urlLabel: i18n._(msg`Webhook URL`),
      connectedStatus: (lastEventAt) => webhookStatus(i18n, lastEventAt),
      requirementNote: i18n._(
        msg`Requires Emby Server 4.7.9+ and an active Emby Premiere license.`,
      ),
      setupSteps: [
        i18n._(msg`Open Emby, go to Settings > Webhooks`),
        i18n._(msg`Add a new webhook and paste the URL above`),
        i18n._(msg`Enable the "Playback" event category`),
        i18n._(msg`Sofa will automatically log movies and episodes when you finish watching them`),
      ],
    },
    {
      provider: "sonarr",
      label: "Sonarr",
      icon: SonarrIcon,
      type: "list",
      buildUrl: (token) => `${getServerUrl()}/api/lists/${token}`,
      urlLabel: i18n._(msg`Sonarr List URL`),
      connectedStatus: (lastEventAt) => listStatus(i18n, lastEventAt),
      setupSteps: [
        i18n._(msg`Open Sonarr, go to Settings > Import Lists`),
        i18n._(msg`Click "+" and select "Custom Lists"`),
        i18n._(msg`Paste the Sonarr URL above into the List URL field`),
        i18n._(msg`Set your preferred quality profile and root folder`),
        i18n._(
          msg`Titles on your Sofa watchlist will be automatically added for download when Sonarr polls this list (every 6 hours by default)`,
        ),
      ],
    },
    {
      provider: "radarr",
      label: "Radarr",
      icon: RadarrIcon,
      type: "list",
      buildUrl: (token) => `${getServerUrl()}/api/lists/${token}`,
      urlLabel: i18n._(msg`Radarr List URL`),
      connectedStatus: (lastEventAt) => listStatus(i18n, lastEventAt),
      setupSteps: [
        i18n._(msg`Open Radarr, go to Settings > Import Lists`),
        i18n._(msg`Click "+" and select "Custom Lists"`),
        i18n._(msg`Paste the Radarr URL above into the List URL field`),
        i18n._(msg`Set your preferred quality profile and root folder`),
        i18n._(
          msg`Titles on your Sofa watchlist will be automatically added for download when Radarr polls this list (every 12 hours by default)`,
        ),
      ],
    },
  ];
}
