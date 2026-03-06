import { IconExternalLink, IconInfoCircle } from "@tabler/icons-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  EmbyIcon,
  JellyfinIcon,
  PlexIcon,
  RadarrIcon,
  SonarrIcon,
} from "./icons";
import type { IntegrationConfig } from "./integration-card";
import { listStatus, webhookStatus } from "./integration-card";

function origin() {
  return typeof window !== "undefined" ? window.location.origin : "";
}

/** Reusable alert banner for integrations that require a subscription. */
function RequirementAlert({ children }: { children: React.ReactNode }) {
  return (
    <Alert className="border-primary/20 bg-primary/5 [&>svg]:text-primary gap-0">
      <IconInfoCircle aria-hidden={true} className="inline-block size-3.5" />
      <AlertDescription className="text-foreground/80">
        {children}
      </AlertDescription>
    </Alert>
  );
}

export const INTEGRATION_CONFIGS: IntegrationConfig[] = [
  // ─── Webhook integrations ───────────────────────────────────────
  {
    provider: "plex",
    label: "Plex",
    icon: PlexIcon,
    buildUrl: (token) => `${origin()}/api/webhooks/${token}`,
    urlLabel: "Webhook URL",
    connectedStatus: webhookStatus,
    alert: (
      <RequirementAlert>
        Requires an active{" "}
        <a
          href="https://www.plex.tv/plex-pass/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-0.5 font-medium text-foreground underline-offset-2 hover:underline"
        >
          Plex Pass
          <IconExternalLink
            aria-hidden={true}
            className="inline-block size-3 translate-y-[-1px]"
          />
        </a>{" "}
        subscription.
      </RequirementAlert>
    ),
    setupSteps: (
      <>
        <li>
          Open Plex, go to{" "}
          <a
            href="https://app.plex.tv/desktop/#!/settings/webhooks"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-0.5 font-medium text-foreground underline-offset-2 hover:underline"
          >
            Settings &gt; Webhooks
            <IconExternalLink
              aria-hidden={true}
              className="inline-block size-3 translate-y-[-1px]"
            />
          </a>
        </li>
        <li>
          Click <span className="font-medium text-foreground">Add Webhook</span>{" "}
          and paste the URL above
        </li>
        <li>
          Sofa will automatically log movies and episodes when you finish
          watching them
        </li>
      </>
    ),
    docsUrl: "https://support.plex.tv/hc/en-us/articles/115002267687-Webhooks/",
  },
  {
    provider: "jellyfin",
    label: "Jellyfin",
    icon: JellyfinIcon,
    buildUrl: (token) => `${origin()}/api/webhooks/${token}`,
    urlLabel: "Webhook URL",
    connectedStatus: webhookStatus,
    setupSteps: (
      <>
        <li>
          Install the{" "}
          <a
            href="https://github.com/jellyfin/jellyfin-plugin-webhook/tree/master"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-0.5 font-medium text-foreground underline-offset-2 hover:underline"
          >
            Webhook plugin
            <IconExternalLink
              aria-hidden={true}
              className="inline-block size-3 translate-y-[-1px]"
            />
          </a>{" "}
          from Jellyfin&apos;s plugin catalog
        </li>
        <li>
          Go to{" "}
          <span className="font-medium text-foreground">
            Dashboard &gt; Plugins &gt; Webhook
          </span>
        </li>
        <li>
          Add a{" "}
          <span className="font-medium text-foreground">
            Generic Destination
          </span>{" "}
          and paste the URL above
        </li>
        <li>
          Enable the{" "}
          <span className="font-medium text-foreground">Playback Stop</span>{" "}
          notification type
        </li>
        <li>
          Sofa will automatically log movies and episodes when you finish
          watching them
        </li>
      </>
    ),
    docsUrl: "https://jellyfin.org/docs/general/server/notifications/",
  },
  {
    provider: "emby",
    label: "Emby",
    icon: EmbyIcon,
    buildUrl: (token) => `${origin()}/api/webhooks/${token}`,
    urlLabel: "Webhook URL",
    connectedStatus: webhookStatus,
    alert: (
      <RequirementAlert>
        Requires{" "}
        <span className="font-medium text-foreground">Emby Server 4.7.9+</span>{" "}
        and an active{" "}
        <a
          href="https://emby.media/premiere.html"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-0.5 font-medium text-foreground underline-offset-2 hover:underline"
        >
          Emby Premiere
          <IconExternalLink
            aria-hidden={true}
            className="inline-block size-3 translate-y-[-1px]"
          />
        </a>{" "}
        license.
      </RequirementAlert>
    ),
    setupSteps: (
      <>
        <li>
          Open Emby, go to{" "}
          <span className="font-medium text-foreground">
            Settings &gt; Webhooks
          </span>
        </li>
        <li>Add a new webhook and paste the URL above</li>
        <li>
          Enable the{" "}
          <span className="font-medium text-foreground">Playback</span> event
          category
        </li>
        <li>
          Sofa will automatically log movies and episodes when you finish
          watching them
        </li>
      </>
    ),
    docsUrl: "https://emby.media/support/articles/Webhooks.html",
  },

  // ─── List integrations ──────────────────────────────────────────
  {
    provider: "sonarr",
    label: "Sonarr",
    icon: SonarrIcon,
    buildUrl: (token) => `${origin()}/api/lists/${token}`,
    urlLabel: "Sonarr List URL",
    connectedStatus: listStatus,
    setupSteps: (
      <>
        <li>
          Open Sonarr, go to{" "}
          <span className="font-medium text-foreground">
            Settings &gt; Import Lists
          </span>
        </li>
        <li>
          Click <span className="font-medium text-foreground">+</span> and
          select{" "}
          <span className="font-medium text-foreground">Custom Lists</span>
        </li>
        <li>Paste the Sonarr URL above into the List URL field</li>
        <li>Set your preferred quality profile and root folder</li>
        <li>
          Titles on your Sofa watchlist will be automatically added for download
          when Sonarr polls this list (every 6 hours by default)
        </li>
      </>
    ),
    docsUrl: "https://wiki.servarr.com/sonarr/settings#import-lists",
  },
  {
    provider: "radarr",
    label: "Radarr",
    icon: RadarrIcon,
    buildUrl: (token) => `${origin()}/api/lists/${token}`,
    urlLabel: "Radarr List URL",
    connectedStatus: listStatus,
    setupSteps: (
      <>
        <li>
          Open Radarr, go to{" "}
          <span className="font-medium text-foreground">
            Settings &gt; Import Lists
          </span>
        </li>
        <li>
          Click <span className="font-medium text-foreground">+</span> and
          select{" "}
          <span className="font-medium text-foreground">Custom Lists</span>
        </li>
        <li>Paste the Radarr URL above into the List URL field</li>
        <li>Set your preferred quality profile and root folder</li>
        <li>
          Titles on your Sofa watchlist will be automatically added for download
          when Radarr polls this list (every 12 hours by default)
        </li>
      </>
    ),
    docsUrl: "https://wiki.servarr.com/radarr/settings#import-lists",
  },
];
