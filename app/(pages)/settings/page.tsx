"use client";

import {
  IconCheck,
  IconChevronDown,
  IconCopy,
  IconInfoCircle,
  IconLogout,
  IconRefresh,
  IconSettings,
  IconShieldLock,
  IconTrash,
  IconUser,
  IconUserPlus,
  IconWebhook,
} from "@tabler/icons-react";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { JellyfinIcon, PlexIcon } from "@/components/icons/media-servers";
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
import { signOut, useSession } from "@/lib/auth/client";

const sectionVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 200, damping: 24 },
  },
};

interface WebhookConnection {
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

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function WebhookCard({
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
        <CardContent>
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
                      ? `Last event ${timeAgo(connection.lastEventAt)}`
                      : "Connected — no events yet"
                    : "Not configured"}
                </CardDescription>
              </div>
            </div>
            <IconChevronDown
              size={16}
              className={`text-muted-foreground transition-transform duration-200 ${cardOpen ? "rotate-180" : ""}`}
            />
          </CollapsibleTrigger>
        </CardContent>

        <CollapsibleContent>
          <CardContent className="space-y-3 pt-0">
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
                <IconInfoCircle
                  size={14}
                  className="mt-0.5 shrink-0 text-primary"
                />
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Plex webhooks require an active{" "}
                  <span className="font-medium text-foreground">Plex Pass</span>{" "}
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
                            <IconCheck size={14} className="text-green-400" />
                          ) : (
                            <IconCopy size={14} />
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
                      <IconRefresh size={12} />
                      Regenerate URL
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => onDelete(provider)}
                    >
                      <IconTrash size={12} />
                      Disconnect
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <Collapsible open={setupOpen} onOpenChange={setSetupOpen}>
              <CollapsibleTrigger className="flex w-full items-center gap-1.5 rounded-md py-1 text-xs text-muted-foreground transition-colors hover:text-foreground">
                <IconChevronDown
                  size={12}
                  className={`transition-transform ${setupOpen ? "rotate-0" : "-rotate-90"}`}
                />
                Setup instructions
              </CollapsibleTrigger>
              <CollapsibleContent>
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

export default function SettingsPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [registrationOpen, setRegistrationOpen] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [webhookConnections, setWebhookConnections] = useState<
    WebhookConnection[]
  >([]);

  const isAdmin = session?.user?.role === "admin";

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/settings");
      if (res.ok) {
        const data = await res.json();
        setRegistrationOpen(data.registrationOpen);
      }
    } finally {
      setLoadingSettings(false);
    }
  }, []);

  const fetchWebhooks = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/webhooks");
      if (res.ok) {
        const data = await res.json();
        setWebhookConnections(data.connections);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (isPending) return;
    fetchWebhooks();
    if (session?.user?.role === "admin") {
      fetchSettings();
    } else {
      setLoadingSettings(false);
    }
  }, [session, isPending, fetchSettings, fetchWebhooks]);

  async function handleToggleRegistration(checked: boolean) {
    setToggling(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registrationOpen: checked }),
      });
      if (res.ok) {
        setRegistrationOpen(checked);
      }
    } finally {
      setToggling(false);
    }
  }

  async function handleSaveWebhook(
    provider: "plex" | "jellyfin",
    mediaServerUsername: string,
  ) {
    const res = await fetch("/api/settings/webhooks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, mediaServerUsername }),
    });
    if (res.ok) await fetchWebhooks();
  }

  async function handleDeleteWebhook(provider: "plex" | "jellyfin") {
    const res = await fetch("/api/settings/webhooks", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider }),
    });
    if (res.ok) await fetchWebhooks();
  }

  async function handleRegenerateToken(provider: "plex" | "jellyfin") {
    const res = await fetch("/api/settings/webhooks/regenerate-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider }),
    });
    if (res.ok) await fetchWebhooks();
  }

  async function handleToggleWebhook(
    provider: "plex" | "jellyfin",
    enabled: boolean,
  ) {
    await fetch("/api/settings/webhooks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider,
        mediaServerUsername:
          webhookConnections.find((c) => c.provider === provider)
            ?.mediaServerUsername ?? "",
        enabled,
      }),
    });
    await fetchWebhooks();
  }

  if (isPending || loadingSettings) {
    return <div className="min-h-[60vh]" />;
  }

  if (!session?.user) return null;

  const memberSince = new Date(session.user.createdAt).toLocaleDateString(
    undefined,
    { year: "numeric", month: "long" },
  );
  const initial = session.user.name?.charAt(0).toUpperCase() ?? "?";

  const plexConnection =
    webhookConnections.find((c) => c.provider === "plex") ?? null;
  const jellyfinConnection =
    webhookConnections.find((c) => c.provider === "jellyfin") ?? null;

  return (
    <motion.div
      className="mx-auto max-w-2xl space-y-8"
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: 0.15 } },
      }}
    >
      <motion.div variants={sectionVariants}>
        <div className="flex items-center gap-2">
          <IconSettings size={20} className="text-primary" />
          <h1 className="font-display text-3xl tracking-tight">Settings</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your account and preferences
        </p>
      </motion.div>

      {/* Account section */}
      <motion.div variants={sectionVariants}>
        <div className="mb-3 flex items-center gap-2">
          <IconUser size={16} className="text-muted-foreground" />
          <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Account
          </h2>
        </div>
        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 font-display text-lg text-primary">
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle>{session.user.name}</CardTitle>
              <CardDescription>{session.user.email}</CardDescription>
              <p className="mt-0.5 text-xs text-muted-foreground/60">
                Member since {memberSince}
              </p>
            </div>
          </CardContent>
          <CardContent className="pt-0">
            <button
              type="button"
              onClick={async () => {
                await signOut();
                router.push("/");
                router.refresh();
              }}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-border/50 px-4 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <IconLogout size={14} />
              Sign out
            </button>
          </CardContent>
        </Card>
      </motion.div>

      {/* Media Servers section */}
      <motion.div variants={sectionVariants}>
        <div className="mb-3 flex items-center gap-2">
          <IconWebhook size={16} className="text-muted-foreground" />
          <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Media Servers
          </h2>
        </div>
        <div className="space-y-3">
          <WebhookCard
            provider="plex"
            connection={plexConnection}
            onSave={handleSaveWebhook}
            onDelete={handleDeleteWebhook}
            onRegenerateToken={handleRegenerateToken}
            onToggle={handleToggleWebhook}
          />
          <WebhookCard
            provider="jellyfin"
            connection={jellyfinConnection}
            onSave={handleSaveWebhook}
            onDelete={handleDeleteWebhook}
            onRegenerateToken={handleRegenerateToken}
            onToggle={handleToggleWebhook}
          />
        </div>
      </motion.div>

      {/* Administration section — admin only */}
      {isAdmin && (
        <motion.div variants={sectionVariants}>
          <div className="mb-3 flex items-center gap-2">
            <IconShieldLock size={16} className="text-muted-foreground" />
            <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Administration
            </h2>
            <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
              Admin
            </span>
          </div>
          <Card className="border-l-2 border-l-primary/30">
            <CardContent>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <IconUserPlus size={16} className="text-primary" />
                  </div>
                  <div>
                    <CardTitle>Open registration</CardTitle>
                    <CardDescription>
                      Allow new users to create accounts. Useful for adding
                      household members.
                    </CardDescription>
                  </div>
                </div>
                <Switch
                  checked={registrationOpen}
                  onCheckedChange={handleToggleRegistration}
                  disabled={toggling}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
}
