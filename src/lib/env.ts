import { z } from "zod";

const envSchema = z.object({
  VITE_SUPABASE_URL: z.string().url("VITE_SUPABASE_URL must be a valid URL"),
  VITE_SUPABASE_PUBLISHABLE_KEY: z.string().min(1, "VITE_SUPABASE_PUBLISHABLE_KEY is required"),
  VITE_SENTRY_DSN: z.string().url().optional().or(z.literal("")),
  VITE_GA_TRACKING_ID: z
    .string()
    .regex(/^G-[A-Z0-9]+$/, "VITE_GA_TRACKING_ID must be a GA4 measurement ID (e.g. G-XXXXXXXXXX)")
    .optional()
    .or(z.literal("")),
  VITE_STRIPE_PUBLISHABLE_KEY: z
    .string()
    .startsWith("pk_", "Must start with pk_")
    .optional()
    .or(z.literal("")),
  VITE_STRIPE_PORTAL_URL: z.string().url().optional().or(z.literal("")),
  VITE_TENOR_API_KEY: z.string().optional().or(z.literal("")),
});

export function validateEnv() {
  const result = envSchema.safeParse({
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_PUBLISHABLE_KEY: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    VITE_SENTRY_DSN: import.meta.env.VITE_SENTRY_DSN,
    VITE_GA_TRACKING_ID: import.meta.env.VITE_GA_TRACKING_ID,
    VITE_STRIPE_PUBLISHABLE_KEY: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY,
    VITE_STRIPE_PORTAL_URL: import.meta.env.VITE_STRIPE_PORTAL_URL,
    VITE_TENOR_API_KEY: import.meta.env.VITE_TENOR_API_KEY,
  });

  if (!result.success) {
    const errors = result.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Environment validation failed:\n${errors}`);
  }

  return result.data;
}
