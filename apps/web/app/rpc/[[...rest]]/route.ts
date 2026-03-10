import { handler } from "@/lib/orpc/handler";

async function handleRequest(request: Request) {
  const { response } = await handler.handle(request, {
    prefix: "/rpc",
    context: { headers: request.headers },
  });
  return response ?? new Response("Not found", { status: 404 });
}

export const GET = handleRequest;
export const POST = handleRequest;
