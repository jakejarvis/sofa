import { Trans } from "@lingui/react/macro";
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
      className="text-muted-foreground text-[11px]"
    >
      {copied ? (
        <>
          <IconCheck aria-hidden={true} className="size-3 text-green-400" />
          <Trans>Copied</Trans>
        </>
      ) : (
        <>
          <IconCopy aria-hidden={true} className="size-3" />
          <Trans>Copy</Trans>
        </>
      )}
    </Button>
  );
}
