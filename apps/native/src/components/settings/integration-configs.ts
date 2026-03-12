import type { SvgProps } from "react-native-svg";
import {
  EmbyIcon,
  JellyfinIcon,
  PlexIcon,
  RadarrIcon,
  SonarrIcon,
} from "@/components/settings/icons";
import { getServerUrl } from "@/lib/server-url";
import { timeAgo } from "@/utils/time-ago";

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

function webhookStatus(lastEventAt: string | null): string {
  return lastEventAt
    ? `Last event ${timeAgo(lastEventAt)}`
    : "Ready — nothing received yet";
}

function listStatus(lastEventAt: string | null): string {
  return lastEventAt
    ? `Last polled ${timeAgo(lastEventAt)}`
    : "Ready — not polled yet";
}

export const INTEGRATION_CONFIGS: IntegrationConfig[] = [
  {
    provider: "plex",
    label: "Plex",
    icon: PlexIcon,
    type: "webhook",
    buildUrl: (token) => `${getServerUrl()}/api/webhooks/${token}`,
    urlLabel: "Webhook URL",
    connectedStatus: webhookStatus,
    requirementNote: "Requires an active Plex Pass subscription.",
    setupSteps: [
      "Open Plex, go to Settings > Webhooks",
      'Click "Add Webhook" and paste the URL above',
      "Sofa will automatically log movies and episodes when you finish watching them",
    ],
  },
  {
    provider: "jellyfin",
    label: "Jellyfin",
    icon: JellyfinIcon,
    type: "webhook",
    buildUrl: (token) => `${getServerUrl()}/api/webhooks/${token}`,
    urlLabel: "Webhook URL",
    connectedStatus: webhookStatus,
    setupSteps: [
      "Install the Webhook plugin from Jellyfin's plugin catalog",
      "Go to Dashboard > Plugins > Webhook",
      'Add a "Generic Destination" and paste the URL above',
      'Enable the "Playback Stop" notification type',
      "Sofa will automatically log movies and episodes when you finish watching them",
    ],
  },
  {
    provider: "emby",
    label: "Emby",
    icon: EmbyIcon,
    type: "webhook",
    buildUrl: (token) => `${getServerUrl()}/api/webhooks/${token}`,
    urlLabel: "Webhook URL",
    connectedStatus: webhookStatus,
    requirementNote:
      "Requires Emby Server 4.7.9+ and an active Emby Premiere license.",
    setupSteps: [
      "Open Emby, go to Settings > Webhooks",
      "Add a new webhook and paste the URL above",
      'Enable the "Playback" event category',
      "Sofa will automatically log movies and episodes when you finish watching them",
    ],
  },
  {
    provider: "sonarr",
    label: "Sonarr",
    icon: SonarrIcon,
    type: "list",
    buildUrl: (token) => `${getServerUrl()}/api/lists/${token}`,
    urlLabel: "Sonarr List URL",
    connectedStatus: listStatus,
    setupSteps: [
      "Open Sonarr, go to Settings > Import Lists",
      'Click "+" and select "Custom Lists"',
      "Paste the Sonarr URL above into the List URL field",
      "Set your preferred quality profile and root folder",
      "Titles on your Sofa watchlist will be automatically added for download when Sonarr polls this list (every 6 hours by default)",
    ],
  },
  {
    provider: "radarr",
    label: "Radarr",
    icon: RadarrIcon,
    type: "list",
    buildUrl: (token) => `${getServerUrl()}/api/lists/${token}`,
    urlLabel: "Radarr List URL",
    connectedStatus: listStatus,
    setupSteps: [
      "Open Radarr, go to Settings > Import Lists",
      'Click "+" and select "Custom Lists"',
      "Paste the Radarr URL above into the List URL field",
      "Set your preferred quality profile and root folder",
      "Titles on your Sofa watchlist will be automatically added for download when Radarr polls this list (every 12 hours by default)",
    ],
  },
];
