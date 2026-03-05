"use client";

import {
  IconBook2,
  IconCheck,
  IconChevronDown,
  IconCopy,
  IconExternalLink,
  IconInfoCircle,
  IconRefresh,
  IconTrash,
} from "@tabler/icons-react";
import { formatDistanceToNow } from "date-fns";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useConnectionActions } from "@/lib/atoms/integrations";
import { EmbyIcon, JellyfinIcon, PlexIcon } from "./icons";

export interface WebhookConnection {
  id: string;
  provider: "plex" | "jellyfin" | "emby";
  token: string;
  enabled: boolean;
  lastEventAt: string | null;
  recentEvents: {
    id: string;
    eventType: string | null;
    mediaType: string | null;
    mediaTitle: string | null;
    status: "success" | "ignored" | "error";
    receivedAt: string;
  }[];
}

export function WebhookCard({
  provider,
}: {
  provider: "plex" | "jellyfin" | "emby";
}) {
  const { connection, handleConnect, handleDelete, handleRegenerateToken } =
    useConnectionActions(provider);
  const [connecting, setConnecting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  const [cardOpen, setCardOpen] = useState(false);

  const isPlex = provider === "plex";
  const isEmby = provider === "emby";
  const label = isPlex ? "Plex" : isEmby ? "Emby" : "Jellyfin";
  const Icon = isPlex ? PlexIcon : isEmby ? EmbyIcon : JellyfinIcon;

  const webhookUrl = connection
    ? `${window.location.origin}/api/webhooks/${connection.token}`
    : null;

  async function onConnect() {
    setConnecting(true);
    try {
      await handleConnect();
    } finally {
      setConnecting(false);
    }
  }

  async function handleCopy() {
    if (!webhookUrl) return;
    await navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Card>
      <Collapsible open={cardOpen} onOpenChange={setCardOpen}>
        <CardContent className={cardOpen ? "pb-4" : ""}>
          <CollapsibleTrigger className="flex w-full cursor-pointer items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Icon className="size-4 text-primary" />
              </div>
              <div className="text-left">
                <CardTitle>{label}</CardTitle>
                <CardDescription>
                  {connection
                    ? connection.lastEventAt
                      ? `Last event ${formatDistanceToNow(new Date(connection.lastEventAt), { addSuffix: true })}`
                      : "Ready — no events yet"
                    : "Not configured"}
                </CardDescription>
              </div>
            </div>
            <IconChevronDown
              className={`size-4 text-muted-foreground transition-transform duration-200 ${cardOpen ? "rotate-180" : ""}`}
            />
          </CollapsibleTrigger>
        </CardContent>

        <CollapsibleContent className="h-[var(--collapsible-panel-height)] overflow-hidden transition-[height] duration-200 ease-out data-[ending-style]:h-0 data-[starting-style]:h-0">
          <CardContent className="space-y-3 border-t border-border/30 pt-4">
            {isPlex && (
              <div className="flex gap-2.5 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5">
                <IconInfoCircle className="mt-0.5 size-3.5 shrink-0 text-primary" />
                <p className="text-xs leading-relaxed text-foreground/80">
                  Requires an active{" "}
                  <a
                    href="https://www.plex.tv/plex-pass/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-0.5 font-medium text-foreground underline-offset-2 hover:underline"
                  >
                    <span>Plex Pass</span>
                    <IconExternalLink className="inline-block size-3 translate-y-[-1px]" />
                  </a>{" "}
                  subscription.
                </p>
              </div>
            )}

            {isEmby && (
              <div className="flex gap-2.5 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5">
                <IconInfoCircle className="mt-0.5 size-3.5 shrink-0 text-primary" />
                <p className="text-xs leading-relaxed text-foreground/80">
                  Requires{" "}
                  <span className="font-medium text-foreground">
                    Emby Server 4.7.9+
                  </span>{" "}
                  and an active{" "}
                  <a
                    href="https://emby.media/premiere.html"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-0.5 font-medium text-foreground underline-offset-2 hover:underline"
                  >
                    <span>Emby Premiere</span>
                    <IconExternalLink className="inline-block size-3 translate-y-[-1px]" />
                  </a>{" "}
                  license.
                </p>
              </div>
            )}

            {!connection ? (
              <Button
                onClick={onConnect}
                disabled={connecting}
                size="lg"
                className="w-full"
              >
                {connecting ? "Connecting..." : `Connect ${label}`}
              </Button>
            ) : (
              <AnimatePresence>
                {webhookUrl && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-3 overflow-hidden"
                  >
                    <div>
                      <label
                        htmlFor={`${provider}-webhook-url`}
                        className="mb-1 block text-xs text-muted-foreground"
                      >
                        Webhook URL
                      </label>
                      <div className="flex gap-2">
                        <Input
                          id={`${provider}-webhook-url`}
                          readOnly
                          value={webhookUrl}
                          className="font-mono text-[10px] text-muted-foreground"
                        />
                        <Tooltip>
                          <TooltipTrigger
                            render={
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={handleCopy}
                              />
                            }
                          >
                            {copied ? (
                              <IconCheck className="text-green-400" />
                            ) : (
                              <IconCopy />
                            )}
                          </TooltipTrigger>
                          <TooltipContent>Copy URL</TooltipContent>
                        </Tooltip>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRegenerateToken()}
                      >
                        <IconRefresh />
                        Regenerate URL
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete()}
                      >
                        <IconTrash />
                        Disconnect
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            )}

            <Collapsible open={setupOpen} onOpenChange={setSetupOpen}>
              <CollapsibleTrigger className="flex w-full items-center gap-1.5 rounded-md py-1 text-xs text-muted-foreground transition-colors hover:text-foreground">
                <IconChevronDown
                  className={`size-3 transition-transform ${setupOpen ? "rotate-0" : "-rotate-90"}`}
                />
                Setup instructions
              </CollapsibleTrigger>
              <CollapsibleContent className="h-[var(--collapsible-panel-height)] overflow-hidden transition-[height] duration-200 ease-out data-[ending-style]:h-0 data-[starting-style]:h-0">
                <div className="mt-2 rounded-lg bg-muted/30 border border-border/50 p-3 text-xs leading-relaxed text-muted-foreground">
                  <ol className="list-inside list-decimal space-y-1.5">
                    {isPlex ? (
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
                            <IconExternalLink className="inline-block size-3 translate-y-[-1px]" />
                          </a>
                        </li>
                        <li>
                          Click{" "}
                          <span className="font-medium text-foreground">
                            Add Webhook
                          </span>{" "}
                          and paste the URL above
                        </li>
                      </>
                    ) : isEmby ? (
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
                          <span className="font-medium text-foreground">
                            Playback
                          </span>{" "}
                          event category
                        </li>
                      </>
                    ) : (
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
                            <IconExternalLink className="inline-block size-3 translate-y-[-1px]" />
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
                          <span className="font-medium text-foreground">
                            Playback Stop
                          </span>{" "}
                          notification type
                        </li>
                      </>
                    )}
                    <li>
                      Sofa will automatically log movies and episodes when you
                      finish watching them
                    </li>
                  </ol>
                  <p className="mt-2 -ml-0.5">
                    <IconBook2 className="inline-block size-3 translate-y-[-1px] mr-1" />
                    Need more help?{" "}
                    <a
                      href={
                        isPlex
                          ? "https://support.plex.tv/hc/en-us/articles/115002267687-Webhooks/"
                          : isEmby
                            ? "https://emby.media/support/articles/Webhooks.html"
                            : "https://jellyfin.org/docs/general/server/notifications/"
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-0.5 font-medium text-foreground underline-offset-2 hover:underline"
                    >
                      Open docs{" "}
                      <IconExternalLink className="inline-block size-3 translate-y-[-1px]" />
                    </a>
                  </p>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
