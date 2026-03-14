import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import { SofaLogo } from "@/components/sofa-logo";

export const gitConfig = {
  user: "jakejarvis",
  repo: "sofa",
  branch: "main",
};

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: (
        <>
          <SofaLogo className="size-6" />
          <span className="font-display text-[17px] leading-none">Sofa</span>
        </>
      ),
    },
    links: [
      { text: "Docs", url: "/docs" },
      { text: "API Reference", url: "/docs/api" },
    ],
    githubUrl: "https://github.com/jakejarvis/sofa",
    themeSwitch: { enabled: false },
  };
}
