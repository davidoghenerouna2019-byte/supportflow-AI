import 'dotenv/config';
import assert from 'node:assert/strict';
import http from 'node:http';
import { after, before, describe, it } from 'node:test';
import { createApp } from '../src/app.ts';

let server: http.Server;
let baseUrl = '';

async function request(
  path: string,
  options: RequestInit & { token?: string } = {}
) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }
  const res = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers,
  });
  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  return { status: res.status, body: json };
}

describe('Support Flow AI REST API & RBAC', () => {
  before(async () => {
    const app = createApp();
    server = http.createServer(app);
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const addr = server.address();
        if (addr && typeof addr === 'object') {
          baseUrl = `http://127.0.0.1:${addr.port}`;
        }
        resolve();
      });
    });
  });

  after(async () => {
    server.closeAllConnections?.();
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
    if (global._postgresPool) {
      await global._postgresPool.end();
    }
  });

  it('returns service health check', async () => {
    const res = await request('/api/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ok');
  });

  it('seeds and lists 5 active support departments and published-only KB for public visitors', async () => {
    const deptRes = await request('/api/departments');
    assert.equal(deptRes.status, 200);
    assert.ok(deptRes.body.departments.length >= 5);

    const kbRes = await request('/api/knowledge');
    assert.equal(kbRes.status, 200);
    assert.ok(kbRes.body.articles.length >= 20);
    assert.ok(
      kbRes.body.articles.every((a: { isPublished: boolean }) => a.isPublished === true),
      'Public visitors must only see published knowledge articles'
    );
  });

  it('registers, logs in, isolates customer conversations, and enforces RBAC', async () => {
    const uniqueEmail = `test-cust-${Date.now()}@example.com`;
    const regRes = await request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        fullName: 'Test Customer',
        email: uniqueEmail,
        password: 'TestPassword123!',
      }),
    });
    assert.equal(regRes.status, 201);
    assert.equal(regRes.body.user.role, 'CUSTOMER');
    const customerToken = regRes.body.token as string;

    // Customer cannot access admin analytics or agents list
    const analyticsBlocked = await request('/api/analytics/overview', {
      token: customerToken,
    });
    assert.equal(analyticsBlocked.status, 403);

    const agentsBlocked = await request('/api/agents', {
      token: customerToken,
    });
    assert.equal(agentsBlocked.status, 403);

    // Customer creates conversation & escalates to human support
    const convRes = await request('/api/conversations', {
      method: 'POST',
      token: customerToken,
      body: JSON.stringify({ subject: 'Billing VAT question' }),
    });
    assert.equal(convRes.status, 201);
    const convId = convRes.body.conversation.id as number;
    assert.ok(convRes.body.messages[0].message.includes('Support Flow AI'));

    const escRes = await request(`/api/conversations/${convId}/escalate`, {
      method: 'POST',
      token: customerToken,
      body: JSON.stringify({
        customerName: 'Test Customer',
        customerEmail: uniqueEmail,
        issueSummary: 'Need VAT invoice copy for April billing cycle.',
      }),
    });
    assert.equal(escRes.status, 200);
    assert.equal(escRes.body.conversation.status, 'ESCALATED');
    assert.equal(escRes.body.routedDepartment, 'Billing and Accounts');

    // Second customer cannot read first customer's conversation
    const secondEmail = `test-cust2-${Date.now()}@example.com`;
    const reg2Res = await request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        fullName: 'Second Customer',
        email: secondEmail,
        password: 'TestPassword123!',
      }),
    });
    const customer2Token = reg2Res.body.token as string;
    const crossRead = await request(`/api/conversations/${convId}`, {
      token: customer2Token,
    });
    assert.equal(crossRead.status, 403);
  });

  it('authenticates seeded admin and accesses live analytics, KB drafts, and routing rules', async () => {
    const loginRes = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'admin@supportflow.ai',
        password: process.env.DEMO_ADMIN_PASSWORD || 'AdminFlow2026!',
      }),
    });
    assert.equal(loginRes.status, 200);
    assert.equal(loginRes.body.user.role, 'ADMIN');
    const adminToken = loginRes.body.token as string;

    const ovRes = await request('/api/analytics/overview', {
      token: adminToken,
    });
    assert.equal(ovRes.status, 200);
    assert.ok(ovRes.body.overview.totalConversations >= 32);

    const kbAdminRes = await request('/api/knowledge', {
      token: adminToken,
    });
    assert.equal(kbAdminRes.status, 200);
    assert.ok(
      kbAdminRes.body.articles.some((a: { isPublished: boolean }) => a.isPublished === false),
      'Admin should see draft articles in KB management'
    );

    const rulesRes = await request('/api/routing-rules', {
      token: adminToken,
    });
    assert.equal(rulesRes.status, 200);
    assert.ok(rulesRes.body.rules.length >= 5);
  });

  it('persists public contact inquiries', async () => {
    const res = await request('/api/contact', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Amina Yusuf',
        email: 'amina@example.org',
        company: 'Lagos Ops',
        message: 'Interested in evaluating Support Flow AI for our support desk.',
      }),
    });
    assert.equal(res.status, 201);
    assert.ok(res.body.inquiry.id);
  });

  it('isolates guest chat sessions by conversation-scoped guestToken', async () => {
    const convA = await request('/api/conversations', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const convB = await request('/api/conversations', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    assert.equal(convA.status, 201);
    assert.equal(convB.status, 201);
    assert.ok(convA.body.guestToken);
    assert.ok(convB.body.guestToken);

    const readOwn = await request(`/api/conversations/${convA.body.conversation.id}`, {
      token: convA.body.guestToken,
    });
    assert.equal(readOwn.status, 200);

    const readOther = await request(`/api/conversations/${convA.body.conversation.id}`, {
      token: convB.body.guestToken,
    });
    assert.equal(readOther.status, 401);
  });

  it('enforces AGENT/ADMIN RBAC and supports CRUD + usage tracking for quick replies', async () => {
    const custEmail = `qr-cust-${Date.now()}@example.com`;
    const regCust = await request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        fullName: 'QR Test Customer',
        email: custEmail,
        password: 'TestPassword123!',
      }),
    });
    assert.equal(regCust.status, 201);
    const custBlocked = await request('/api/quick-replies', {
      token: regCust.body.token,
    });
    assert.equal(custBlocked.status, 403);

    const agentLogin = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'amara.okafor@supportflow.ai',
        password: process.env.DEMO_AGENT_PASSWORD || 'AgentFlow2026!',
      }),
    });
    assert.equal(agentLogin.status, 200);
    const agentToken = agentLogin.body.token as string;

    const listRes = await request('/api/quick-replies', { token: agentToken });
    assert.equal(listRes.status, 200);
    assert.ok(listRes.body.quickReplies.length >= 10);

    const createRes = await request('/api/quick-replies', {
      method: 'POST',
      token: agentToken,
      body: JSON.stringify({
        title: 'API Key Rotation Guide',
        shortcut: 'api-key-rotate',
        category: 'Technical',
        content: 'Hi {{customer_name}}, you can rotate API keys under Settings > Developer.',
      }),
    });
    assert.equal(createRes.status, 201);
    assert.equal(createRes.body.quickReply.shortcut, '/api-key-rotate');
    const createdId = createRes.body.quickReply.id as number;

    const useRes = await request(`/api/quick-replies/${createdId}/use`, {
      method: 'POST',
      token: agentToken,
    });
    assert.equal(useRes.status, 200);
    assert.equal(useRes.body.quickReply.usageCount, 1);

    const delRes = await request(`/api/quick-replies/${createdId}`, {
      method: 'DELETE',
      token: agentToken,
    });
    assert.equal(delRes.status, 200);
  });
});
