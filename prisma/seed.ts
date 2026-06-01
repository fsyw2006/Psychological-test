import { PrismaClient } from "@prisma/client";
import { articles, assessmentCategories, assessments, membershipPlans } from "../lib/demo-data";

const prisma = new PrismaClient();

async function main() {
  const testCategories = new Map<string, string>();

  for (const [index, category] of assessmentCategories.entries()) {
    const row = await prisma.category.upsert({
      where: {
        slug_type: {
          slug: category.slug,
          type: "TEST"
        }
      },
      update: {
        name: category.name,
        description: category.description,
        sortOrder: index
      },
      create: {
        slug: category.slug,
        name: category.name,
        description: category.description,
        type: "TEST",
        sortOrder: index
      }
    });
    testCategories.set(category.slug, row.id);
  }

  const articleCategories = new Map<string, string>();
  for (const [index, name] of ["情绪管理", "人际关系", "职场成长", "自我提升"].entries()) {
    const row = await prisma.category.upsert({
      where: {
        slug_type: {
          slug: name,
          type: "ARTICLE"
        }
      },
      update: {
        name,
        sortOrder: index
      },
      create: {
        slug: name,
        name,
        type: "ARTICLE",
        sortOrder: index
      }
    });
    articleCategories.set(name, row.id);
  }

  for (const test of assessments) {
    const categoryId = testCategories.get(test.categorySlug);
    if (!categoryId) continue;

    const row = await prisma.test.upsert({
      where: { slug: test.slug },
      update: {
        title: test.title,
        subtitle: test.subtitle,
        description: test.description,
        categoryId,
        estimatedMinutes: test.estimatedMinutes,
        status: "PUBLISHED",
        isPremium: Boolean(test.isPremium),
        priceCents: test.priceCents || 0,
        tags: test.tags,
        scoring: test.scoring,
        reportTemplates: test.reportTemplates
      },
      create: {
        slug: test.slug,
        title: test.title,
        subtitle: test.subtitle,
        description: test.description,
        categoryId,
        estimatedMinutes: test.estimatedMinutes,
        status: "PUBLISHED",
        isPremium: Boolean(test.isPremium),
        priceCents: test.priceCents || 0,
        tags: test.tags,
        scoring: test.scoring,
        reportTemplates: test.reportTemplates
      }
    });

    await prisma.question.deleteMany({
      where: {
        testId: row.id
      }
    });

    for (const [index, question] of test.questions.entries()) {
      await prisma.question.create({
        data: {
          testId: row.id,
          order: index + 1,
          type:
            question.type === "single"
              ? "SINGLE"
              : question.type === "multiple"
                ? "MULTIPLE"
                : "LIKERT",
          title: question.title,
          helper: question.helper,
          required: question.required ?? true,
          min: question.min,
          max: question.max,
          dimension: question.dimension,
          options: question.options
        }
      });
    }
  }

  for (const article of articles) {
    const categoryId = articleCategories.get(article.category);
    if (!categoryId) continue;

    await prisma.article.upsert({
      where: { slug: article.slug },
      update: {
        title: article.title,
        excerpt: article.excerpt,
        content: article.content,
        categoryId,
        tags: article.tags,
        readingMinutes: article.readingMinutes,
        status: "PUBLISHED",
        publishedAt: new Date(article.publishedAt)
      },
      create: {
        slug: article.slug,
        title: article.title,
        excerpt: article.excerpt,
        content: article.content,
        categoryId,
        tags: article.tags,
        readingMinutes: article.readingMinutes,
        status: "PUBLISHED",
        publishedAt: new Date(article.publishedAt)
      }
    });
  }

  await prisma.systemConfig.upsert({
    where: { key: "pricing_plans" },
    update: {
      value: {
        plans: membershipPlans,
        dailyFreeTests: 1
      }
    },
    create: {
      key: "pricing_plans",
      value: {
        plans: membershipPlans,
        dailyFreeTests: 1
      },
      description: "会员套餐与单次解锁定价"
    }
  });

  for (const [index, plan] of membershipPlans.entries()) {
    await prisma.plan.upsert({
      where: { slug: plan.slug },
      update: {
        name: plan.name,
        planType: plan.slug,
        priceCents: plan.priceCents,
        period: plan.period,
        description: plan.description,
        features: plan.features,
        isActive: true,
        sortOrder: index
      },
      create: {
        slug: plan.slug,
        name: plan.name,
        planType: plan.slug,
        priceCents: plan.priceCents,
        period: plan.period,
        description: plan.description,
        features: plan.features,
        isActive: true,
        sortOrder: index
      }
    });
  }

  await prisma.systemConfig.upsert({
    where: { key: "ai_settings" },
    update: {
      value: {
        aiChatEnabled: false,
        aiProvider: "mock",
        aiModel: "mock-companion",
        aiApiKey: "",
        aiSystemPrompt:
          "你不是医生，也不能诊断疾病。你只能提供情绪支持、自我觉察建议和心理健康科普。如用户表达自伤或伤害他人风险，应建议立即联系当地急救电话、专业机构或可信赖的人。",
        freeChatLimit: 3,
        memberChatLimit: 50
      }
    },
    create: {
      key: "ai_settings",
      value: {
        aiChatEnabled: false,
        aiProvider: "mock",
        aiModel: "mock-companion",
        aiApiKey: "",
        aiSystemPrompt:
          "你不是医生，也不能诊断疾病。你只能提供情绪支持、自我觉察建议和心理健康科普。如用户表达自伤或伤害他人风险，应建议立即联系当地急救电话、专业机构或可信赖的人。",
        freeChatLimit: 3,
        memberChatLimit: 50
      },
      description: "AI 聊天隐藏功能配置"
    }
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
