import { oc } from "@orpc/contract";
import { z } from "zod";
import {
  BatchWatchInput,
  CreateIntegrationInput,
  DiscoverInput,
  FilenameParam,
  IdParam,
  MediaTypeParam,
  ProviderParam,
  SearchInput,
  StatsInput,
  TmdbIdTypeParam,
  ToggleRegistrationInput,
  ToggleUpdateCheckInput,
  TriggerJobInput,
  UpdateNameInput,
  UpdateRatingInput,
  UpdateScheduleInput,
  UpdateStatusInput,
} from "./schemas";

// z.any() is used as a permissive output schema — actual return types are
// inferred from the procedure implementations. Strict output schemas can be
// added per-procedure as needed.
const data = z.any();

export const contract = {
  titles: {
    detail: oc.input(IdParam).output(data),
    resolve: oc.input(TmdbIdTypeParam).output(data),
    updateStatus: oc.input(UpdateStatusInput),
    updateRating: oc.input(UpdateRatingInput),
    watchMovie: oc.input(IdParam),
    watchAll: oc.input(IdParam),
    userInfo: oc.input(IdParam).output(data),
    recommendations: oc.input(IdParam).output(data),
  },
  episodes: {
    watch: oc.input(IdParam).output(data),
    unwatch: oc.input(IdParam),
    batchWatch: oc.input(BatchWatchInput),
  },
  seasons: {
    watch: oc.input(IdParam),
    unwatch: oc.input(IdParam),
  },
  people: {
    detail: oc.input(IdParam).output(data),
    resolve: oc.input(z.object({ tmdbId: z.number().int() })).output(data),
  },
  dashboard: {
    stats: oc.output(data),
    continueWatching: oc.output(data),
    library: oc.output(data),
    recommendations: oc.output(data),
  },
  explore: {
    trending: oc.input(MediaTypeParam).output(data),
    popular: oc.input(MediaTypeParam).output(data),
    genres: oc.input(MediaTypeParam).output(data),
  },
  search: oc.input(SearchInput).output(data),
  discover: oc.input(DiscoverInput).output(data),
  stats: oc.input(StatsInput).output(data),
  systemStatus: oc.output(data),
  integrations: {
    list: oc.output(data),
    create: oc.input(CreateIntegrationInput).output(data),
    delete: oc.input(ProviderParam),
    regenerateToken: oc.input(ProviderParam).output(data),
  },
  admin: {
    backups: {
      list: oc.output(data),
      create: oc.output(data),
      delete: oc.input(FilenameParam),
      schedule: oc.output(data),
      updateSchedule: oc.input(UpdateScheduleInput),
    },
    registration: oc.output(data),
    toggleRegistration: oc.input(ToggleRegistrationInput),
    updateCheck: oc.output(data),
    toggleUpdateCheck: oc.input(ToggleUpdateCheckInput),
    triggerJob: oc.input(TriggerJobInput).output(data),
  },
  account: {
    updateName: oc.input(UpdateNameInput),
  },
  watchlist: {
    quickAdd: oc.input(TmdbIdTypeParam).output(data),
  },
};
