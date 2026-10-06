import type { Context } from "@orpc/server";
import type { StandardHandlerRoutingInterceptor } from "@orpc/server/standard";

/**
 * Restores the MIME type of a procedure input that is a bare `File` (avatar upload, backup restore).
 *
 * oRPC v2 sends such an input as the raw request body and rebuilds the `File` from
 * `request.blob()`, whose type Bun.serve always reports as `text/plain;charset=utf-8`. Without this,
 * `z.file().mime([...])` rejects every upload. Files nested in an object arrive as multipart form
 * data and keep their type, so only a root-level `File` body is re-typed.
 */
export function restoreRootFileType<T extends Context>(): StandardHandlerRoutingInterceptor<T> {
  return (options) => {
    const contentType = options.request.headers["content-type"];
    if (typeof contentType !== "string") return options.next();

    const resolveBody = options.request.resolveBody;
    return options.next({
      ...options,
      request: {
        ...options.request,
        resolveBody: async (hint) => {
          const body = await resolveBody(hint);
          return body instanceof File && body.type !== contentType
            ? new File([body], body.name, { type: contentType, lastModified: body.lastModified })
            : body;
        },
      },
    });
  };
}
