"use client";

import {
  IconBook2,
  IconCheck,
  IconChevronDown,
  IconCopy,
  IconExternalLink,
  IconRefresh,
  IconTrash,
} from "@tabler/icons-react";
import { formatDistanceToNow } from "date-fns";
import { AnimatePresence, motion } from "motion/react";
import type { ComponentType, ReactNode } from "react";
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
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useConnectionActions } from "@/lib/atoms/integrations";

// ─── Types ──────────────────────────────────────────────────────────

export interface IntegrationConnection {
  id: string;
  provider: string;
  type: "webhook" | "list";
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

export interface IntegrationConfig {
  provider: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  /** Build the URL from the connection token. */
  buildUrl: (token: string) => string;
  /** Label shown above the URL input. */
  urlLabel: string;
  /** One-line status shown below the title when connected. */
  connectedStatus: (lastEventAt: string | null) => string;
  /** Optional alert banner shown at the top of the expanded card. */
  alert?: ReactNode;
  /** Setup instruction steps (rendered inside an <ol>). */
  setupSteps: ReactNode;
  /** Optional docs link shown after setup steps. */
  docsUrl?: string;
}

// ─── Component ──────────────────────────────────────────────────────

export function IntegrationCard({ config }: { config: IntegrationConfig }) {
  const { connection, handleConnect, handleDelete, handleRegenerateToken } =
    useConnectionActions(config.provider, config.label);
  const [connecting, setConnecting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [cardOpen, setCardOpen] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);

  const Icon = config.icon;

  const url =
    connection && typeof window !== "undefined"
      ? config.buildUrl(connection.token)
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
    if (!url) return;
    await navigator.clipboard.writeText(url);
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
                <CardTitle>{config.label}</CardTitle>
                <CardDescription>
                  {connection
                    ? config.connectedStatus(connection.lastEventAt)
                    : "Not configured"}
                </CardDescription>
              </div>
            </div>
            <IconChevronDown
              aria-hidden={true}
              className={`size-4 text-muted-foreground transition-transform duration-200 ${cardOpen ? "rotate-180" : ""}`}
            />
          </CollapsibleTrigger>
        </CardContent>

        <CollapsibleContent className="h-[var(--collapsible-panel-height)] overflow-hidden transition-[height] duration-200 ease-out data-[ending-style]:h-0 data-[starting-style]:h-0">
          <CardContent className="space-y-3 border-t border-border/30 pt-4">
            {config.alert}

            {!connection ? (
              <Button
                onClick={onConnect}
                disabled={connecting}
                size="lg"
                className="w-full"
              >
                {connecting ? "Connecting\u2026" : `Connect ${config.label}`}
              </Button>
            ) : (
              <AnimatePresence>
                {url && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-3 overflow-hidden"
                  >
                    <div>
                      <Label
                        htmlFor={`${config.provider}-url`}
                        className="mb-1 text-muted-foreground"
                      >
                        {config.urlLabel}
                      </Label>
                      <InputGroup>
                        <InputGroupInput
                          id={`${config.provider}-url`}
                          readOnly
                          value={url}
                          className="font-mono text-[10px] text-muted-foreground"
                        />
                        <InputGroupAddon align="inline-end">
                          <Tooltip>
                            <TooltipTrigger
                              render={
                                <InputGroupButton
                                  size="icon-xs"
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
                        </InputGroupAddon>
                      </InputGroup>
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
                  aria-hidden={true}
                  className={`size-3 transition-transform ${setupOpen ? "rotate-0" : "-rotate-90"}`}
                />
                Setup instructions
              </CollapsibleTrigger>
              <CollapsibleContent className="h-[var(--collapsible-panel-height)] overflow-hidden transition-[height] duration-200 ease-out data-[ending-style]:h-0 data-[starting-style]:h-0">
                <div className="mt-2 rounded-lg bg-muted/30 border border-border/50 p-3 text-xs leading-relaxed text-muted-foreground">
                  <ol className="list-inside list-decimal space-y-1.5">
                    {config.setupSteps}
                  </ol>
                  {config.docsUrl && (
                    <p className="mt-2 -ml-0.5">
                      <IconBook2
                        aria-hidden={true}
                        className="inline-block size-3 translate-y-[-1px] mr-1"
                      />
                      Need more help?{" "}
                      <a
                        href={config.docsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-0.5 font-medium text-foreground underline-offset-2 hover:underline"
                      >
                        Open docs{" "}
                        <IconExternalLink
                          aria-hidden={true}
                          className="inline-block size-3 translate-y-[-1px]"
                        />
                      </a>
                    </p>
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

// ─── Helpers for config authoring ───────────────────────────────────

/** Status line for webhook integrations (shows last event time). */
export function webhookStatus(lastEventAt: string | null): string {
  return lastEventAt
    ? `Last event ${formatDistanceToNow(new Date(lastEventAt), { addSuffix: true })}`
    : "Ready \u2014 nothing received yet";
}

/** Status line for list integrations (shows last event time). */
export function listStatus(lastEventAt: string | null): string {
  return lastEventAt
    ? `Last polled ${formatDistanceToNow(new Date(lastEventAt), { addSuffix: true })}`
    : "Ready \u2014 not polled yet";
}
