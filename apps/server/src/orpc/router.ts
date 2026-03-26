import { os } from "./context";
import * as account from "./procedures/account";
import * as admin from "./procedures/admin";
import * as discover from "./procedures/discover";
import * as imports from "./procedures/imports";
import * as library from "./procedures/library";
import * as people from "./procedures/people";
import * as system from "./procedures/system";
import * as titles from "./procedures/titles";
import * as tracking from "./procedures/tracking";

export const implementedRouter = {
  titles: {
    get: titles.get,
    similar: titles.similar,
  },
  tracking: {
    watch: tracking.watch,
    unwatch: tracking.unwatch,
    updateStatus: tracking.updateStatus,
    rate: tracking.rate,
    userInfo: tracking.userInfo,
    quickAdd: tracking.quickAdd,
    stats: tracking.stats,
    history: tracking.history,
  },
  library: {
    list: library.list,
    genres: library.genres,
    continueWatching: library.continueWatching,
    upcoming: library.upcoming,
  },
  discover: {
    trending: discover.trending,
    popular: discover.popular,
    search: discover.search,
    browse: discover.browse,
    genres: discover.genres,
    platforms: discover.platforms,
    recommendations: discover.recommendations,
  },
  people: {
    get: people.get,
  },
  account: {
    updateName: account.updateName,
    uploadAvatar: account.uploadAvatar,
    removeAvatar: account.removeAvatar,
    platforms: account.platforms,
    updatePlatforms: account.updatePlatformsHandler,
    integrations: {
      list: account.integrationsList,
      create: account.integrationsCreate,
      delete: account.integrationsDelete,
      regenerateToken: account.integrationsRegenerateToken,
    },
  },
  system: {
    publicInfo: system.publicInfo,
    status: system.status,
  },
  admin: {
    settings: {
      get: admin.settingsGet,
      update: admin.settingsUpdate,
    },
    backups: {
      list: admin.backupsList,
      create: admin.backupsCreate,
      delete: admin.backupsDelete,
      restore: admin.backupsRestore,
      schedule: admin.backupsSchedule,
      updateSchedule: admin.backupsUpdateSchedule,
    },
    triggerJob: admin.triggerJob,
    purgeMetadataCache: admin.purgeMetadataCache,
    purgeImageCache: admin.purgeImageCache,
    systemHealth: admin.systemHealth,
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
