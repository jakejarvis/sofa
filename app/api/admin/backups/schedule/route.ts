import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { rescheduleBackup } from "@/lib/cron";
import { getSetting, setSetting } from "@/lib/services/settings";

export async function GET() {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  return NextResponse.json({
    enabled: getSetting("scheduledBackups") === "true",
    maxRetention: Number.parseInt(getSetting("maxBackupRetention") ?? "7", 10),
    frequency: getSetting("backupScheduleFrequency") ?? "1d",
    time: getSetting("backupScheduleTime") ?? "03:00",
    dayOfWeek: Number.parseInt(getSetting("backupScheduleDow") ?? "0", 10),
  });
}

const updateSchema = z.object({
  enabled: z.boolean().optional(),
  frequency: z.enum(["6h", "12h", "1d", "7d"]).optional(),
  time: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Invalid time format")
    .refine(
      (t) => {
        const [h, m] = t.split(":").map(Number);
        return h >= 0 && h <= 23 && m >= 0 && m <= 59;
      },
      { message: "Invalid time value" },
    )
    .optional(),
  dayOfWeek: z.number().int().min(0).max(6).optional(),
  maxRetention: z
    .number()
    .int()
    .refine((n) => n === 0 || (n >= 1 && n <= 30), {
      message: "Max backups must be between 1 and 30, or 0 for unlimited",
    })
    .optional(),
});

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = updateSchema.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const { enabled, frequency, time, dayOfWeek, maxRetention } = parsed.data;

  if (enabled !== undefined) setSetting("scheduledBackups", String(enabled));
  if (frequency !== undefined) setSetting("backupScheduleFrequency", frequency);
  if (time !== undefined) setSetting("backupScheduleTime", time);
  if (dayOfWeek !== undefined)
    setSetting("backupScheduleDow", String(dayOfWeek));
  if (maxRetention !== undefined)
    setSetting("maxBackupRetention", String(maxRetention));

  if (frequency || time || dayOfWeek !== undefined) {
    rescheduleBackup();
  }

  return new NextResponse(null, { status: 204 });
}
