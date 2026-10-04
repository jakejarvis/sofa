import { type InferPageType, loader } from "fumadocs-core/source";
import { lucideIconsPlugin } from "fumadocs-core/source/lucide-icons";
import { openapiPlugin } from "fumadocs-openapi/server";

import { openapi } from "@/lib/openapi";
import { docs } from "collections/server";

// See https://fumadocs.dev/docs/headless/source-api for more info
export const source = loader({
  baseUrl: "/docs",
  source: docs.toFumadocsSource(),
  plugins: [lucideIconsPlugin(), openapiPlugin()],
});

export function getPageImage(page: InferPageType<typeof source>) {
  const segments = [...page.slugs, "image.webp"];

  return {
    segments,
    url: `/og/docs/${segments.join("/")}`,
  };
}

export async function getLLMText(page: InferPageType<typeof source>) {
  const processed = await page.data.getText("processed");

  return `# ${page.data.title}

${processed}${await getOpenAPIText(page)}`;
}

// Generated API pages render everything through `<OpenAPIPage />` inside an
// MDX layout export, so their processed markdown is empty. Describe the
// operations from the bundled spec instead.
async function getOpenAPIText(page: InferPageType<typeof source>) {
  const raw = await page.data.getText("raw");
  const match = /<OpenAPIPage document="([^"]+)" operations=\{(\[.*?\])\}/.exec(raw);
  if (!match) return "";

  const { bundled } = await openapi.getSchema(match[1]);
  const operations = JSON.parse(match[2]) as { path: string; method: string }[];

  return operations
    .map(({ path, method }) => {
      const operation = bundled.paths?.[path]?.[method as "get"];
      if (!operation) return "";
      const description = operation.description ?? operation.summary ?? "";

      return `${description}

\`${method.toUpperCase()} ${path}\`

\`\`\`json
${JSON.stringify(operation, null, 2)}
\`\`\`
`;
    })
    .join("\n");
}
