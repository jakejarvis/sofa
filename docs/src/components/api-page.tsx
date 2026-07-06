import type { OpenAPIPageProps_Preloaded } from "fumadocs-openapi/ui";

import { openapi } from "@/lib/openapi";

import { OpenAPIPage } from "./api-page.client";

type APIPageProps = Omit<OpenAPIPageProps_Preloaded, "preloaded">;

export async function APIPage(props: APIPageProps) {
  const { document, ...pageProps } = props;
  const { bundled } = await openapi.getSchema(document);

  return (
    <OpenAPIPage
      {...pageProps}
      payload={{
        bundled,
        proxyUrl: openapi.options.proxyUrl,
      }}
    />
  );
}
