import { OpenAPIGenerator } from "@orpc/openapi";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
import { contract } from "@sofa/api/contract";

import packageJson from "../apps/server/package.json" with { type: "json" };

const generator = new OpenAPIGenerator({
  schemaConverters: [new ZodToJsonSchemaConverter()],
});

const spec = await generator.generate(contract, {
  info: { title: "Sofa API", version: packageJson.version || "1.0.0" },
  servers: [{ url: "https://sofa.example.com/api/v1" }],
  tags: [
    { name: "Titles", description: "Movie and TV show management" },
    { name: "Episodes", description: "Episode watch tracking" },
    { name: "Seasons", description: "Season watch tracking" },
    { name: "People", description: "Cast and crew information" },
    { name: "Dashboard", description: "User dashboard data" },
    { name: "Explore", description: "Discover trending and popular content" },
    { name: "Search", description: "Search for movies and TV shows" },
    {
      name: "Discover",
      description: "Advanced content discovery with filters",
    },
    { name: "System", description: "Server status and configuration" },
    { name: "Integrations", description: "Media server integrations" },
    { name: "Admin", description: "Server administration" },
    { name: "Account", description: "User account management" },
  ],
  components: {
    securitySchemes: {
      session: {
        type: "apiKey",
        name: "better-auth.session_token",
        in: "cookie",
        description: "Better Auth session cookie",
      },
    },
  },
});

// Normalize file upload media types that fumadocs-openapi doesn't support
// (e.g. image/jpeg, image/png, */*) to multipart/form-data
const supportedMediaTypes = new Set([
  "application/json",
  "multipart/form-data",
  "application/x-www-form-urlencoded",
  "application/octet-stream",
  "text/plain",
]);

for (const pathItem of Object.values(spec.paths ?? {})) {
  if (!pathItem) continue;
  const httpMethods = [
    "get",
    "put",
    "post",
    "delete",
    "options",
    "head",
    "patch",
    "trace",
  ] as const;
  for (const key of httpMethods) {
    const method = pathItem[key];
    if (!method?.requestBody || !("content" in method.requestBody)) continue;
    const content = method.requestBody.content;
    const unsupported = Object.keys(content).filter(
      (type) => !supportedMediaTypes.has(type),
    );
    if (unsupported.length > 0) {
      // Replace unsupported types with a single multipart/form-data entry
      for (const type of unsupported) delete content[type];
      content["multipart/form-data"] = {
        schema: {
          type: "object",
          properties: { file: { type: "string", format: "binary" } },
          required: ["file"],
        },
      };
    }
  }
}

await Bun.write("docs/openapi.json", JSON.stringify(spec, null, 2));
console.log("OpenAPI spec written to docs/openapi.json");
