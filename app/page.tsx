import { LandingPage } from "@/components/landing-page";
import { tmdbImageUrl } from "@/lib/tmdb/image";

// Well-known TMDB poster paths for the background collage
const posterPaths = [
  "/1E5baAaEse26fej7uHcjOgEERB2.jpg", // The Dark Knight
  "/7WsyChQLEftFiDhRDpZFHSPwJJA.jpg", // Interstellar
  "/rCzpDGLbOoPwLjy3OAm5NUPOTrC.jpg", // The Lord of the Rings
  "/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg", // Fight Club
  "/d5NXSklXo0qyIYkgV94XAgMIckC.jpg", // Dune
  "/6FfCtHgWoBQ5JUVSzcOqISu5leo.jpg", // Breaking Bad
  "/qJ2tW6WMUDux911BTUgMe1E3dPb.jpg", // The Office
  "/u3bZgnGQ9T01sWNhyveQz0wH0Hl.jpg", // Stranger Things
  "/ggFHVNu6YYI5L9pCfOacjizRGt.jpg", // Back to the Future
  "/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg", // The Shawshank Redemption
  "/pIkRyD18kl4FhoCNQuWxWu5cBLM.jpg", // Inception
  "/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg", // Forrest Gump
];

const posterUrls = posterPaths
  .map((p) => tmdbImageUrl(p, "w300"))
  .filter(Boolean) as string[];

export default function Home() {
  return <LandingPage posterUrls={posterUrls} />;
}
