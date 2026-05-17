import { z } from "zod";

/** Chat message validation */
export const messageSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "Message cannot be empty")
    .max(2000, "Message is too long (max 2000 characters)"),
});

/** Profile form validation */
export const profileSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name cannot exceed 50 characters"),
  bio: z.string().max(500, "Bio cannot exceed 500 characters").optional().or(z.literal("")),
  age: z.number().int().min(18, "You must be at least 18 years old").max(99, "Invalid age"),
  gender: z.enum(["male", "female", "other"], {
    required_error: "Please select your gender",
  }),
  location: z.string().trim().min(1, "Location is required").max(100, "Location is too long"),
});

/** Settings / discovery preferences */
export const discoverySettingsSchema = z.object({
  minAge: z.number().int().min(18).max(99),
  maxAge: z.number().int().min(18).max(99),
  maxDistance: z.number().int().min(1).max(500),
  gender: z.enum(["everyone", "male", "female"]),
});

/** Report user form */
export const reportSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(10, "Please explain the issue (at least 10 characters)")
    .max(1000, "Report is too long"),
});

export type MessageInput = z.infer<typeof messageSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
export type DiscoverySettingsInput = z.infer<typeof discoverySettingsSchema>;
export type ReportInput = z.infer<typeof reportSchema>;
