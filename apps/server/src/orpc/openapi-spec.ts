import {
  OpenAPIGenerator,
  type OpenAPIDocument,
  type OpenAPIGeneratorGenerateOptions,
} from "@orpc/openapi";
import { ZodToJsonSchemaConverter } from "@orpc/zod";

import { implementedRouter } from "./router";

export const schemaConverters = [new ZodToJsonSchemaConverter()];
export const openApiTags = [
  { name: "Titles", description: "Movie and TV show metadata" },
  { name: "Tracking", description: "Watch tracking, ratings, and status management" },
  { name: "Library", description: "User library browsing and feeds" },
  { name: "Discover", description: "Search, trending, and content discovery" },
  { name: "People", description: "Cast and crew information" },
  { name: "Account", description: "User account and integrations" },
  { name: "System", description: "Server status and configuration" },
  { name: "Admin", description: "Server administration" },
  { name: "Imports", description: "Data import from external services" },
] as const;

const generator = new OpenAPIGenerator({
  converters: schemaConverters,
});

const httpMethods = ["get", "put", "post", "delete", "options", "head", "patch", "trace"] as const;

// oRPC v2 defaults to OpenAPI 3.2; keep emitting 3.1 like v1 did so the committed docs spec and
// its renderers (fumadocs-openapi, Scalar) see the same dialect.
const OPENAPI_VERSION = "3.1.1";

type OpenApiSpec = OpenAPIDocument<typeof OPENAPI_VERSION>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isEmptyRecord(value: unknown): value is Record<string, never> {
  return isRecord(value) && Object.keys(value).length === 0;
}

function isImpossibleSchema(schema: unknown): boolean {
  return (
    isRecord(schema) &&
    Object.keys(schema).length === 1 &&
    "not" in schema &&
    isEmptyRecord(schema.not)
  );
}

function normalizeSchema(schema: unknown): unknown {
  if (!isRecord(schema)) {
    return schema;
  }

  if (isImpossibleSchema(schema)) {
    return undefined;
  }

  const normalized = { ...schema };

  for (const key of ["anyOf", "oneOf", "allOf"] as const) {
    const branches = normalized[key];
    if (!Array.isArray(branches)) continue;

    const nextBranches = branches.flatMap((branch) => {
      const nextBranch = normalizeSchema(branch);
      return nextBranch === undefined ? [] : [nextBranch];
    });

    if (nextBranches.length === 0) {
      return undefined;
    }

    normalized[key] = nextBranches;
  }

  if (isRecord(normalized.properties)) {
    const nextProperties = Object.fromEntries(
      Object.entries(normalized.properties).flatMap(([name, propertySchema]) => {
        const nextPropertySchema = normalizeSchema(propertySchema);
        return nextPropertySchema === undefined ? [] : [[name, nextPropertySchema]];
      }),
    );

    if (Object.keys(nextProperties).length > 0) {
      normalized.properties = nextProperties;
    } else {
      delete normalized.properties;
    }

    if (Array.isArray(normalized.required)) {
      const propertyNames = new Set(Object.keys(nextProperties));
      const nextRequired = normalized.required.filter(
        (name): name is string => typeof name === "string" && propertyNames.has(name),
      );

      if (nextRequired.length > 0) {
        normalized.required = nextRequired;
      } else {
        delete normalized.required;
      }
    }
  }

  if ("items" in normalized) {
    const nextItems = normalizeSchema(normalized.items);
    if (nextItems === undefined) {
      delete normalized.items;
    } else {
      normalized.items = nextItems;
    }
  }

  if (isRecord(normalized.additionalProperties)) {
    const nextAdditionalProperties = normalizeSchema(normalized.additionalProperties);

    if (nextAdditionalProperties === undefined) {
      delete normalized.additionalProperties;
    } else {
      normalized.additionalProperties = nextAdditionalProperties;
    }
  }

  return normalized;
}

function normalizeContent(
  content: Record<string, { schema?: unknown }> | undefined,
): Record<string, { schema?: unknown }> | undefined {
  if (!content) {
    return undefined;
  }

  for (const [mediaType, mediaTypeObject] of Object.entries(content)) {
    const nextSchema = normalizeSchema(mediaTypeObject.schema);

    if (nextSchema === undefined) {
      delete content[mediaType];
      continue;
    }

    mediaTypeObject.schema = nextSchema;
  }

  return Object.keys(content).length > 0 ? content : undefined;
}

export function normalizeOpenApiSpec<T extends OpenApiSpec>(spec: T): T {
  for (const pathItem of Object.values(spec.paths ?? {})) {
    if (!pathItem) continue;

    for (const method of httpMethods) {
      const operation = pathItem[method];
      if (!operation) continue;

      if (operation.requestBody && "content" in operation.requestBody) {
        const nextContent = normalizeContent(operation.requestBody.content);

        if (nextContent) {
          operation.requestBody.content = nextContent as typeof operation.requestBody.content;
        } else {
          delete operation.requestBody;
        }
      }

      // ResponsesObject allows `x-*` extension keys, so its values are typed loosely.
      for (const response of Object.values(operation.responses ?? {})) {
        if (!isRecord(response) || !isRecord(response.content)) continue;

        const nextContent = normalizeContent(
          response.content as Record<string, { schema?: unknown }>,
        );

        if (nextContent) {
          response.content = nextContent;
        } else {
          delete response.content;
        }
      }
    }
  }

  return spec;
}

export async function generateOpenApiSpec(options: {
  title: string;
  version: string;
  servers: NonNullable<OpenAPIGeneratorGenerateOptions<typeof OPENAPI_VERSION>["base"]>["servers"];
  sessionCookieName: string;
  tags?: Array<{ name: string; description?: string }>;
}): Promise<OpenApiSpec> {
  const spec = await generator.generate(implementedRouter, {
    version: OPENAPI_VERSION,
    base: {
      info: { title: options.title, version: options.version },
      servers: options.servers,
      tags: options.tags,
      security: [{ session: [] }],
      components: {
        securitySchemes: {
          session: {
            type: "apiKey",
            name: options.sessionCookieName,
            in: "cookie",
            description: "Better Auth session cookie",
          },
        },
      },
    },
  });

  // oRPC represents void/undefined with an impossible schema placeholder.
  // OpenAPI has no "undefined" payload, so drop impossible request/response
  // bodies entirely while preserving real `null` schemas.
  return normalizeOpenApiSpec(spec);
}
