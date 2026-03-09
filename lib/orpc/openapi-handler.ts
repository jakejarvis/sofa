import { SmartCoercionPlugin } from "@orpc/json-schema";
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { OpenAPIReferencePlugin } from "@orpc/openapi/plugins";
import { onError } from "@orpc/server";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
import { createLogger } from "@/lib/logger";
import { router } from "./router";

const log = createLogger("openapi");

// https://orpc.dev/docs/openapi/plugins/smart-coercion
const schemaConverters = [new ZodToJsonSchemaConverter()];

export const openApiHandler = new OpenAPIHandler(router, {
  plugins: [
    new SmartCoercionPlugin({ schemaConverters }),
    new OpenAPIReferencePlugin({
      schemaConverters,
      specGenerateOptions: {
        info: {
          title: "Sofa API",
          version: process.env.APP_VERSION || "0.0.0",
        },
        servers: [{ url: "/api/v1" }],
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
      },
    }),
  ],
  interceptors: [
    onError((error) => {
      log.error("OpenAPI error", { error });
    }),
  ],
});
