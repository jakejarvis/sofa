"use client";

import {
  IconCamera,
  IconCheck,
  IconLogout,
  IconPencil,
  IconTrash,
  IconUser,
  IconX,
} from "@tabler/icons-react";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  removeAvatarAction,
  updateNameAction,
  uploadAvatarAction,
} from "@/lib/actions/settings";
import { signOut } from "@/lib/auth/client";

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
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [avatarUrl, setAvatarUrl] = useState(user.image);
  const [isHovered, setIsHovered] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Inline name editing
  const [isEditingName, setIsEditingName] = useState(false);
  const [displayName, setDisplayName] = useState(user.name);
  const [editValue, setEditValue] = useState(user.name);
  const [isNamePending, startNameTransition] = useTransition();
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditingName) {
      nameInputRef.current?.focus();
      nameInputRef.current?.select();
    }
  }, [isEditingName]);

  const memberSince = new Date(user.createdAt).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
  });
  const initial = displayName?.charAt(0).toUpperCase() ?? "?";

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    startTransition(async () => {
      try {
        const result = await uploadAvatarAction(formData);
        setAvatarUrl(result.imageUrl);
        toast.success("Profile picture updated");
        router.refresh();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Upload failed";
        toast.error(message);
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    });
  }

  function handleRemoveAvatar() {
    startTransition(async () => {
      try {
        await removeAvatarAction();
        setAvatarUrl(undefined);
        toast.success("Profile picture removed");
        router.refresh();
      } catch {
        toast.error("Failed to remove profile picture");
      }
    });
  }

  function handleNameSave() {
    const trimmed = editValue.trim();
    if (!trimmed || trimmed === displayName) {
      setEditValue(displayName);
      setIsEditingName(false);
      return;
    }

    startNameTransition(async () => {
      try {
        await updateNameAction(trimmed);
        setDisplayName(trimmed);
        setIsEditingName(false);
        toast.success("Name updated");
        router.refresh();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Update failed";
        toast.error(message);
      }
    });
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
        <IconUser aria-hidden={true} className="size-4 text-muted-foreground" />
        <h2 className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
          Account
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
                  onClick={
                    avatarUrl
                      ? handleRemoveAvatar
                      : () => fileInputRef.current?.click()
                  }
                  onMouseEnter={() => setIsHovered(true)}
                  onMouseLeave={() => setIsHovered(false)}
                  disabled={isPending}
                />
              }
              className="relative shrink-0 cursor-pointer rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              aria-label={
                avatarUrl ? "Remove profile picture" : "Upload profile picture"
              }
            >
              <Avatar className="size-12 overflow-hidden">
                {avatarUrl && !isPending && (
                  <AvatarImage src={avatarUrl} alt={displayName} />
                )}
                <AvatarFallback className="bg-primary/10 font-display text-lg text-primary">
                  {initial}
                </AvatarFallback>
              </Avatar>

              <AnimatePresence>
                {(isHovered || isPending) && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className={`absolute inset-0 flex items-center justify-center rounded-full text-foreground/70 backdrop-blur-sm ${
                      avatarUrl ? "bg-destructive/40" : "bg-black/50"
                    }`}
                  >
                    {isPending ? (
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
              {avatarUrl ? "Remove picture" : "Upload picture"}
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
                        className="invisible col-start-1 row-start-1 whitespace-pre font-medium text-sm"
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
                        className="col-start-1 row-start-1 min-w-4 border-0 border-primary/40 border-b border-dashed bg-transparent font-medium text-sm outline-none transition-colors focus:border-primary"
                      />
                    </div>
                    {isNamePending ? (
                      <Spinner className="size-3.5 shrink-0 text-muted-foreground" />
                    ) : (
                      <>
                        <button
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleNameSave();
                          }}
                          className="shrink-0 rounded-md p-0.5 text-muted-foreground transition-colors hover:text-primary"
                          aria-label="Save name"
                        >
                          <IconCheck className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleNameCancel();
                          }}
                          className="shrink-0 rounded-md p-0.5 text-muted-foreground transition-colors hover:text-destructive"
                          aria-label="Cancel editing"
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
                    className="group/name inline-flex items-center gap-1.5 rounded-md px-0 text-left transition-colors hover:text-primary"
                  >
                    {displayName}
                    <IconPencil className="size-3 text-transparent transition-colors group-hover/name:text-muted-foreground" />
                  </motion.button>
                )}
              </AnimatePresence>
            </CardTitle>
            <CardDescription>
              {user.email}
              {user.role === "admin" && (
                <Badge className="ml-1.5 rounded-md border-0 bg-primary/10 align-middle text-primary">
                  Admin
                </Badge>
              )}
            </CardDescription>
            <p className="mt-0.5 text-muted-foreground/60 text-xs">
              Member since {memberSince}
            </p>
          </div>

          <Button
            variant="destructive"
            onClick={async () => {
              await signOut();
              router.push("/");
              router.refresh();
            }}
          >
            <IconLogout aria-hidden={true} />
            Sign out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
