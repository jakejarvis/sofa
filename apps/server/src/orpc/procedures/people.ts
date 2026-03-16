import { ORPCError } from "@orpc/server";
import { fetchFullFilmography, getOrFetchPerson } from "@sofa/core/person";
import { getUserStatusesByTitleIds } from "@sofa/core/tracking";
import { os } from "../context";
import { authed } from "../middleware";

export const detail = os.people.detail
  .use(authed)
  .handler(async ({ input, context }) => {
    const person = await getOrFetchPerson(input.id);
    if (!person)
      throw new ORPCError("NOT_FOUND", { message: "Person not found" });

    const allCredits = await fetchFullFilmography(person.id);

    const start = (input.page - 1) * input.limit;
    const pageCredits = allCredits.slice(start, start + input.limit);

    const userStatuses = getUserStatusesByTitleIds(
      context.user.id,
      pageCredits.map((c) => c.titleId),
    );

    return {
      person,
      filmography: pageCredits,
      userStatuses,
      page: input.page,
      totalPages: Math.max(1, Math.ceil(allCredits.length / input.limit)),
      totalResults: allCredits.length,
    };
  });
