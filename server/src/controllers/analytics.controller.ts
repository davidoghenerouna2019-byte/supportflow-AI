import type { Response } from 'express';
import { db } from '../../../src/db/index.ts';
import { conversations, departments, users } from '../../../src/db/schema.ts';
import type { AuthRequest } from '../middleware/auth.ts';
import { ensureSeeded } from '../services/seed.service.ts';

export async function getAnalyticsOverview(_req: AuthRequest, res: Response) {
  await ensureSeeded();

  const allConversations = await db.select().from(conversations);
  const allUsers = await db
    .select({
      id: users.id,
      role: users.role,
      isActive: users.isActive,
    })
    .from(users);

  const totalConversations = allConversations.length;
  const openConversations = allConversations.filter(
    (c) => c.status === 'OPEN' || c.status === 'ESCALATED' || c.status === 'ASSIGNED'
  ).length;
  const pendingConversations = allConversations.filter(
    (c) => c.status === 'PENDING'
  ).length;
  const resolvedConversations = allConversations.filter(
    (c) => c.status === 'RESOLVED' || c.status === 'CLOSED'
  ).length;

  const activeCustomers = allUsers.filter(
    (u) => u.role === 'CUSTOMER' && u.isActive
  ).length;
  const totalAgents = allUsers.filter(
    (u) => (u.role === 'AGENT' || u.role === 'ADMIN') && u.isActive
  ).length;

  const aiResolvedCount = allConversations.filter(
    (c) => c.resolutionType === 'AI_RESOLVED'
  ).length;
  const agentResolvedCount = allConversations.filter(
    (c) => c.resolutionType === 'AGENT_RESOLVED'
  ).length;
  const escalatedCount = allConversations.filter(
    (c) => c.status === 'ESCALATED' || c.resolutionType === 'AGENT_RESOLVED'
  ).length;

  const aiResolutionRate =
    resolvedConversations > 0
      ? Math.round((aiResolvedCount / resolvedConversations) * 100)
      : 0;

  const escalationRate =
    totalConversations > 0
      ? Math.round((escalatedCount / totalConversations) * 100)
      : 0;

  const withFirstResponse = allConversations.filter(
    (c) => typeof c.firstResponseMs === 'number' && c.firstResponseMs > 0
  );
  const avgFirstResponseMs =
    withFirstResponse.length > 0
      ? Math.round(
          withFirstResponse.reduce((acc, c) => acc + (c.firstResponseMs ?? 0), 0) /
            withFirstResponse.length
        )
      : 0;

  const resolvedWithDuration = allConversations.filter(
    (c) => c.resolvedAt && c.createdAt
  );
  const avgResolutionMinutes =
    resolvedWithDuration.length > 0
      ? Math.round(
          resolvedWithDuration.reduce((acc, c) => {
            const diffMs =
              new Date(c.resolvedAt!).getTime() - new Date(c.createdAt).getTime();
            return acc + Math.max(1, diffMs / 60_000);
          }, 0) / resolvedWithDuration.length
        )
      : 0;

  return res.json({
    overview: {
      totalConversations,
      openConversations,
      pendingConversations,
      resolvedConversations,
      activeCustomers,
      totalAgents,
      aiResolvedCount,
      agentResolvedCount,
      aiResolutionRate,
      escalationRate,
      avgFirstResponseMs,
      avgResolutionMinutes,
      proposedTargets: {
        firstResponseReductionTarget: '50% median first-response reduction within 90 days of launch',
        aiResolutionTarget: '60% routine enquiries resolved without human hand-off within 90 days of launch',
      },
    },
  });
}

export async function getConversationsAnalytics(_req: AuthRequest, res: Response) {
  await ensureSeeded();

  const allConversations = await db.select().from(conversations);

  // Conversations over time (last 14 days grouped by YYYY-MM-DD)
  const dayMap = new Map<
    string,
    { date: string; total: number; aiResolved: number; agentHandled: number }
  >();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400_000);
    const key = d.toISOString().slice(0, 10);
    dayMap.set(key, { date: key, total: 0, aiResolved: 0, agentHandled: 0 });
  }

  for (const c of allConversations) {
    const key = new Date(c.createdAt).toISOString().slice(0, 10);
    const bucket = dayMap.get(key);
    if (bucket) {
      bucket.total += 1;
      if (c.resolutionType === 'AI_RESOLVED') {
        bucket.aiResolved += 1;
      } else {
        bucket.agentHandled += 1;
      }
    }
  }

  // Enquiries by category
  const categoryMap = new Map<string, number>();
  for (const c of allConversations) {
    categoryMap.set(c.category, (categoryMap.get(c.category) ?? 0) + 1);
  }
  const byCategory = Array.from(categoryMap.entries()).map(([category, count]) => ({
    category,
    count,
  }));

  // Status distribution
  const statusMap = new Map<string, number>();
  for (const c of allConversations) {
    statusMap.set(c.status, (statusMap.get(c.status) ?? 0) + 1);
  }
  const byStatus = Array.from(statusMap.entries()).map(([status, count]) => ({
    status,
    count,
  }));

  // AI vs Agent Resolution breakdown
  const aiResolved = allConversations.filter(
    (c) => c.resolutionType === 'AI_RESOLVED'
  ).length;
  const agentResolved = allConversations.filter(
    (c) => c.resolutionType === 'AGENT_RESOLVED'
  ).length;
  const activeInProgress = allConversations.filter(
    (c) => !c.resolutionType
  ).length;

  return res.json({
    overTime: Array.from(dayMap.values()),
    byCategory,
    byStatus,
    resolutionSplit: [
      { name: 'AI Resolved', value: aiResolved },
      { name: 'Agent Resolved', value: agentResolved },
      { name: 'In Progress', value: activeInProgress },
    ],
  });
}

export async function getPerformanceAnalytics(_req: AuthRequest, res: Response) {
  await ensureSeeded();

  const allConversations = await db.select().from(conversations);
  const deptRows = await db.select().from(departments);
  const agentRows = await db
    .select({
      id: users.id,
      fullName: users.fullName,
      email: users.email,
      departmentId: users.departmentId,
      role: users.role,
    })
    .from(users);

  const deptPerformance = deptRows.map((d) => {
    const deptConvs = allConversations.filter((c) => c.departmentId === d.id);
    const resolved = deptConvs.filter(
      (c) => c.status === 'RESOLVED' || c.status === 'CLOSED'
    );
    const escalated = deptConvs.filter((c) => c.status === 'ESCALATED');
    const avgFirstMs =
      deptConvs.length > 0
        ? Math.round(
            deptConvs.reduce((acc, c) => acc + (c.firstResponseMs ?? 0), 0) /
              deptConvs.length
          )
        : 0;

    return {
      departmentId: d.id,
      departmentName: d.name,
      total: deptConvs.length,
      resolved: resolved.length,
      escalated: escalated.length,
      avgFirstResponseMs: avgFirstMs,
    };
  });

  const deptNameMap = new Map(deptRows.map((d) => [d.id, d.name]));
  const agentPerformance = agentRows
    .filter((u) => u.role === 'AGENT' || u.role === 'ADMIN')
    .map((a) => {
      const assigned = allConversations.filter((c) => c.assignedAgentId === a.id);
      const resolved = assigned.filter(
        (c) => c.status === 'RESOLVED' || c.status === 'CLOSED'
      );
      return {
        agentId: a.id,
        fullName: a.fullName,
        departmentName: a.departmentId
          ? deptNameMap.get(a.departmentId) ?? 'General'
          : 'General',
        assignedCount: assigned.length,
        resolvedCount: resolved.length,
        activeQueue: assigned.length - resolved.length,
      };
    });

  return res.json({
    departmentPerformance: deptPerformance,
    agentPerformance,
  });
}
