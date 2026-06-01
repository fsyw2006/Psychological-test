import { membershipPlans } from "@/lib/demo-data";
import { ensureContentSeeded } from "@/lib/bootstrap";
import { hasServiceRoleEnv } from "@/lib/env";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import type { MembershipPlan, PlanSlug } from "@/lib/types";

export type PricingConfig = {
  plans: MembershipPlan[];
  dailyFreeTests: number;
};

export type PricingConfigInput = {
  plans?: Partial<MembershipPlan>[];
  dailyFreeTests?: number;
};

const CONFIG_KEY = "pricing_plans";
let memoryPricingConfig: PricingConfig | null = null;

function defaultPricingConfig(): PricingConfig {
  return {
    plans: membershipPlans,
    dailyFreeTests: 1
  };
}

function sanitizePrice(value: unknown) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return 0;
  return Math.round(number);
}

function normalizePlans(input?: Partial<MembershipPlan>[]) {
  const base = defaultPricingConfig().plans;
  const patches = new Map((input || []).map((plan) => [plan.slug, plan]));

  return base.map((plan) => {
    const patch = patches.get(plan.slug);
    if (!patch) return plan;

    return {
      ...plan,
      ...patch,
      slug: plan.slug,
      priceCents: sanitizePrice(patch.priceCents ?? plan.priceCents),
      features:
        Array.isArray(patch.features) && patch.features.length
          ? patch.features.map(String)
          : plan.features,
      highlighted: Boolean(patch.highlighted ?? plan.highlighted)
    };
  });
}

function normalizeConfig(input: PricingConfigInput | null | undefined): PricingConfig {
  return {
    plans: normalizePlans(input?.plans),
    dailyFreeTests: Math.max(1, Math.round(Number(input?.dailyFreeTests || 1)))
  };
}

async function loadStoredPricing() {
  if (!hasServiceRoleEnv()) return memoryPricingConfig;

  await ensureContentSeeded();
  const supabase = createSupabaseServiceClient();
  const { data } = await supabase
    .from("system_configs")
    .select("value")
    .eq("key", CONFIG_KEY)
    .maybeSingle();

  return data?.value ? normalizeConfig(data.value as PricingConfigInput) : null;
}

export async function getPricingConfig(): Promise<PricingConfig> {
  return normalizeConfig((await loadStoredPricing()) || defaultPricingConfig());
}

export async function getMembershipPlans() {
  const config = await getPricingConfig();
  return config.plans;
}

export async function getPlanBySlug(slug: PlanSlug) {
  const plans = await getMembershipPlans();
  return plans.find((plan) => plan.slug === slug) || null;
}

export async function savePricingConfig(input: PricingConfigInput) {
  const next = normalizeConfig(input);

  if (!hasServiceRoleEnv()) {
    memoryPricingConfig = next;
    return next;
  }

  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("system_configs").upsert(
    {
      key: CONFIG_KEY,
      value: next,
      description: "会员套餐与单次解锁定价"
    },
    {
      onConflict: "key"
    }
  );

  if (error) throw new Error(error.message);
  return next;
}
