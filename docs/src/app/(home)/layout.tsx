import { HomeLayout } from "fumadocs-ui/layouts/home";
import Link from "next/link";

import { SofaLogo } from "@/components/sofa-logo";
import { TmdbLogo } from "@/components/tmdb-logo";
import { baseOptions } from "@/lib/layout.shared";

const footerLinks = [
  { text: "Documentation", href: "/docs" },
  { text: "API reference", href: "/docs/api" },
  { text: "GitHub", href: "https://github.com/jakejarvis/sofa", external: true },
  { text: "Privacy", href: "/privacy" },
];

export default function Layout({ children }: LayoutProps<"/">) {
  return (
    <HomeLayout {...baseOptions()}>
      {children}
      <footer className="border-fd-border border-t">
        <div className="text-fd-muted-foreground mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10 text-sm md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-fd-foreground flex items-center gap-2">
              <SofaLogo className="size-5" />
              <span className="font-display text-lg leading-none">Sofa</span>
            </p>
            <p className="mt-3">Free and open source under the MIT license.</p>
          </div>
          <nav aria-label="Footer">
            <ul className="flex flex-wrap gap-x-6 gap-y-2">
              {footerLinks.map((link) => (
                <li key={link.text}>
                  {link.external ? (
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-fd-foreground"
                    >
                      {link.text}
                    </a>
                  ) : (
                    <Link href={link.href} className="hover:text-fd-foreground">
                      {link.text}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        </div>
        <div className="text-fd-muted-foreground/80 mx-auto flex w-full max-w-6xl items-center gap-3 px-6 pb-10 text-xs">
          <a
            href="https://www.themoviedb.org/"
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 opacity-85 transition-opacity hover:opacity-100"
          >
            <TmdbLogo className="h-3" />
          </a>
          <p>This product uses the TMDB API but is not endorsed or certified by TMDB.</p>
        </div>
      </footer>
    </HomeLayout>
  );
}
