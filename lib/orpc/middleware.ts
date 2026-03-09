import { os as baseOs, ORPCError } from "@orpc/server";
import { auth } from "@/lib/auth/server";

const base = baseOs.$context<{ headers: Headers }>();

export const authed = base.middleware(async ({ context, next }) => {
  const sessionData = await auth.api.getSession({
    headers: context.headers,
  });
  if (!sessionData?.session || !sessionData?.user) {
    throw new ORPCError("UNAUTHORIZED");
  }
  return next({
    context: {
      user: sessionData.user,
      session: sessionData.session,
    },
  });
});

export const admin = base.middleware(async ({ context, next }) => {
  const sessionData = await auth.api.getSession({
    headers: context.headers,
  });
  if (!sessionData?.session || !sessionData?.user) {
    throw new ORPCError("UNAUTHORIZED");
  }
  if (sessionData.user.role !== "admin") {
    throw new ORPCError("FORBIDDEN");
  }
  return next({
    context: {
      user: sessionData.user,
      session: sessionData.session,
    },
  });
});
