import { Trans, useLingui } from "@lingui/react/macro";
import { IconCheck, IconChevronDown, IconLanguage } from "@tabler/icons-react";
import { useState } from "react";

import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { setPersistedLocale } from "@/lib/i18n";
import { activateLocale, type SupportedLocale } from "@sofa/i18n";
import { LOCALE_INFO } from "@sofa/i18n/locales";

export function LanguageSection() {
  const { t, i18n } = useLingui();
  const currentLocale = i18n.locale;
  const [open, setOpen] = useState(false);

  const currentInfo = LOCALE_INFO.find((l) => l.code === currentLocale);

  async function handleLocaleChange(locale: SupportedLocale) {
    await activateLocale(locale);
    setPersistedLocale(locale);
  }

  return (
    <Card>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CardContent className={open ? "pb-4" : ""}>
          <CollapsibleTrigger className="flex w-full cursor-pointer items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
                <IconLanguage className="text-primary size-4" />
              </div>
              <div className="text-start">
                <CardTitle>
                  <Trans>Language</Trans>
                </CardTitle>
                <CardDescription>{currentInfo?.nativeName ?? "English"}</CardDescription>
              </div>
            </div>
            <IconChevronDown
              aria-hidden={true}
              className={`text-muted-foreground size-4 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
            />
          </CollapsibleTrigger>
        </CardContent>

        <CollapsibleContent className="h-[var(--collapsible-panel-height)] overflow-hidden transition-[height] duration-200 ease-out data-[ending-style]:h-0 data-[starting-style]:h-0">
          <CardContent className="border-border/30 border-t pt-4">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {LOCALE_INFO.map((info) => {
                const name = info.name;
                return (
                  <button
                    key={info.code}
                    type="button"
                    onClick={() => handleLocaleChange(info.code)}
                    className={`relative flex items-center gap-2 rounded-lg border px-3 py-2 text-start text-sm transition-colors ${
                      currentLocale === info.code
                        ? "border-primary bg-primary/5 text-foreground"
                        : "border-border hover:border-primary/40 hover:bg-primary/5"
                    }`}
                    aria-label={t`Switch to ${name}`}
                    aria-pressed={currentLocale === info.code}
                  >
                    <div className="min-w-0">
                      <div className="truncate font-medium">{info.nativeName}</div>
                      <div className="text-muted-foreground truncate text-xs">{info.name}</div>
                    </div>
                    {currentLocale === info.code && (
                      <IconCheck className="text-primary ml-auto size-4 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
