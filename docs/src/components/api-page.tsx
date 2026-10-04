import type { OpenAPIPageProps_Preloaded } from "fumadocs-openapi/ui";

import { openapi } from "@/lib/openapi";

import { OpenAPIPage as ClientOpenAPIPage } from "./api-page.client";

type OpenAPIPageProps = Omit<OpenAPIPageProps_Preloaded, "preloaded">;

export async function OpenAPIPage(props: OpenAPIPageProps) {
  const { document, ...pageProps } = props;
  const { bundled } = await openapi.getSchema(document);

  return (
    <ClientOpenAPIPage
      {...pageProps}
      payload={{
        bundled,
        proxyUrl: openapi.options.proxyUrl,
      }}
    />
  );
}
