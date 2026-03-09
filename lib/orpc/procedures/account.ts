import { auth } from "@/lib/auth/server";
import { os } from "../context";
import { authed } from "../middleware";

export const updateName = os.account.updateName
  .use(authed)
  .handler(async ({ input, context }) => {
    await auth.api.updateUser({
      body: { name: input.name },
      headers: context.headers,
    });
  });
