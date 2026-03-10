import { openApiHandler } from "@/lib/orpc/openapi-handler";

async function handleRequest(request: Request) {
  const { response } = await openApiHandler.handle(request, {
    prefix: "/api/v1",
    context: { headers: request.headers },
  });
  return response ?? new Response("Not found", { status: 404 });
}

export const GET = handleRequest;
export const POST = handleRequest;
export const PUT = handleRequest;
export const DELETE = handleRequest;
