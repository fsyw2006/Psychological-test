import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  articles,
  assessmentCategories,
  assessments,
  membershipPlans
} from "../lib/demo-data";

type JsonValue = Record<string, unknown> | unknown[] | string | number | boolean | null;

const root = process.cwd();

function sql(value: string | number | boolean | null | undefined) {
  if (value === null || value === undefined) return "null";
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  return `'${value.replace(/'/g, "''")}'`;
}

function json(value: JsonValue) {
  return `${sql(JSON.stringify(value))}::jsonb`;
}

function textArray(values: string[]) {
  if (!values.length) return "ARRAY[]::text[]";
  return `ARRAY[${values.map(sql).join(", ")}]::text[]`;
}

function questionType(type: string) {
  if (type === "multiple") return "MULTIPLE";
  if (type === "likert") return "LIKERT";
  return "SINGLE";
}

function premiumContent(template: Record<string, unknown>) {
  return {
    traits: template.traits || [],
    strengths: template.strengths || [],
    risks: template.risks || [],
    growth: template.growth || [],
    careers: template.careers || [],
    relationships: template.relationships || []
  };
}

function buildSeedSql() {
  const lines: string[] = [
    "-- Soul House seed data",
    "-- Generated from lib/demo-data.ts. Do not edit by hand.",
    "",
    "begin;",
    ""
  ];

  assessmentCategories.forEach((category, index) => {
    lines.push(
      `insert into categories (slug, name, description, type, sort_order, updated_at) values (${sql(category.slug)}, ${sql(category.name)}, ${sql(category.description)}, 'TEST'::"CategoryType", ${index}, now())`,
      "on conflict (slug, type) do update set name = excluded.name, description = excluded.description, sort_order = excluded.sort_order, updated_at = now();",
      ""
    );
  });

  const articleCategories = ["情绪管理", "人际关系", "职场成长", "自我提升"];
  articleCategories.forEach((name, index) => {
    lines.push(
      `insert into categories (slug, name, type, sort_order, updated_at) values (${sql(name)}, ${sql(name)}, 'ARTICLE'::"CategoryType", ${index}, now())`,
      "on conflict (slug, type) do update set name = excluded.name, sort_order = excluded.sort_order, updated_at = now();",
      ""
    );
  });

  assessments.forEach((test) => {
    lines.push(
      `insert into tests (slug, title, subtitle, description, category_id, estimated_minutes, status, is_premium, price_cents, tags, scoring, report_templates, updated_at) values (` +
        [
          sql(test.slug),
          sql(test.title),
          sql(test.subtitle),
          sql(test.description),
          `(select id from categories where slug = ${sql(test.categorySlug)} and type = 'TEST'::"CategoryType" limit 1)`,
          test.estimatedMinutes,
          `'PUBLISHED'::"TestStatus"`,
          Boolean(test.isPremium),
          test.priceCents || 0,
          textArray(test.tags),
          json(test.scoring),
          json(test.reportTemplates),
          "now()"
        ].join(", ") +
        ")",
      "on conflict (slug) do update set title = excluded.title, subtitle = excluded.subtitle, description = excluded.description, category_id = excluded.category_id, estimated_minutes = excluded.estimated_minutes, status = excluded.status, is_premium = excluded.is_premium, price_cents = excluded.price_cents, tags = excluded.tags, scoring = excluded.scoring, report_templates = excluded.report_templates, updated_at = now();",
      `delete from questions where test_id = (select id from tests where slug = ${sql(test.slug)} limit 1);`
    );

    test.questions.forEach((question, index) => {
      lines.push(
        `insert into questions (test_id, "order", type, title, helper, required, min, max, dimension, options, updated_at) values (` +
          [
            `(select id from tests where slug = ${sql(test.slug)} limit 1)`,
            index + 1,
            `${sql(questionType(question.type))}::"QuestionType"`,
            sql(question.title),
            sql(question.helper),
            question.required ?? true,
            question.min ?? null,
            question.max ?? null,
            sql(question.dimension),
            json(question.options),
            "now()"
          ].join(", ") +
          ");"
      );
    });

    lines.push(
      `delete from report_templates where test_id = (select id from tests where slug = ${sql(test.slug)} limit 1);`
    );

    Object.entries(test.reportTemplates).forEach(([resultType, template]) => {
      lines.push(
        `insert into report_templates (test_id, result_type, basic_content, premium_content, suggestions, category, is_active, updated_at) values (` +
          [
            `(select id from tests where slug = ${sql(test.slug)} limit 1)`,
            sql(resultType),
            json({ title: template.title, summary: template.summary }),
            json(premiumContent(template)),
            json(template.growth),
            sql(test.category),
            "true",
            "now()"
          ].join(", ") +
          ");"
      );
    });

    lines.push("");
  });

  articles.forEach((article) => {
    lines.push(
      `insert into articles (slug, title, excerpt, content, category_id, tags, reading_minutes, status, published_at, updated_at) values (` +
        [
          sql(article.slug),
          sql(article.title),
          sql(article.excerpt),
          sql(article.content),
          `(select id from categories where slug = ${sql(article.category)} and type = 'ARTICLE'::"CategoryType" limit 1)`,
          textArray(article.tags),
          article.readingMinutes,
          `'PUBLISHED'::"ArticleStatus"`,
          sql(article.publishedAt),
          "now()"
        ].join(", ") +
        ")",
      "on conflict (slug) do update set title = excluded.title, excerpt = excluded.excerpt, content = excluded.content, category_id = excluded.category_id, tags = excluded.tags, reading_minutes = excluded.reading_minutes, status = excluded.status, published_at = excluded.published_at, updated_at = now();",
      ""
    );
  });

  membershipPlans.forEach((plan, index) => {
    lines.push(
      `insert into plans (slug, name, plan_type, price_cents, period, description, features, is_active, sort_order, updated_at) values (` +
        [
          sql(plan.slug),
          sql(plan.name),
          sql(plan.slug),
          plan.priceCents,
          sql(plan.period),
          sql(plan.description),
          textArray(plan.features),
          "true",
          index,
          "now()"
        ].join(", ") +
        ")",
      "on conflict (slug) do update set name = excluded.name, plan_type = excluded.plan_type, price_cents = excluded.price_cents, period = excluded.period, description = excluded.description, features = excluded.features, is_active = excluded.is_active, sort_order = excluded.sort_order, updated_at = now();",
      ""
    );
  });

  const pricingConfig = { plans: membershipPlans, dailyFreeTests: 1 };
  const safetyPrompt =
    "你不是医生，也不能诊断疾病。你只能提供情绪支持、自我觉察建议和心理健康科普。如用户表达自伤或伤害他人风险，应建议立即联系当地急救电话、专业机构或可信赖的人。";
  const aiSettings = {
    aiChatEnabled: false,
    aiProvider: "mock",
    aiModel: "mock-companion",
    aiApiKey: "",
    aiSystemPrompt: safetyPrompt,
    freeChatLimit: 3,
    memberChatLimit: 50
  };
  const paymentChannels = {
    wechat: {
      enabled: false,
      appid: "",
      mchid: "",
      apiV3Key: "",
      serialNo: "",
      privateKey: "",
      platformPublicKey: "",
      notifyUrl: ""
    },
    alipay: {
      enabled: false,
      appId: "",
      privateKey: "",
      publicKey: "",
      notifyUrl: "",
      returnUrl: "",
      gateway: "https://openapi.alipay.com/gateway.do"
    }
  };

  [
    ["pricing_plans", pricingConfig, "会员套餐与单次解锁定价"],
    ["ai_settings", aiSettings, "AI 聊天隐藏功能配置"],
    ["payment_channels", paymentChannels, "后台收款通道配置"]
  ].forEach(([key, value, description]) => {
    lines.push(
      `insert into system_configs (key, value, description, updated_at) values (${sql(String(key))}, ${json(value as JsonValue)}, ${sql(String(description))}, now())`,
      "on conflict (key) do update set value = excluded.value, description = excluded.description, updated_at = now();",
      ""
    );
  });

  Object.entries({
    aiChatEnabled: false,
    aiProvider: "mock",
    aiModel: "mock-companion",
    aiApiKey: "",
    aiSystemPrompt: safetyPrompt,
    freeChatLimit: 3,
    memberChatLimit: 50
  }).forEach(([key, value]) => {
    lines.push(
      `insert into admin_configs (key, value, description, updated_at) values (${sql(key)}, ${json(value as JsonValue)}, ${sql("AI 聊天预留配置")}, now())`,
      "on conflict (key) do update set value = excluded.value, description = excluded.description, updated_at = now();"
    );
  });

  lines.push("", "commit;", "");
  return lines.join("\n");
}

const seedSql = buildSeedSql();
const rlsSql = readFileSync(join(root, "supabase", "rls.sql"), "utf8");
const initSql = readFileSync(join(root, "supabase", "migrations", "202606010000_init.sql"), "utf8");
const featureSql = readFileSync(
  join(root, "supabase", "migrations", "202606010001_feature_completion.sql"),
  "utf8"
);

writeFileSync(join(root, "supabase", "seed.sql"), seedSql, "utf8");
writeFileSync(
  join(root, "supabase", "migrations", "202606010002_seed_and_rls.sql"),
  `${seedSql}\n${rlsSql}`,
  "utf8"
);

const deploySql = `${initSql.trim()}\n\n${featureSql.trim()}\n\n${seedSql.trim()}\n\n${rlsSql.trim()}\n`;
writeFileSync(join(root, "supabase", "deploy.sql"), deploySql, "utf8");
writeFileSync(join(root, "supabase", "COPY_TO_SUPABASE.sql"), deploySql, "utf8");

console.log("Generated Supabase seed and deploy SQL.");
