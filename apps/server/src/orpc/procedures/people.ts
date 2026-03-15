import { ORPCError } from "@orpc/server";
import {
  fetchFullFilmography,
  getOrFetchPerson,
  getOrFetchPersonByTmdbId,
} from "@sofa/core/person";
import { getUserStatusesByTitleIds } from "@sofa/core/tracking";
import { os } from "../context";
import { authed } from "../middleware";

export const detail = os.people.detail
  .use(authed)
  .handler(async ({ input, context }) => {
    const person = await getOrFetchPerson(input.id);
    if (!person)
      throw new ORPCError("NOT_FOUND", { message: "Person not found" });

    const filmography = await fetchFullFilmography(person.id);
    const userStatuses = getUserStatusesByTitleIds(
      context.user.id,
      filmography.map((c) => c.titleId),
    );

    return { person, filmography, userStatuses };
  });

export const resolve = os.people.resolve
  .use(authed)
  .handler(async ({ input }) => {
    const person = await getOrFetchPersonByTmdbId(input.tmdbId);
    if (!person)
      throw new ORPCError("NOT_FOUND", { message: "Person not found" });
    return { id: person.id };
  });
