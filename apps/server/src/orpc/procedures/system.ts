import {
  getOidcProviderName,
  isOidcConfigured,
  isPasswordLoginDisabled,
  isTmdbConfigured,
} from "@sofa/auth/config";
import { getUserCount, isRegistrationOpen } from "@sofa/core/settings";
import { tmdbImageUrl } from "@sofa/tmdb/image";
import { os } from "../context";

// Well-known TMDB poster paths for the background collage
const posterPaths = [
  "/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
  "/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
  "/rCzpDGLbOoPwLjy3OAm5NUPOTrC.jpg",
  "/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg",
  "/d5NXSklXo0qyIYkgV94XAgMIckC.jpg",
  "/ztkUQFLlC19CCMYHW9o1zWhJRNq.jpg",
  "/7DJKHzAi83BmQrWLrYYOqcoKfhR.jpg",
  "/u3bZgnGQ9T01sWNhyveQz0wH0Hl.jpg",
  "/ggFHVNu6YYI5L9pCfOacjizRGt.jpg",
  "/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg",
  "/pIkRyD18kl4FhoCNQuWxWu5cBLM.jpg",
  "/saHP97rTPS5eLmrLQEcANmKrsFl.jpg",
];

export const publicInfo = os.system.publicInfo.handler(async () => {
  const posterUrls = posterPaths
    .map((p) => tmdbImageUrl(p, "posters", "w300"))
    .filter(Boolean) as string[];

  return {
    tmdbConfigured: isTmdbConfigured(),
    userCount: getUserCount(),
    registrationOpen: isRegistrationOpen(),
    posterUrls,
  };
});

export const authConfig = os.system.authConfig.handler(async () => {
  const oidcEnabled = isOidcConfigured();
  return {
    oidcEnabled,
    oidcProviderName: oidcEnabled ? getOidcProviderName() : null,
    passwordLoginDisabled: isPasswordLoginDisabled(),
    registrationOpen: isRegistrationOpen(),
    userCount: getUserCount(),
  };
});
