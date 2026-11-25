import { asc, eq } from 'drizzle-orm';
import { db } from '../../../src/db/index.ts';
import { departments, routingRules } from '../../../src/db/schema.ts';

export interface RoutingResolution {
  departmentId: number | null;
  departmentName: string;
  matchedRuleId: number | null;
  source: 'ROUTING_RULE' | 'AI_RECOMMENDATION' | 'DEFAULT_FALLBACK';
}

export async function resolveDepartmentRouting(params: {
  messageText: string;
  classifiedCategory: string;
  aiRecommendedDepartment: string;
}): Promise<RoutingResolution> {
  const activeDepartments = await db
    .select()
    .from(departments)
    .where(eq(departments.isActive, true));

  const deptById = new Map(activeDepartments.map((d) => [d.id, d]));
  const deptByNameLower = new Map(
    activeDepartments.map((d) => [d.name.toLowerCase(), d])
  );

  const activeRules = await db
    .select()
    .from(routingRules)
    .where(eq(routingRules.isActive, true))
    .orderBy(asc(routingRules.priority));

  const msgLower = params.messageText.toLowerCase();
  const catLower = params.classifiedCategory.toLowerCase();

  // 1. Check keyword & category matches against active configured routing rules
  let bestRule: { ruleId: number; departmentId: number; score: number } | null = null;

  for (const rule of activeRules) {
    const targetDept = deptById.get(rule.departmentId);
    if (!targetDept) continue;

    let score = 0;
    const ruleCatLower = rule.category.toLowerCase();
    if (
      ruleCatLower === catLower ||
      catLower.includes(ruleCatLower) ||
      ruleCatLower.includes(catLower)
    ) {
      score += 5;
    }

    const keywords = rule.keywords
      .split(',')
      .map((k) => k.trim().toLowerCase())
      .filter(Boolean);

    for (const kw of keywords) {
      if (msgLower.includes(kw)) {
        score += 4;
      }
    }

    if (score > 0 && (!bestRule || score > bestRule.score)) {
      bestRule = {
        ruleId: rule.id,
        departmentId: rule.departmentId,
        score,
      };
    }
  }

  if (bestRule) {
    const dept = deptById.get(bestRule.departmentId)!;
    return {
      departmentId: dept.id,
      departmentName: dept.name,
      matchedRuleId: bestRule.ruleId,
      source: 'ROUTING_RULE',
    };
  }

  // 2. Respect AI recommendation if it matches an active department
  const aiMatch = deptByNameLower.get(
    params.aiRecommendedDepartment.trim().toLowerCase()
  );
  if (aiMatch) {
    return {
      departmentId: aiMatch.id,
      departmentName: aiMatch.name,
      matchedRuleId: null,
      source: 'AI_RECOMMENDATION',
    };
  }

  // 3. Fallback to General Support or first active department
  const generalDept =
    deptByNameLower.get('general support') ?? activeDepartments[0] ?? null;

  return {
    departmentId: generalDept ? generalDept.id : null,
    departmentName: generalDept ? generalDept.name : 'General Support',
    matchedRuleId: null,
    source: 'DEFAULT_FALLBACK',
  };
}
