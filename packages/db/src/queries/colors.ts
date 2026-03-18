import { eq } from "drizzle-orm";

import { db } from "../client";
import { titles } from "../schema";

export function updateTitleColorPalette(titleId: string, palette: string | null): void {
  db.update(titles).set({ colorPalette: palette }).where(eq(titles.id, titleId)).run();
}
