import { SmartCoercionPlugin } from "@orpc/json-schema";
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { OpenAPIReferencePlugin } from "@orpc/openapi/plugins";
import { onError } from "@orpc/server";
import { createLogger } from "@sofa/logger";
import {
  generateOpenApiSpec,
  openApiTags,
  schemaConverters,
} from "./openapi-spec";
import { implementedRouter } from "./router";

const log = createLogger("openapi");

const isSecure = (process.env.BETTER_AUTH_URL ?? "").startsWith("https://");
const sessionCookieName = isSecure
  ? "__Secure-better-auth.session_token"
  : "better-auth.session_token";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export const openApiHandler = new OpenAPIHandler(implementedRouter, {
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
        tags: [...openApiTags],
        components: {
          securitySchemes: {
            session: {
              type: "apiKey",
              name: sessionCookieName,
              in: "cookie",
              description: "Better Auth session cookie",
            },
          },
        },
      },
      // Load the spec from /spec.json so the docs use the normalized document
      // rather than the plugin's raw generator output.
      renderDocsHtml: (specUrl, title, head, scriptUrl, config) => {
        const scalarConfig = {
          url: specUrl,
          ...(typeof config === "object" && config !== null ? config : {}),
        };

        return `
        <!doctype html>
        <html>
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <title>${escapeHtml(title)}</title>
            ${head}
          </head>
          <body>
            <div id="app" data-config="${escapeHtml(JSON.stringify(scalarConfig))}"></div>

            <script src="${escapeHtml(scriptUrl)}"></script>

            <script>
              Scalar.createApiReference('#app', JSON.parse(document.getElementById('app').dataset.config))
            </script>
          </body>
        </html>
        `;
      },
    }),
  ],
  interceptors: [
    async (options) => {
      const requestPathname =
        options.request.url.pathname.replace(/\/$/, "") || "/";
      const prefix = options.prefix?.replace(/\/$/, "") || "";
      const specPath = `${prefix}/spec.json`.replace(/\/$/, "") || "/";

      if (options.request.method !== "GET" || requestPathname !== specPath) {
        return options.next();
      }

      const spec = await generateOpenApiSpec({
        title: "Sofa API",
        version: process.env.APP_VERSION || "0.0.0",
        servers: [{ url: prefix || "/api/v1" }],
        sessionCookieName,
        tags: [...openApiTags],
      });

      return {
        matched: true,
        response: {
          status: 200,
          headers: {
            "content-type": "application/json",
          },
          body: new File([JSON.stringify(spec)], "spec.json", {
            type: "application/json",
          }),
        },
      };
    },
    onError((error) => {
      log.error("OpenAPI error", error);
    }),
  ],
});
