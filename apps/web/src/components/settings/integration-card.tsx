import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import {
  IconBook2,
  IconCheck,
  IconChevronDown,
  IconCopy,
  IconExternalLink,
  IconRefresh,
  IconTrash,
} from "@tabler/icons-react";
import { useMutation } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import type { ComponentType, ReactNode } from "react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { orpc } from "@/lib/orpc/client";
import { i18n } from "@sofa/i18n";
import { formatRelativeTime } from "@sofa/i18n/format";

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

export function IntegrationCard({
  config,
  connection,
  setConnections,
}: {
  config: IntegrationConfig;
  connection: IntegrationConnection | null;
  setConnections: React.Dispatch<React.SetStateAction<IntegrationConnection[]>>;
}) {
  const { t } = useLingui();
  const { provider, label } = config;
  const providerInput = provider as "plex" | "jellyfin" | "emby" | "sonarr" | "radarr";

  const connectMutation = useMutation(
    orpc.integrations.create.mutationOptions({
      onSuccess: (result) => {
        setConnections((prev) => [...prev, { ...result, recentEvents: [] }]);
        toast.success(t`${label} connected`);
      },
      onError: () => toast.error(t`Failed to connect ${label}`),
    }),
  );

  const deleteMutation = useMutation(
    orpc.integrations.delete.mutationOptions({
      onMutate: () => {
        let previous: IntegrationConnection[] = [];
        setConnections((prev) => {
          previous = prev;
          return prev.filter((c) => c.provider !== provider);
        });
        return { previous };
      },
      onSuccess: () => toast.success(t`${label} disconnected`),
      onError: (_, __, ctx) => {
        if (ctx?.previous) setConnections(ctx.previous);
        toast.error(t`Failed to disconnect ${label}`);
      },
    }),
  );

  const regenerateTokenMutation = useMutation(
    orpc.integrations.regenerateToken.mutationOptions({
      onSuccess: (result) => {
        setConnections((prev) =>
          prev.map((c) => (c.provider === provider ? { ...c, token: result.token } : c)),
        );
        toast.success(t`${label} URL regenerated`);
      },
      onError: () => toast.error(t`Failed to regenerate ${label} URL`),
    }),
  );
  const [copied, setCopied] = useState(false);
  const [cardOpen, setCardOpen] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);

  const Icon = config.icon;
  const connecting = connectMutation.isPending;

  const url =
    connection && typeof window !== "undefined" ? config.buildUrl(connection.token) : null;

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
              <div className="bg-primary/10 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
                <Icon className="text-primary size-4" />
              </div>
              <div className="text-start">
                <CardTitle>{config.label}</CardTitle>
                <CardDescription>
                  {connection ? config.connectedStatus(connection.lastEventAt) : t`Not configured`}
                </CardDescription>
              </div>
            </div>
            <IconChevronDown
              aria-hidden={true}
              className={`text-muted-foreground size-4 transition-transform duration-200 ${cardOpen ? "rotate-180" : ""}`}
            />
          </CollapsibleTrigger>
        </CardContent>

        <CollapsibleContent className="h-[var(--collapsible-panel-height)] overflow-hidden transition-[height] duration-200 ease-out data-[ending-style]:h-0 data-[starting-style]:h-0">
          <CardContent className="border-border/30 space-y-3 border-t pt-4">
            {config.alert}

            {!connection ? (
              <Button
                onClick={() => connectMutation.mutate({ provider: providerInput })}
                disabled={connecting}
                size="lg"
                className="w-full"
              >
                {connecting ? <Trans>Connecting...</Trans> : <Trans>Connect {label}</Trans>}
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
                        className="text-muted-foreground mb-1"
                      >
                        {config.urlLabel}
                      </Label>
                      <InputGroup>
                        <InputGroupInput
                          id={`${config.provider}-url`}
                          readOnly
                          value={url}
                          className="text-muted-foreground font-mono text-[10px]"
                        />
                        <InputGroupAddon align="inline-end">
                          <Tooltip>
                            <TooltipTrigger
                              render={<InputGroupButton size="icon-xs" onClick={handleCopy} />}
                            >
                              {copied ? <IconCheck className="text-green-400" /> : <IconCopy />}
                            </TooltipTrigger>
                            <TooltipContent>
                              <Trans>Copy URL</Trans>
                            </TooltipContent>
                          </Tooltip>
                        </InputGroupAddon>
                      </InputGroup>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          regenerateTokenMutation.mutate({
                            provider: providerInput,
                          })
                        }
                      >
                        <IconRefresh />
                        <Trans>Regenerate URL</Trans>
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteMutation.mutate({ provider: providerInput })}
                      >
                        <IconTrash />
                        <Trans>Disconnect</Trans>
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            )}

            <Collapsible open={setupOpen} onOpenChange={setSetupOpen}>
              <CollapsibleTrigger className="text-muted-foreground hover:text-foreground flex w-full items-center gap-1.5 rounded-md py-1 text-xs transition-colors">
                <IconChevronDown
                  aria-hidden={true}
                  className={`size-3 transition-transform ${setupOpen ? "rotate-0" : "-rotate-90"}`}
                />
                <Trans>Setup instructions</Trans>
              </CollapsibleTrigger>
              <CollapsibleContent className="h-[var(--collapsible-panel-height)] overflow-hidden transition-[height] duration-200 ease-out data-[ending-style]:h-0 data-[starting-style]:h-0">
                <div className="border-border/50 bg-muted/30 text-muted-foreground mt-2 rounded-lg border p-3 text-xs leading-relaxed">
                  <ol className="list-inside list-decimal space-y-1.5">{config.setupSteps}</ol>
                  {config.docsUrl && (
                    <p className="-ms-0.5 mt-2">
                      <IconBook2
                        aria-hidden={true}
                        className="me-1 inline-block size-3 translate-y-[-1px]"
                      />
                      <Trans>Need more help?</Trans>{" "}
                      <a
                        href={config.docsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-foreground inline-flex items-center gap-0.5 font-medium underline-offset-2 hover:underline"
                      >
                        <Trans>Open docs</Trans>{" "}
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
  if (lastEventAt) {
    const relativeTime = formatRelativeTime(lastEventAt);
    return i18n._(msg`Last event ${relativeTime}`);
  }
  return i18n._(msg`Ready — nothing received yet`);
}

/** Status line for list integrations (shows last event time). */
export function listStatus(lastEventAt: string | null): string {
  if (lastEventAt) {
    const relativeTime = formatRelativeTime(lastEventAt);
    return i18n._(msg`Last polled ${relativeTime}`);
  }
  return i18n._(msg`Ready — not polled yet`);
}
