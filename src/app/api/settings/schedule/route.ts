import type { NextRequest } from "next/server";
import { z } from "zod";
import { getRepositories } from "@/infrastructure/container";
import {
  DEFAULT_SCHEDULE_CONFIG,
  validateScheduleConfig,
} from "@/domain/scheduling/schedule-config";
import { handleRequest } from "@/lib/api-response";

const configSchema = z.object({
  weekdays: z.array(z.number().int().min(0).max(6)).min(1).max(7),
  startHour: z.number().int().min(0).max(23),
  endHour: z.number().int().min(1).max(24),
  minGapMinutes: z.number().int().min(15).max(120),
});

export async function GET() {
  return handleRequest(async () => {
    const { scheduleConfig } = await getRepositories();
    const config = await scheduleConfig.get();
    return { config: config ?? DEFAULT_SCHEDULE_CONFIG, isDefault: config === null };
  });
}

export async function PUT(request: NextRequest) {
  return handleRequest(async () => {
    const body = configSchema.parse(await request.json());
    const { scheduleConfig } = await getRepositories();
    const validated = validateScheduleConfig(body);
    await scheduleConfig.save(validated);
    return { config: validated, isDefault: false };
  });
}
