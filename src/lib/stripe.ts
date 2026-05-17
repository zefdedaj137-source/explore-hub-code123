import { loadStripe } from "@stripe/stripe-js";
import { logger } from "@/lib/logger";

const key = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string;

if (!key) {
  logger.warn("VITE_STRIPE_PUBLISHABLE_KEY is not set");
}

export const stripePromise = loadStripe(key);
