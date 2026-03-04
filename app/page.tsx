import { connection } from "next/server";
import { LandingPage } from "@/components/landing-page";
import { getUserCount, isRegistrationOpen } from "@/lib/services/settings";
import { tmdbImageUrl } from "@/lib/tmdb/image";

// Well-known TMDB poster paths for the background collage
const posterPaths = [
  "/qJ2tW6WMUDux911r6m7haRef0WH.jpg", // The Dark Knight
  "/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg", // Interstellar
  "/rCzpDGLbOoPwLjy3OAm5NUPOTrC.jpg", // The Lord of the Rings
  "/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg", // Fight Club
  "/d5NXSklXo0qyIYkgV94XAgMIckC.jpg", // Dune
  "/ztkUQFLlC19CCMYHW9o1zWhJRNq.jpg", // Breaking Bad
  "/7DJKHzAi83BmQrWLrYYOqcoKfhR.jpg", // The Office
  "/u3bZgnGQ9T01sWNhyveQz0wH0Hl.jpg", // Stranger Things
  "/ggFHVNu6YYI5L9pCfOacjizRGt.jpg", // Back to the Future
  "/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg", // The Shawshank Redemption
  "/pIkRyD18kl4FhoCNQuWxWu5cBLM.jpg", // Inception
  "/saHP97rTPS5eLmrLQEcANmKrsFl.jpg", // Forrest Gump
];

const posterUrls = posterPaths
  .map((p) => tmdbImageUrl(p, "w300"))
  .filter(Boolean) as string[];

export default async function Home() {
  await connection();
  const userCount = getUserCount();
  return (
    <LandingPage
      posterUrls={posterUrls}
      freshInstall={userCount === 0}
      registrationOpen={isRegistrationOpen()}
    />
  );
}
