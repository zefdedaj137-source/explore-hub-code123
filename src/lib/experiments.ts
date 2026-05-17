import { supabase } from "@/integrations/supabase/client";

export type ExperimentKey = "onboarding_prompt";
export type Variant = "A" | "B";

export const getOrCreateVariant = async (userId: string, key: ExperimentKey): Promise<Variant> => {
  const localKey = `exp_${key}_${userId}`;
  const cached = localStorage.getItem(localKey) as Variant | null;
  if (cached) return cached;

  const { data: existing } = await supabase
    .from("experiments")
    .select("variant")
    .eq("user_id", userId)
    .eq("key", key)
    .maybeSingle();

  if (existing?.variant) {
    localStorage.setItem(localKey, existing.variant as Variant);
    return existing.variant as Variant;
  }

  const variant: Variant = Math.random() < 0.5 ? "A" : "B";
  await supabase.from("experiments").insert({ user_id: userId, key, variant });
  localStorage.setItem(localKey, variant);
  return variant;
};
