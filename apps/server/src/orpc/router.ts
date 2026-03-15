import { os } from "./context";
import * as account from "./procedures/account";
import * as admin from "./procedures/admin";
import * as dashboard from "./procedures/dashboard";
import { discover } from "./procedures/discover";
import * as episodes from "./procedures/episodes";
import * as explore from "./procedures/explore";
import * as integrations from "./procedures/integrations";
import * as people from "./procedures/people";
import { search } from "./procedures/search";
import * as seasons from "./procedures/seasons";
import * as status from "./procedures/status";
import * as system from "./procedures/system";
import * as titles from "./procedures/titles";

export const implementedRouter = {
  titles: {
    detail: titles.detail,
    resolve: titles.resolve,
    updateStatus: titles.updateStatus,
    updateRating: titles.updateRating,
    watchMovie: titles.watchMovie,
    watchAll: titles.watchAll,
    userInfo: titles.userInfo,
    recommendations: titles.recommendations,
    hydrateSeasons: titles.hydrateSeasons,
    quickAdd: titles.quickAdd,
  },
  episodes: {
    watch: episodes.watch,
    unwatch: episodes.unwatch,
    batchWatch: episodes.batchWatch,
  },
  seasons: {
    watch: seasons.watch,
    unwatch: seasons.unwatch,
  },
  people: {
    detail: people.detail,
    resolve: people.resolve,
  },
  dashboard: {
    stats: dashboard.stats,
    continueWatching: dashboard.continueWatching,
    library: dashboard.library,
    recommendations: dashboard.recommendations,
    watchHistory: dashboard.watchHistory,
  },
  explore: {
    trending: explore.trending,
    popular: explore.popular,
    genres: explore.genres,
  },
  search,
  discover,
  system: {
    publicInfo: system.publicInfo,
    authConfig: system.authConfig,
    status: status.status,
    health: status.health,
  },
  integrations: {
    list: integrations.list,
    create: integrations.create,
    delete: integrations.deleteIntegration,
    regenerateToken: integrations.regenerateToken,
  },
  admin: {
    backups: {
      list: admin.backupsList,
      create: admin.backupsCreate,
      delete: admin.backupsDelete,
      restore: admin.backupsRestore,
      schedule: admin.backupsSchedule,
      updateSchedule: admin.backupsUpdateSchedule,
    },
    registration: admin.registration,
    toggleRegistration: admin.toggleRegistration,
    updateCheck: admin.updateCheck,
    toggleUpdateCheck: admin.toggleUpdateCheck,
    telemetry: admin.telemetry,
    toggleTelemetry: admin.toggleTelemetry,
    triggerJob: admin.triggerJob,
  },
  account: {
    updateName: account.updateName,
    uploadAvatar: account.uploadAvatar,
    removeAvatar: account.removeAvatar,
  },
};

export const router = os.router(implementedRouter);

export type Router = typeof router;
