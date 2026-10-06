import { SmartCoercionHandlerPlugin } from "@orpc/json-schema";
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { OpenAPIReferenceHandlerPlugin } from "@orpc/openapi/plugins";
import { onError } from "@orpc/server";

import { createLogger } from "@sofa/logger";

import { generateOpenApiSpec, openApiTags, schemaConverters } from "./openapi-spec";
import { restoreRootFileType } from "./restore-file-type";
import { implementedRouter } from "./router";

const log = createLogger("openapi");

const isSecure = (process.env.BETTER_AUTH_URL ?? "").startsWith("https://");
const sessionCookieName = isSecure
  ? "__Secure-better-auth.session_token"
  : "better-auth.session_token";

export const openApiHandler = new OpenAPIHandler(implementedRouter, {
  plugins: [
    new SmartCoercionHandlerPlugin({ converters: schemaConverters }),
    new OpenAPIReferenceHandlerPlugin({
      docsTitle: "Sofa API",
      spec: () =>
        generateOpenApiSpec({
          title: "Sofa API",
          version: process.env.APP_VERSION || "0.0.0",
          servers: [{ url: "/api/v1" }],
          sessionCookieName,
          tags: [...openApiTags],
        }),
    }),
  ],
  routingInterceptors: [restoreRootFileType()],
  interceptors: [
    onError((error) => {
      log.error("OpenAPI error", error);
    }),
  ],
});
