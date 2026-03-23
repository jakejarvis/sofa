import { os } from "./context";
import * as account from "./procedures/account";
import * as admin from "./procedures/admin";
import * as dashboard from "./procedures/dashboard";
import { discover } from "./procedures/discover";
import * as episodes from "./procedures/episodes";
import * as explore from "./procedures/explore";
import * as imports from "./procedures/imports";
import * as integrations from "./procedures/integrations";
import * as library from "./procedures/library";
import * as people from "./procedures/people";
import { search } from "./procedures/search";
import * as seasons from "./procedures/seasons";
import * as status from "./procedures/status";
import * as system from "./procedures/system";
import * as titles from "./procedures/titles";

export const implementedRouter = {
  library: {
    list: library.list,
    genres: library.genres,
  },
  titles: {
    detail: titles.detail,
    updateStatus: titles.updateStatus,
    updateRating: titles.updateRating,
    watchMovie: titles.watchMovie,
    watchAll: titles.watchAll,
    userInfo: titles.userInfo,
    recommendations: titles.recommendations,
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
  },
  dashboard: {
    stats: dashboard.stats,
    continueWatching: dashboard.continueWatching,
    upcoming: dashboard.upcoming,
    recommendations: dashboard.recommendations,
    watchHistory: dashboard.watchHistory,
  },
  explore: {
    trending: explore.trending,
    popular: explore.popular,
    genres: explore.genres,
    watchProviders: explore.watchProviders,
  },
  search,
  discover,
  system: {
    publicInfo: system.publicInfo,
    authConfig: system.authConfig,
    status: status.status,
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
    purgeMetadataCache: admin.purgeMetadataCache,
    purgeImageCache: admin.purgeImageCache,
    systemHealth: admin.systemHealth,
  },
  account: {
    updateName: account.updateName,
    uploadAvatar: account.uploadAvatar,
    removeAvatar: account.removeAvatar,
  },
  imports: {
    parseFile: imports.parseFile,
    parsePayload: imports.parsePayload,
    createJob: imports.createJob,
    getJob: imports.getJob,
    cancelJob: imports.cancelJob,
    jobEvents: imports.jobEvents,
  },
};

export const router = os.router(implementedRouter);

export type Router = typeof router;
