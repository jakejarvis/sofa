import {
  getAllPlatforms,
  getUserPlatformIds,
  getUserPlatforms,
  hasUserPlatforms,
  platformIdsExist,
  setUserPlatforms,
} from "@sofa/db/queries/user-platforms";

export function listPlatforms() {
  return getAllPlatforms();
}

export function getUserPlatformList(userId: string) {
  return getUserPlatforms(userId);
}

export function getUserPlatformIdList(userId: string) {
  return getUserPlatformIds(userId);
}

export function updateUserPlatforms(userId: string, platformIds: string[]): void {
  if (platformIds.length > 0 && !platformIdsExist(platformIds)) {
    throw new Error("One or more platform IDs do not exist");
  }
  setUserPlatforms(userId, platformIds);
}

export function hasUserSetPlatforms(userId: string): boolean {
  return hasUserPlatforms(userId);
}
