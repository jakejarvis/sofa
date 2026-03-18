/**
 * Intl polyfills for Hermes (React Native).
 *
 * Load order matters — each polyfill depends on the ones before it.
 * See: https://formatjs.github.io/docs/guides/react-native-hermes
 *
 * We use `polyfill-force` to always install the polyfill regardless of
 * partial Hermes Intl support, ensuring consistent behavior.
 */

// 1. getCanonicalLocales (no dependencies)
import "@formatjs/intl-getcanonicallocales/polyfill";
// 2. Locale (depends on getCanonicalLocales)
import "@formatjs/intl-locale/polyfill";
// 3. PluralRules (depends on Locale)
import "@formatjs/intl-pluralrules/polyfill-force";
import "@formatjs/intl-pluralrules/locale-data/en";
import "@formatjs/intl-pluralrules/locale-data/fr";
import "@formatjs/intl-pluralrules/locale-data/de";
import "@formatjs/intl-pluralrules/locale-data/es";
import "@formatjs/intl-pluralrules/locale-data/it";
import "@formatjs/intl-pluralrules/locale-data/pt";
// 4. NumberFormat (depends on PluralRules, Locale)
import "@formatjs/intl-numberformat/polyfill-force";
import "@formatjs/intl-numberformat/locale-data/en";
import "@formatjs/intl-numberformat/locale-data/fr";
import "@formatjs/intl-numberformat/locale-data/de";
import "@formatjs/intl-numberformat/locale-data/es";
import "@formatjs/intl-numberformat/locale-data/it";
import "@formatjs/intl-numberformat/locale-data/pt";
// 5. DateTimeFormat (depends on Locale)
import "@formatjs/intl-datetimeformat/polyfill-force";
import "@formatjs/intl-datetimeformat/locale-data/en";
import "@formatjs/intl-datetimeformat/locale-data/fr";
import "@formatjs/intl-datetimeformat/locale-data/de";
import "@formatjs/intl-datetimeformat/locale-data/es";
import "@formatjs/intl-datetimeformat/locale-data/it";
import "@formatjs/intl-datetimeformat/locale-data/pt";
import "@formatjs/intl-datetimeformat/add-all-tz";
// 6. RelativeTimeFormat (depends on PluralRules, Locale)
import "@formatjs/intl-relativetimeformat/polyfill-force";
import "@formatjs/intl-relativetimeformat/locale-data/en";
import "@formatjs/intl-relativetimeformat/locale-data/fr";
import "@formatjs/intl-relativetimeformat/locale-data/de";
import "@formatjs/intl-relativetimeformat/locale-data/es";
import "@formatjs/intl-relativetimeformat/locale-data/it";
import "@formatjs/intl-relativetimeformat/locale-data/pt";
