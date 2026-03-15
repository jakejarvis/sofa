import packageJson from "../apps/server/package.json" with { type: "json" };
import {
  generateOpenApiSpec,
  openApiTags,
} from "../apps/server/src/orpc/openapi-spec";

const spec = await generateOpenApiSpec({
  title: "Sofa API",
  version: packageJson.version || "1.0.0",
  servers: [
    {
      url: "{protocol}://{host}:{port}/api/v1",
      variables: {
        protocol: {
          default: "http",
          enum: ["http", "https"],
        },
        host: {
          default: "localhost",
        },
        port: {
          default: "3000",
        },
      },
    },
  ],
  sessionCookieName: "better-auth.session_token",
  tags: [...openApiTags],
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

await Bun.write("docs/public/openapi.json", JSON.stringify(spec, null, 2));
console.log("OpenAPI spec written to docs/openapi.json");
