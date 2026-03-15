import {
  OpenAPIGenerator,
  type OpenAPIGeneratorGenerateOptions,
} from "@orpc/openapi";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
import {
  BackupSchema,
  CastMemberSchema,
  EpisodeSchema,
  IntegrationEventSchema,
  IntegrationSchema,
  JobSchema,
  PersonCreditSchema,
  PersonSchema,
  RecommendationItemSchema,
  ResolvedTitleSchema,
  SeasonSchema,
  SystemHealthSchema,
  TmdbBrowseItem,
} from "@sofa/api/schemas";
import { implementedRouter } from "./router";

export const schemaConverters = [new ZodToJsonSchemaConverter()];
export const openApiTags = [
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
] as const;

const generator = new OpenAPIGenerator({
  schemaConverters,
});

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

type OpenApiSpec = Awaited<ReturnType<OpenAPIGenerator["generate"]>>;

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
      Object.entries(normalized.properties).flatMap(
        ([name, propertySchema]) => {
          const nextPropertySchema = normalizeSchema(propertySchema);
          return nextPropertySchema === undefined
            ? []
            : [[name, nextPropertySchema]];
        },
      ),
    );

    if (Object.keys(nextProperties).length > 0) {
      normalized.properties = nextProperties;
    } else {
      delete normalized.properties;
    }

    if (Array.isArray(normalized.required)) {
      const propertyNames = new Set(Object.keys(nextProperties));
      const nextRequired = normalized.required.filter(
        (name): name is string =>
          typeof name === "string" && propertyNames.has(name),
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
    const nextAdditionalProperties = normalizeSchema(
      normalized.additionalProperties,
    );

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
          operation.requestBody.content =
            nextContent as typeof operation.requestBody.content;
        } else {
          delete operation.requestBody;
        }
      }

      for (const response of Object.values(operation.responses ?? {})) {
        if (!response || !("content" in response)) continue;

        const nextContent = normalizeContent(response.content);

        if (nextContent) {
          response.content = nextContent as typeof response.content;
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
  servers: OpenAPIGeneratorGenerateOptions["servers"];
  sessionCookieName: string;
  tags?: Array<{ name: string; description?: string }>;
}): Promise<OpenApiSpec> {
  const spec = await generator.generate(implementedRouter, {
    info: {
      title: options.title,
      version: options.version,
    },
    servers: options.servers,
    tags: options.tags,
    commonSchemas: {
      Title: { schema: ResolvedTitleSchema },
      Person: { schema: PersonSchema },
      PersonCredit: { schema: PersonCreditSchema },
      Episode: { schema: EpisodeSchema },
      Season: { schema: SeasonSchema },
      CastMember: { schema: CastMemberSchema },
      BrowseItem: { schema: TmdbBrowseItem },
      Recommendation: { schema: RecommendationItemSchema },
      Integration: { schema: IntegrationSchema },
      IntegrationEvent: { schema: IntegrationEventSchema },
      Backup: { schema: BackupSchema },
      Job: { schema: JobSchema },
      SystemHealth: { schema: SystemHealthSchema },
    },
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
  });

  // oRPC represents void/undefined with an impossible schema placeholder.
  // OpenAPI has no "undefined" payload, so drop impossible request/response
  // bodies entirely while preserving real `null` schemas.
  return normalizeOpenApiSpec(spec);
}
