"use client";

import {
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
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { JellyfinIcon, PlexIcon } from "./icons";

export interface WebhookConnection {
  id: string;
  provider: "plex" | "jellyfin";
  token: string;
  mediaServerUsername: string;
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
  connection,
  onSave,
  onDelete,
  onRegenerateToken,
  onToggle,
}: {
  provider: "plex" | "jellyfin";
  connection: WebhookConnection | null;
  onSave: (provider: "plex" | "jellyfin", username: string) => Promise<void>;
  onDelete: (provider: "plex" | "jellyfin") => Promise<void>;
  onRegenerateToken: (provider: "plex" | "jellyfin") => Promise<void>;
  onToggle: (provider: "plex" | "jellyfin", enabled: boolean) => Promise<void>;
}) {
  const [username, setUsername] = useState(
    connection?.mediaServerUsername ?? "",
  );
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  const [cardOpen, setCardOpen] = useState(false);

  const isPlex = provider === "plex";
  const label = isPlex ? "Plex" : "Jellyfin";
  const Icon = isPlex ? PlexIcon : JellyfinIcon;

  const webhookUrl = connection
    ? `${window.location.origin}/api/webhooks/${connection.token}`
    : null;

  async function handleSave() {
    if (!username.trim()) return;
    setSaving(true);
    try {
      await onSave(provider, username.trim());
    } finally {
      setSaving(false);
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
                      : "Connected — no events yet"
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
            {connection && (
              <div className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2">
                <span className="text-xs text-muted-foreground">
                  Webhook {connection.enabled ? "enabled" : "disabled"}
                </span>
                <Switch
                  checked={connection.enabled}
                  onCheckedChange={(checked) => onToggle(provider, checked)}
                />
              </div>
            )}

            {isPlex && (
              <div className="flex gap-2.5 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5">
                <IconInfoCircle className="mt-0.5 size-3.5 shrink-0 text-primary" />
                <p className="text-xs leading-relaxed text-foreground/80">
                  Plex webhooks require an active{" "}
                  <a
                    href="https://www.plex.tv/plex-pass/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-foreground inline-flex items-center gap-0.5 hover:underline underline-offset-2"
                  >
                    <span>Plex Pass</span>
                    <IconExternalLink className="size-3 inline-block translate-y-[-1px]" />
                  </a>{" "}
                  subscription.
                </p>
              </div>
            )}

            <div>
              <label
                htmlFor={`${provider}-username`}
                className="mb-1 block text-xs text-muted-foreground"
              >
                {label} username
              </label>
              <div className="flex gap-2">
                <Input
                  id={`${provider}-username`}
                  placeholder={`Your ${label} username`}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSave()}
                />
                {!connection ? (
                  <Button
                    onClick={handleSave}
                    disabled={saving || !username.trim()}
                  >
                    {saving ? "Saving..." : "Connect"}
                  </Button>
                ) : (
                  username.trim() !== connection.mediaServerUsername && (
                    <Button
                      onClick={handleSave}
                      disabled={saving || !username.trim()}
                      variant="outline"
                    >
                      Update
                    </Button>
                  )
                )}
              </div>
            </div>

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
                      onClick={() => onRegenerateToken(provider)}
                    >
                      <IconRefresh />
                      Regenerate URL
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => onDelete(provider)}
                    >
                      <IconTrash />
                      Disconnect
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <Collapsible open={setupOpen} onOpenChange={setSetupOpen}>
              <CollapsibleTrigger className="flex w-full items-center gap-1.5 rounded-md py-1 text-xs text-muted-foreground transition-colors hover:text-foreground">
                <IconChevronDown
                  className={`size-3 transition-transform ${setupOpen ? "rotate-0" : "-rotate-90"}`}
                />
                Setup instructions
              </CollapsibleTrigger>
              <CollapsibleContent className="h-[var(--collapsible-panel-height)] overflow-hidden transition-[height] duration-200 ease-out data-[ending-style]:h-0 data-[starting-style]:h-0">
                <div className="mt-2 rounded-lg bg-muted/30 p-3 text-xs leading-relaxed text-muted-foreground">
                  {isPlex ? (
                    <ol className="list-inside list-decimal space-y-1.5">
                      <li>
                        Open Plex, go to{" "}
                        <span className="font-medium text-foreground">
                          Settings &gt; Webhooks
                        </span>
                      </li>
                      <li>
                        Click{" "}
                        <span className="font-medium text-foreground">
                          Add Webhook
                        </span>{" "}
                        and paste the URL above
                      </li>
                      <li>
                        Sofa will automatically log movies and episodes when you
                        finish watching them
                      </li>
                      <li>
                        Make sure the username above matches your Plex account
                        name
                      </li>
                    </ol>
                  ) : (
                    <ol className="list-inside list-decimal space-y-1.5">
                      <li>
                        Install the{" "}
                        <span className="font-medium text-foreground">
                          Webhook plugin
                        </span>{" "}
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
                      <li>
                        Make sure the username above matches your Jellyfin
                        username
                      </li>
                    </ol>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
