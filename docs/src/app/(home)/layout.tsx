import { HomeLayout } from "fumadocs-ui/layouts/home";
import Link from "next/link";

import { TmdbLogo } from "@/components/tmdb-logo";
import { baseOptions } from "@/lib/layout.shared";

export default function Layout({ children }: LayoutProps<"/">) {
  return (
    <HomeLayout {...baseOptions()}>
      {children}
      <footer className="border-fd-border border-t px-6 py-8">
        <div className="text-fd-muted-foreground mx-auto flex max-w-5xl flex-col items-center gap-4 text-center text-xs">
          <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
            <a
              href="https://github.com/jakejarvis/sofa"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-fd-foreground"
            >
              GitHub
            </a>
            <span className="hidden sm:inline">&middot;</span>
            <Link href="/docs" className="hover:text-fd-foreground">
              Docs
            </Link>
            <span className="hidden sm:inline">&middot;</span>
            <Link href="/privacy" className="hover:text-fd-foreground">
              Privacy
            </Link>
          </div>
          <div className="flex flex-col items-center gap-2">
            <a
              href="https://www.themoviedb.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="opacity-85 transition-opacity hover:opacity-100"
            >
              <TmdbLogo className="h-3" />
            </a>
            <p className="text-fd-muted-foreground/80 max-w-md">
              This product uses the TMDB API but is not endorsed or certified by TMDB.
            </p>
          </div>
        </div>
      </footer>
    </HomeLayout>
  );
}
