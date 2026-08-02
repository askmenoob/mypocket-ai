import { z } from "zod";

const timeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/);

export const commitmentFilterSchema = z.object({
  status: z
    .enum([
      "unpaid",
      "paid",
      "overdue",
      "all",
      "inactive",
    ])
    .optional(),
});

export const createCommitmentSchema = z.object({
  name: z.string().trim().min(2).max(120),
  amount: z.string().trim().min(1),
  dueDay: z.number().int().min(1).max(31),
  reminderDaysBefore: z.number().int().min(0).max(30).optional(),
  reminderTime: timeSchema.optional(),
  timezone: z.string().trim().min(1).max(80).optional(),
  isActive: z.boolean().optional(),
});

export const updateCommitmentSchema = createCommitmentSchema
  .partial()
  .extend({
    isActive: z.boolean().optional(),
  });

export const botSettingsSchema = z.object({
  botEnabled: z.boolean().optional(),
  replyLanguage: z.string().trim().min(2).max(12).optional(),
  timezone: z.string().trim().min(1).max(80).optional(),
  defaultReminderDaysBefore: z.number().int().min(0).max(30).optional(),
  defaultReminderTime: timeSchema.optional(),
  quietHoursStart: timeSchema.optional(),
  quietHoursEnd: timeSchema.optional(),
  overdueReminderEnabled: z.boolean().optional(),
  whatsappNotificationEnabled: z.boolean().optional(),
});

export type CreateCommitmentBody = z.infer<typeof createCommitmentSchema>;
export type UpdateCommitmentBody = z.infer<typeof updateCommitmentSchema>;
export type BotSettingsBody = z.infer<typeof botSettingsSchema>;
