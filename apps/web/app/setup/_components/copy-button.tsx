"use client";

import { IconCheck, IconCopy } from "@tabler/icons-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function CopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleCopy}
      className="text-[11px] text-muted-foreground"
    >
      {copied ? (
        <>
          <IconCheck aria-hidden={true} className="size-3 text-green-400" />
          Copied
        </>
      ) : (
        <>
          <IconCopy aria-hidden={true} className="size-3" />
          Copy
        </>
      )}
    </Button>
  );
}
