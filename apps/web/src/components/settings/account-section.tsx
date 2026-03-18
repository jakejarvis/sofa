import { Trans, useLingui } from "@lingui/react/macro";
import {
  IconAlertTriangle,
  IconCamera,
  IconCheck,
  IconLockPassword,
  IconLogout,
  IconPencil,
  IconTrash,
  IconUser,
  IconX,
} from "@tabler/icons-react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate, useRouter } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { authClient, signOut } from "@/lib/auth/client";
import { getErrorMessage } from "@/lib/error-messages";
import { orpc } from "@/lib/orpc/client";
import { formatDate } from "@sofa/i18n/format";

export function AccountSection({
  user,
}: {
  user: {
    name: string;
    email: string;
    image?: string;
    createdAt: string;
    role?: string;
  };
}) {
  const { t } = useLingui();
  const navigate = useNavigate();
  const router = useRouter();
  const [avatarUrl, setAvatarUrl] = useState(user.image);
  const [isHovered, setIsHovered] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Inline name editing
  const [isEditingName, setIsEditingName] = useState(false);
  const [displayName, setDisplayName] = useState(user.name);
  const [editValue, setEditValue] = useState(user.name);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const updateNameMutation = useMutation(
    orpc.account.updateName.mutationOptions({
      onSuccess: () => {
        const trimmed = editValue.trim();
        setDisplayName(trimmed);
        setIsEditingName(false);
        toast.success(t`Name updated`);
        router.invalidate();
      },
      onError: (err) => {
        toast.error(getErrorMessage(err, t, t`Update failed`));
      },
    }),
  );
  const isNamePending = updateNameMutation.isPending;

  useEffect(() => {
    if (isEditingName) {
      nameInputRef.current?.focus();
      nameInputRef.current?.select();
    }
  }, [isEditingName]);

  const memberSince = formatDate(user.createdAt, {
    year: "numeric",
    month: "long",
    day: undefined,
  });
  const initial = displayName?.charAt(0).toUpperCase() ?? "?";

  const uploadAvatarMutation = useMutation(
    orpc.account.uploadAvatar.mutationOptions({
      onSuccess: (data) => {
        setAvatarUrl(data.imageUrl);
        toast.success(t`Profile picture updated`);
        router.invalidate();
      },
      onError: (err) => {
        toast.error(getErrorMessage(err, t, t`Upload failed`));
      },
      onSettled: () => {
        if (fileInputRef.current) fileInputRef.current.value = "";
      },
    }),
  );

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadAvatarMutation.mutate(file);
  }

  const removeAvatarMutation = useMutation(
    orpc.account.removeAvatar.mutationOptions({
      onSuccess: () => {
        setAvatarUrl(undefined);
        toast.success(t`Profile picture removed`);
        router.invalidate();
      },
      onError: () => {
        toast.error(t`Failed to remove profile picture`);
      },
    }),
  );
  const isAvatarPending = uploadAvatarMutation.isPending || removeAvatarMutation.isPending;

  function handleRemoveAvatar() {
    removeAvatarMutation.mutate();
  }

  function handleNameSave() {
    const trimmed = editValue.trim();
    if (!trimmed || trimmed === displayName) {
      setEditValue(displayName);
      setIsEditingName(false);
      return;
    }

    updateNameMutation.mutate({ name: trimmed });
  }

  function handleNameCancel() {
    setEditValue(displayName);
    setIsEditingName(false);
  }

  function handleNameKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleNameSave();
    } else if (e.key === "Escape") {
      handleNameCancel();
    }
  }

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <IconUser aria-hidden={true} className="text-muted-foreground size-4" />
        <h2 className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
          <Trans>Account</Trans>
        </h2>
      </div>
      <Card>
        <CardContent className="flex items-center gap-4">
          {/* Avatar: click to upload (no avatar) or remove (has avatar) */}
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  onClick={avatarUrl ? handleRemoveAvatar : () => fileInputRef.current?.click()}
                  onMouseEnter={() => setIsHovered(true)}
                  onMouseLeave={() => setIsHovered(false)}
                  disabled={isAvatarPending}
                />
              }
              className="focus-visible:ring-ring focus-visible:ring-offset-background relative shrink-0 cursor-pointer rounded-full focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
              aria-label={avatarUrl ? t`Remove profile picture` : t`Upload profile picture`}
            >
              <Avatar className="size-12 overflow-hidden">
                <AvatarImage src={isAvatarPending ? undefined : avatarUrl} alt={displayName} />
                <AvatarFallback className="bg-primary/10 font-display text-primary text-lg">
                  {initial}
                </AvatarFallback>
              </Avatar>

              <AnimatePresence>
                {(isHovered || isAvatarPending) && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className={`text-foreground/70 absolute inset-0 flex items-center justify-center rounded-full backdrop-blur-sm ${
                      avatarUrl && !isAvatarPending ? "bg-destructive/40" : "bg-black/50"
                    }`}
                  >
                    {isAvatarPending ? (
                      <Spinner className="size-4.5" />
                    ) : avatarUrl ? (
                      <IconTrash className="size-4.5" />
                    ) : (
                      <IconCamera className="size-4.5" />
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </TooltipTrigger>
            <TooltipContent>
              {avatarUrl ? <Trans>Remove picture</Trans> : <Trans>Upload picture</Trans>}
            </TooltipContent>
          </Tooltip>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={handleFileSelect}
          />

          <div className="min-w-0 flex-1">
            <CardTitle className="mb-0.5">
              <AnimatePresence mode="wait" initial={false}>
                {isEditingName ? (
                  <motion.div
                    key="editing"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.1 }}
                    className="flex items-center gap-1.5"
                  >
                    <div className="relative inline-grid items-center">
                      <span
                        className="invisible col-start-1 row-start-1 text-sm font-medium whitespace-pre"
                        aria-hidden="true"
                      >
                        {editValue || " "}
                      </span>
                      <input
                        ref={nameInputRef}
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={handleNameKeyDown}
                        onBlur={handleNameSave}
                        disabled={isNamePending}
                        maxLength={100}
                        className="border-primary/40 focus:border-primary col-start-1 row-start-1 min-w-4 border-0 border-b border-dashed bg-transparent text-sm font-medium transition-colors outline-none"
                      />
                    </div>
                    {isNamePending ? (
                      <Spinner className="text-muted-foreground size-3.5 shrink-0" />
                    ) : (
                      <>
                        <button
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleNameSave();
                          }}
                          className="text-muted-foreground hover:text-primary shrink-0 rounded-md p-0.5 transition-colors"
                          aria-label={t`Save name`}
                        >
                          <IconCheck className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleNameCancel();
                          }}
                          className="text-muted-foreground hover:text-destructive shrink-0 rounded-md p-0.5 transition-colors"
                          aria-label={t`Cancel editing`}
                        >
                          <IconX className="size-3.5" />
                        </button>
                      </>
                    )}
                  </motion.div>
                ) : (
                  <motion.button
                    key="display"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.1 }}
                    type="button"
                    onClick={() => setIsEditingName(true)}
                    className="group/name hover:text-primary inline-flex items-center gap-1.5 rounded-md px-0 text-left transition-colors"
                  >
                    {displayName}
                    <IconPencil className="group-hover/name:text-muted-foreground size-3 text-transparent transition-colors" />
                  </motion.button>
                )}
              </AnimatePresence>
            </CardTitle>
            <CardDescription>
              {user.email}
              {user.role === "admin" && (
                <Badge className="bg-primary/10 text-primary ml-1.5 rounded-md border-0 align-middle">
                  <Trans>Admin</Trans>
                </Badge>
              )}
            </CardDescription>
            <p className="text-muted-foreground/60 mt-0.5 text-xs">
              <Trans>Member since {memberSince}</Trans>
            </p>
          </div>

          <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center">
            <ChangePasswordDialog />
            <Button
              variant="destructive"
              onClick={async () => {
                await signOut();
                void navigate({ to: "/" });
              }}
            >
              <IconLogout aria-hidden={true} />
              <Trans>Sign out</Trans>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ChangePasswordDialog() {
  const { t } = useLingui();
  const [open, setOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [revokeOtherSessions, setRevokeOtherSessions] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function resetForm() {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setRevokeOtherSessions(false);
    setError("");
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) resetForm();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!currentPassword) {
      setError(t`Current password is required`);
      return;
    }
    if (newPassword.length < 8) {
      setError(t`New password must be at least 8 characters`);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t`Passwords do not match`);
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions,
      });
      if (result.error) {
        setError(t`Failed to change password`);
        return;
      }
      toast.success(t`Password updated`);
      handleOpenChange(false);
    } catch {
      setError(t`Something went wrong`);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <IconLockPassword aria-hidden={true} />
        <Trans>Change password</Trans>
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            <Trans>Change password</Trans>
          </DialogTitle>
          <DialogDescription>
            <Trans>Enter your current password and choose a new one.</Trans>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-3">
          {error && (
            <Alert variant="destructive">
              <IconAlertTriangle />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-1.5">
            <Label htmlFor="current-password">
              <Trans>Current password</Trans>
            </Label>
            <Input
              id="current-password"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="new-password">
              <Trans>New password</Trans>
            </Label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="confirm-password">
              <Trans>Confirm new password</Trans>
            </Label>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <Checkbox
              id="revoke-sessions"
              checked={revokeOtherSessions}
              onCheckedChange={(checked) => setRevokeOtherSessions(checked === true)}
              disabled={isSubmitting}
            />
            <Label htmlFor="revoke-sessions" className="cursor-pointer">
              <Trans>Sign out of other sessions</Trans>
            </Label>
          </div>

          <DialogFooter className="pt-2">
            <DialogClose render={<Button variant="outline" />}>
              <Trans>Cancel</Trans>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Spinner className="size-3.5" />}
              <Trans>Update password</Trans>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
