import { Trans, useLingui } from "@lingui/react/macro";
import { activateLocale, type SupportedLocale } from "@sofa/i18n";
import { LOCALE_INFO } from "@sofa/i18n/locales";
import { IconCheck, IconLanguage } from "@tabler/icons-react";
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { setPersistedLocale } from "@/lib/i18n";

export function LanguageSection() {
  const { t, i18n } = useLingui();
  const currentLocale = i18n.locale;

  async function handleLocaleChange(locale: SupportedLocale) {
    await activateLocale(locale);
    setPersistedLocale(locale);
  }

  return (
    <>
      <CardHeader>
        <CardTitle>
          <Trans>Language</Trans>
        </CardTitle>
        <CardDescription>
          <Trans>Choose your preferred display language</Trans>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {LOCALE_INFO.map((info) => (
            <button
              key={info.code}
              type="button"
              onClick={() => handleLocaleChange(info.code)}
              className={`relative flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                currentLocale === info.code
                  ? "border-primary bg-primary/5 text-foreground"
                  : "border-border hover:border-primary/40 hover:bg-primary/5"
              }`}
              aria-label={t`Switch to ${info.name}`}
              aria-pressed={currentLocale === info.code}
            >
              <IconLanguage className="size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <div className="truncate font-medium">{info.nativeName}</div>
                <div className="truncate text-muted-foreground text-xs">
                  {info.name}
                </div>
              </div>
              {currentLocale === info.code && (
                <IconCheck className="ml-auto size-4 shrink-0 text-primary" />
              )}
            </button>
          ))}
        </div>
      </CardContent>
    </>
  );
}
