import bcrypt from 'bcryptjs';
import { count } from 'drizzle-orm';
import { db } from '../../../src/db/index.ts';
import {
  assignments,
  auditLogs,
  conversationNotes,
  conversations,
  departments,
  knowledgeArticles,
  messages,
  quickReplies,
  routingRules,
  users,
} from '../../../src/db/schema.ts';

let seedPromise: Promise<void> | null = null;

export async function ensureSeeded(): Promise<void> {
  if (seedPromise) {
    return seedPromise;
  }

  seedPromise = runIdempotentSeed().catch((err) => {
    seedPromise = null;
    console.error('Seed check error:', err);
  });

  return seedPromise;
}

async function runIdempotentSeed(): Promise<void> {
  const [{ value: deptCount }] = await db
    .select({ value: count() })
    .from(departments);

  if (Number(deptCount) > 0) {
    await ensureQuickRepliesSeeded();
    return;
  }

  console.log('Seeding Support Flow AI demo dataset into Cloud SQL...');

  const adminPasswordHash = await bcrypt.hash(
    process.env.DEMO_ADMIN_PASSWORD || 'AdminFlow2026!',
    10
  );
  const agentPasswordHash = await bcrypt.hash(
    process.env.DEMO_AGENT_PASSWORD || 'AgentFlow2026!',
    10
  );
  const customerPasswordHash = await bcrypt.hash(
    process.env.DEMO_CUSTOMER_PASSWORD || 'CustomerFlow2026!',
    10
  );

  // 1. Five Support Departments
  const insertedDepts = await db
    .insert(departments)
    .values([
      {
        name: 'General Support',
        description:
          'First-line assistance for onboarding, workspace navigation, and general enquiries.',
        isActive: true,
      },
      {
        name: 'Technical Support',
        description:
          'API integrations, webhooks, SSO configuration, and platform troubleshooting.',
        isActive: true,
      },
      {
        name: 'Sales',
        description:
          'Plan comparisons, enterprise licensing, custom seat volume, and product demos.',
        isActive: true,
      },
      {
        name: 'Billing and Accounts',
        description:
          'Invoices, subscription renewals, VAT receipts, and account ownership updates.',
        isActive: true,
      },
      {
        name: 'Complaints and Customer Relations',
        description:
          'Escalated service complaints, SLA reviews, and formal customer resolutions.',
        isActive: true,
      },
    ])
    .returning();

  const deptMap = new Map(insertedDepts.map((d) => [d.name, d.id]));

  // 2. Administrator + Five Support Agents + Eight Customers
  const [adminUser] = await db
    .insert(users)
    .values({
      fullName: 'Ijirigho David Oghenerouna',
      email: 'admin@supportflow.ai',
      phone: '+234 800 555 0100',
      passwordHash: adminPasswordHash,
      role: 'ADMIN',
      departmentId: deptMap.get('General Support')!,
      isActive: true,
    })
    .returning();

  const agentUsers = await db
    .insert(users)
    .values([
      {
        fullName: 'Amara Okafor',
        email: 'amara.okafor@supportflow.ai',
        phone: '+234 800 555 0101',
        passwordHash: agentPasswordHash,
        role: 'AGENT',
        departmentId: deptMap.get('Technical Support')!,
        isActive: true,
      },
      {
        fullName: 'Daniel Mensah',
        email: 'daniel.mensah@supportflow.ai',
        phone: '+234 800 555 0102',
        passwordHash: agentPasswordHash,
        role: 'AGENT',
        departmentId: deptMap.get('Billing and Accounts')!,
        isActive: true,
      },
      {
        fullName: 'Clara Vance',
        email: 'clara.vance@supportflow.ai',
        phone: '+44 20 7946 0192',
        passwordHash: agentPasswordHash,
        role: 'AGENT',
        departmentId: deptMap.get('Sales')!,
        isActive: true,
      },
      {
        fullName: 'Tunde Adeyemi',
        email: 'tunde.adeyemi@supportflow.ai',
        phone: '+234 800 555 0104',
        passwordHash: agentPasswordHash,
        role: 'AGENT',
        departmentId: deptMap.get('Complaints and Customer Relations')!,
        isActive: true,
      },
      {
        fullName: 'Nadia Benali',
        email: 'nadia.benali@supportflow.ai',
        phone: '+44 20 7946 0199',
        passwordHash: agentPasswordHash,
        role: 'AGENT',
        departmentId: deptMap.get('General Support')!,
        isActive: true,
      },
    ])
    .returning();

  const customerUsers = await db
    .insert(users)
    .values([
      {
        fullName: 'Chidi Nwosu',
        email: 'chidi.nwosu@acme-retail.example',
        phone: '+234 803 412 8890',
        passwordHash: customerPasswordHash,
        role: 'CUSTOMER',
        isActive: true,
      },
      {
        fullName: 'Hannah Patel',
        email: 'hannah.patel@northbridge.example',
        phone: '+44 7700 900412',
        passwordHash: customerPasswordHash,
        role: 'CUSTOMER',
        isActive: true,
      },
      {
        fullName: 'Kofi Boateng',
        email: 'kofi@accrafintech.example',
        phone: '+233 24 555 0144',
        passwordHash: customerPasswordHash,
        role: 'CUSTOMER',
        isActive: true,
      },
      {
        fullName: 'Elena Morales',
        email: 'elena@solarislogistics.example',
        phone: '+1 415 555 0178',
        passwordHash: customerPasswordHash,
        role: 'CUSTOMER',
        isActive: true,
      },
      {
        fullName: 'Sadiq Bello',
        email: 'sadiq@kanohealth.example',
        phone: '+234 809 331 7721',
        passwordHash: customerPasswordHash,
        role: 'CUSTOMER',
        isActive: true,
      },
      {
        fullName: 'Mei Lin',
        email: 'mei.lin@pacificcloud.example',
        phone: '+65 6789 0123',
        passwordHash: customerPasswordHash,
        role: 'CUSTOMER',
        isActive: true,
      },
      {
        fullName: 'Marcus Sterling',
        email: 'm.sterling@veritasmedia.example',
        phone: '+1 212 555 0193',
        passwordHash: customerPasswordHash,
        role: 'CUSTOMER',
        isActive: true,
      },
      {
        fullName: 'Zainab Ibrahim',
        email: 'zainab@lagoscommerce.example',
        phone: '+234 812 901 3345',
        passwordHash: customerPasswordHash,
        role: 'CUSTOMER',
        isActive: true,
      },
    ])
    .returning();

  // 3. Routing Rules
  await db.insert(routingRules).values([
    {
      category: 'Technical',
      keywords: 'api, webhook, error, 500, timeout, sso, integration, sdk, bug, crash, login',
      departmentId: deptMap.get('Technical Support')!,
      priority: 1,
      isActive: true,
    },
    {
      category: 'Billing',
      keywords: 'invoice, billing, payment, charge, refund, receipt, subscription, renewal, vat, card',
      departmentId: deptMap.get('Billing and Accounts')!,
      priority: 2,
      isActive: true,
    },
    {
      category: 'Sales',
      keywords: 'pricing, plan, quote, enterprise, demo, upgrade, seats, discount, trial',
      departmentId: deptMap.get('Sales')!,
      priority: 3,
      isActive: true,
    },
    {
      category: 'Complaints',
      keywords: 'complaint, unacceptable, frustrated, escalate, manager, sla, delay, disappointed',
      departmentId: deptMap.get('Complaints and Customer Relations')!,
      priority: 4,
      isActive: true,
    },
    {
      category: 'General',
      keywords: 'hours, help, onboarding, guide, start, workspace, profile, settings',
      departmentId: deptMap.get('General Support')!,
      priority: 5,
      isActive: true,
    },
  ]);

  // 4. 22 Knowledge Base Articles (20 Published, 2 Drafts; fictional FlowCloud Suite policies)
  await db.insert(knowledgeArticles).values([
    {
      title: 'Workspace Operating Hours & Live Support Availability',
      category: 'General',
      question: 'What are Support Flow AI human support operating hours?',
      answer:
        'Our AI assistant operates 24/7. Live human support agents in General Support, Technical Support, and Billing are available Monday through Friday from 08:00 to 20:00 WAT/GMT, with priority weekend coverage for Enterprise SLA accounts.',
      keywords: 'hours, support hours, availability, weekend, live agent, schedule',
      isPublished: true,
    },
    {
      title: 'Resetting Your Account Password',
      category: 'General',
      question: 'How do I reset my Support Flow AI or FlowCloud account password?',
      answer:
        'On the Sign In screen, click "Forgot Password" or contact your workspace administrator if your organization enforces Google SSO. Password reset links remain valid for 30 minutes and require at least 8 characters.',
      keywords: 'password, reset, forgot password, login, sign in, locked out',
      isPublished: true,
    },
    {
      title: 'Enabling Two-Factor Authentication (2FA)',
      category: 'Technical',
      question: 'How do I enable two-factor authentication on my account?',
      answer:
        'Navigate to Settings > Security and select "Enable Authenticator App". Scan the QR code using any TOTP-compatible authenticator app (such as Google Authenticator or Authy) and store your 8 single-use recovery codes safely.',
      keywords: '2fa, two factor, mfa, security, authenticator, otp',
      isPublished: true,
    },
    {
      title: 'FlowCloud Plan Tiers & Pricing Overview (Demo Policy)',
      category: 'Sales',
      question: 'What subscription plans are available in this demo platform?',
      answer:
        'Fictional Demo Plans for FlowCloud Suite: Starter ($29/month for up to 3 agents and 1,000 AI-assisted conversations), Growth ($99/month for up to 15 agents, custom routing rules, and analytics exports), and Enterprise (custom annual pricing with dedicated SLA and SSO). Note: Payment processing is disabled in this demo release.',
      keywords: 'pricing, plans, cost, starter, growth, enterprise, subscription',
      isPublished: true,
    },
    {
      title: '14-Day Free Evaluation Trial Policy (Demo Policy)',
      category: 'Sales',
      question: 'Do you offer a free trial before purchasing a team plan?',
      answer:
        'Yes. Under our fictional demo terms, new business workspaces include a 14-day Growth evaluation period with full access to knowledge-base retrieval and routing rules. No payment card is required to begin the evaluation.',
      keywords: 'trial, free trial, demo, evaluation, test',
      isPublished: true,
    },
    {
      title: 'Adding or Removing Support Agents',
      category: 'General',
      question: 'How does an administrator add new support agents to a department?',
      answer:
        'Workspace administrators can open Dashboard > Support Agents, click "Add Support Agent", enter the agent’s full name, work email, temporary password, and assign them to an active department. Agents can be deactivated anytime without deleting historical ticket records.',
      keywords: 'add agent, team member, invite, department, role, admin',
      isPublished: true,
    },
    {
      title: 'REST API Authentication & Bearer Tokens',
      category: 'Technical',
      question: 'How do I authenticate requests to the FlowCloud REST API?',
      answer:
        'All protected API requests require an Authorization header using the format "Authorization: Bearer <token>". API keys and signing credentials must remain on your server and must never be embedded in client-side browser code.',
      keywords: 'api, authentication, bearer, token, rest, integration, header',
      isPublished: true,
    },
    {
      title: 'Webhook Delivery Retries & Signature Verification',
      category: 'Technical',
      question: 'How do webhook retries work when our endpoint returns an error?',
      answer:
        'When a webhook destination returns a non-2xx HTTP status or times out after 10 seconds, FlowCloud retries delivery up to 5 times using exponential backoff (1m, 5m, 15m, 1h, 4h). Verify the X-FlowCloud-Signature HMAC-SHA256 header before processing payloads.',
      keywords: 'webhook, retry, timeout, signature, hmac, 500, endpoint',
      isPublished: true,
    },
    {
      title: 'API Rate Limits by Workspace Tier',
      category: 'Technical',
      question: 'What are the API rate limits and how do I handle 429 responses?',
      answer:
        'Standard demo workspace endpoints allow 120 requests per minute per IP and 600 requests per minute per authenticated workspace. If you receive HTTP 429 Too Many Requests, pause for the duration specified in the Retry-After header.',
      keywords: 'rate limit, 429, throttle, quota, api limit',
      isPublished: true,
    },
    {
      title: 'Invoice Schedule & Downloadable Receipts (Demo Policy)',
      category: 'Billing',
      question: 'When are monthly invoices generated and where can I download receipts?',
      answer:
        'Under our fictional billing policy, invoices are issued on the 1st of each billing cycle and emailed automatically to the workspace billing contact. Past PDF invoices and VAT summaries are listed under Billing > Invoice History.',
      keywords: 'invoice, receipt, pdf, vat, billing cycle, statement',
      isPublished: true,
    },
    {
      title: 'Refund & Cancellation Policy (Demo Policy)',
      category: 'Billing',
      question: 'What is the refund and subscription cancellation policy?',
      answer:
        'Under our fictional demo terms, monthly plans may be cancelled before the next renewal date with no penalty, and service remains active until the end of the paid period. Annual plans are eligible for a prorated review within 14 days of initial purchase through Billing and Accounts.',
      keywords: 'refund, cancel, cancellation, money back, prorated, billing',
      isPublished: true,
    },
    {
      title: 'Updating Billing Email & Tax Identification Details',
      category: 'Billing',
      question: 'How do I change the email address that receives monthly invoices?',
      answer:
        'Workspace Owners or Admins can update the billing recipient email and company Tax/VAT ID in Settings > Billing Profile. Changes apply immediately to all subsequent invoices.',
      keywords: 'billing email, tax id, vat, update email, finance',
      isPublished: true,
    },
    {
      title: 'NDPA Data Protection & Customer Privacy Standards',
      category: 'General',
      question: 'How does Support Flow AI protect customer data under Nigeria NDPA?',
      answer:
        'Support Flow AI follows data minimization, purpose limitation, encrypted transport, hashed credential storage, and audit logging aligned with Nigeria Data Protection Act (NDPA) principles. Customers may request access or deletion of voluntary personal data via our Complaints and Customer Relations team.',
      keywords: 'ndpa, privacy, gdpr, data protection, compliance, security, deletion',
      isPublished: true,
    },
    {
      title: 'Data Retention & Conversation Archiving Policy',
      category: 'General',
      question: 'How long are customer chat transcripts retained?',
      answer:
        'Active support transcripts are retained for 24 months for service quality and auditability unless an administrator configures a shorter retention window or processes an approved customer erasure request.',
      keywords: 'retention, archive, delete data, history, transcript, storage',
      isPublished: true,
    },
    {
      title: 'How Automated Department Routing Works',
      category: 'Technical',
      question: 'How does Support Flow AI decide which department receives an escalated ticket?',
      answer:
        'Support Flow AI evaluates incoming enquiries against administrator-configured Routing Rules (matching keywords and classified categories by priority) and combines them with AI intent analysis. Authorized agents can reassign or transfer conversations between departments at any time.',
      keywords: 'routing, department, assignment, escalation, transfer, rules',
      isPublished: true,
    },
    {
      title: 'SLA Response Targets & Escalation Handling',
      category: 'Complaints',
      question: 'What happens when a conversation is escalated to a human agent?',
      answer:
        'Clicking "Talk to a Human" captures your contact details and summary, preserves the full AI conversation transcript, routes the conversation to the matched support department, and places it in the Live Inbox queue for an authorized agent.',
      keywords: 'escalate, human agent, sla, response time, live inbox, wait time',
      isPublished: true,
    },
    {
      title: 'Filing a Formal Service Complaint',
      category: 'Complaints',
      question: 'How can I submit a formal complaint or request a supervisor review?',
      answer:
        'You may request human escalation directly inside the support chat or email our Complaints and Customer Relations department. Escalated complaints are tagged with priority review and tracked in our audit log until resolved.',
      keywords: 'complaint, supervisor, manager, escalate, unhappy, formal',
      isPublished: true,
    },
    {
      title: 'Configuring Single Sign-On (Google Workspace)',
      category: 'Technical',
      question: 'Does Support Flow AI support Google Sign-In for agents and customers?',
      answer:
        'Yes. Users can sign in securely using Google Sign-In alongside standard email-and-password authentication. Role permissions (Admin, Agent, Customer) are strictly enforced on the server.',
      keywords: 'sso, google sign in, oauth, login, firebase',
      isPublished: true,
    },
    {
      title: 'Knowledge Base Publishing Workflow',
      category: 'General',
      question: 'Can administrators draft articles before making them visible to the AI assistant?',
      answer:
        'Yes. Knowledge base articles support Published and Draft states. The Gemini AI assistant retrieves answers exclusively from Published articles so unapproved drafts never reach customers.',
      keywords: 'knowledge base, draft, publish, article, rag, approved',
      isPublished: true,
    },
    {
      title: 'Custom Seat Volume & Enterprise Onboarding',
      category: 'Sales',
      question: 'How do we request custom pricing for more than 50 support agents?',
      answer:
        'For teams exceeding 50 agents or requiring dedicated database isolation, use the "Talk to a Human" button or our website Contact form to reach the Sales department for a tailored onboarding quote.',
      keywords: 'enterprise, 50 agents, custom quote, volume discount, onboarding',
      isPublished: true,
    },
    {
      title: 'Draft: Upcoming Mobile SDK v2 Release Notes',
      category: 'Technical',
      question: 'When will the Mobile SDK v2 be released?',
      answer:
        'Internal draft only — Mobile SDK v2 is scheduled for internal QA next quarter and is not yet approved for external customer commitments.',
      keywords: 'mobile sdk, roadmap, v2, draft',
      isPublished: false,
    },
    {
      title: 'Draft: Q4 Holiday Coverage Roster',
      category: 'General',
      question: 'What is the internal holiday shift schedule?',
      answer:
        'Internal draft roster for regional support leads pending final manager sign-off.',
      keywords: 'holiday, roster, internal, draft',
      isPublished: false,
    },
  ]);

  // 5. 32 Realistic Sample Conversations over the past 14 days
  const sampleSpecs = [
    {
      subject: 'Unable to verify webhook HMAC signature in Node.js',
      category: 'Technical',
      dept: 'Technical Support',
      agentIdx: 0,
      custIdx: 0,
      status: 'RESOLVED',
      resolutionType: 'AGENT_RESOLVED',
      priority: 'HIGH',
      daysAgo: 1,
      firstResponseMs: 1120,
      custMsg: 'Our endpoint keeps failing HMAC verification for webhook payloads.',
      aiMsg: 'Support Flow AI here: Make sure you compute the HMAC-SHA256 digest over the raw request body using your webhook secret and compare it against X-FlowCloud-Signature.',
      agentMsg: 'Hi Chidi, I reviewed your webhook header logs. Passing the raw buffer before JSON parsing resolved the mismatch — marking this resolved.',
    },
    {
      subject: 'Question about monthly VAT invoice download',
      category: 'Billing',
      dept: 'Billing and Accounts',
      agentIdx: 1,
      custIdx: 1,
      status: 'RESOLVED',
      resolutionType: 'AI_RESOLVED',
      priority: 'LOW',
      daysAgo: 1,
      firstResponseMs: 840,
      custMsg: 'Where can I download last month’s VAT invoice PDF?',
      aiMsg: 'Under our demo billing policy, monthly invoices are issued on the 1st of each cycle and can be downloaded anytime under Billing > Invoice History.',
      agentMsg: null,
    },
    {
      subject: 'Enterprise pricing quote for 65 support seats',
      category: 'Sales',
      dept: 'Sales',
      agentIdx: 2,
      custIdx: 2,
      status: 'ASSIGNED',
      resolutionType: null,
      priority: 'HIGH',
      daysAgo: 0,
      firstResponseMs: 920,
      custMsg: 'We have 65 support agents across Accra and Lagos and need an Enterprise quote.',
      aiMsg: 'For teams over 50 seats, our Sales department prepares tailored Enterprise onboarding quotes. I have tagged your enquiry for Sales.',
      agentMsg: 'Hello Kofi! Clara from Sales here. I am preparing a 65-seat annual proposal and will share the breakdown today.',
    },
    {
      subject: 'Repeated 429 rate limit errors during nightly sync',
      category: 'Technical',
      dept: 'Technical Support',
      agentIdx: 0,
      custIdx: 3,
      status: 'ESCALATED',
      resolutionType: null,
      priority: 'URGENT',
      daysAgo: 0,
      firstResponseMs: 980,
      custMsg: 'Our nightly CRM sync is hitting 429 rate limit errors every 10 minutes.',
      aiMsg: 'Standard workspaces allow 600 requests per minute per authenticated workspace. Please honor the Retry-After header or talk to a human agent to review burst limits.',
      agentMsg: null,
    },
    {
      subject: 'Complaint regarding delayed response on refund case',
      category: 'Complaints',
      dept: 'Complaints and Customer Relations',
      agentIdx: 3,
      custIdx: 4,
      status: 'ESCALATED',
      resolutionType: null,
      priority: 'URGENT',
      daysAgo: 0,
      firstResponseMs: 790,
      custMsg: 'This refund review has been waiting three days without an update. I want a supervisor.',
      aiMsg: 'I understand your frustration and recommend connecting immediately with our Complaints and Customer Relations team for priority supervisor review.',
      agentMsg: null,
    },
    {
      subject: 'How to enable 2FA for all workspace agents',
      category: 'Technical',
      dept: 'Technical Support',
      agentIdx: 0,
      custIdx: 5,
      status: 'RESOLVED',
      resolutionType: 'AI_RESOLVED',
      priority: 'MEDIUM',
      daysAgo: 2,
      firstResponseMs: 760,
      custMsg: 'How do we enable two-factor authentication on our accounts?',
      aiMsg: 'You can enable 2FA under Settings > Security by selecting "Enable Authenticator App", scanning the QR code, and saving your 8 recovery codes.',
      agentMsg: null,
    },
    {
      subject: 'Updating billing contact email after finance handover',
      category: 'Billing',
      dept: 'Billing and Accounts',
      agentIdx: 1,
      custIdx: 6,
      status: 'RESOLVED',
      resolutionType: 'AI_RESOLVED',
      priority: 'LOW',
      daysAgo: 2,
      firstResponseMs: 810,
      custMsg: 'How do we change the email address that receives our monthly invoices?',
      aiMsg: 'Workspace Admins can update the billing recipient email and Tax/VAT ID under Settings > Billing Profile. Updates apply immediately to future invoices.',
      agentMsg: null,
    },
    {
      subject: 'NDPA compliance documentation request for audit',
      category: 'General',
      dept: 'General Support',
      agentIdx: 4,
      custIdx: 7,
      status: 'RESOLVED',
      resolutionType: 'AGENT_RESOLVED',
      priority: 'MEDIUM',
      daysAgo: 3,
      firstResponseMs: 1050,
      custMsg: 'Do you have documentation on how customer chat data aligns with Nigeria NDPA?',
      aiMsg: 'Support Flow AI applies data minimization, encrypted transport, hashed credentials, and 24-month retention controls aligned with NDPA principles.',
      agentMsg: 'Hi Zainab, I attached our formal NDPA compliance summary packet to your account record.',
    },
    {
      subject: '14-day Growth trial expiration question',
      category: 'Sales',
      dept: 'Sales',
      agentIdx: 2,
      custIdx: 0,
      status: 'RESOLVED',
      resolutionType: 'AI_RESOLVED',
      priority: 'LOW',
      daysAgo: 3,
      firstResponseMs: 730,
      custMsg: 'Does the 14-day trial require a credit card upfront?',
      aiMsg: 'No payment card is required to begin the 14-day Growth evaluation trial in this demo platform.',
      agentMsg: null,
    },
    {
      subject: 'Password reset link expired after 30 minutes',
      category: 'General',
      dept: 'General Support',
      agentIdx: 4,
      custIdx: 1,
      status: 'CLOSED',
      resolutionType: 'AI_RESOLVED',
      priority: 'LOW',
      daysAgo: 4,
      firstResponseMs: 690,
      custMsg: 'My password reset link expired. How long are they valid?',
      aiMsg: 'Password reset links remain valid for 30 minutes. You can request a fresh link directly on the Sign In screen.',
      agentMsg: null,
    },
    {
      subject: 'Prorated cancellation inquiry for annual plan',
      category: 'Billing',
      dept: 'Billing and Accounts',
      agentIdx: 1,
      custIdx: 2,
      status: 'PENDING',
      resolutionType: null,
      priority: 'MEDIUM',
      daysAgo: 4,
      firstResponseMs: 910,
      custMsg: 'Can we request a prorated review on an annual plan purchased 9 days ago?',
      aiMsg: 'Annual plans are eligible for prorated review within 14 days of initial purchase through Billing and Accounts.',
      agentMsg: 'Hi Kofi, Daniel from Billing here. I am checking your workspace activation timestamp to process the review.',
    },
    {
      subject: 'Configuring Google Sign-In for support team',
      category: 'Technical',
      dept: 'Technical Support',
      agentIdx: 0,
      custIdx: 3,
      status: 'RESOLVED',
      resolutionType: 'AI_RESOLVED',
      priority: 'MEDIUM',
      daysAgo: 5,
      firstResponseMs: 850,
      custMsg: 'Can our agents sign in with Google Sign-In instead of creating new passwords?',
      aiMsg: 'Yes, Support Flow AI supports Google Sign-In alongside standard email-and-password authentication with server-enforced roles.',
      agentMsg: null,
    },
    {
      subject: 'Adding three new support agents to Billing dept',
      category: 'General',
      dept: 'General Support',
      agentIdx: 4,
      custIdx: 4,
      status: 'RESOLVED',
      resolutionType: 'AI_RESOLVED',
      priority: 'LOW',
      daysAgo: 5,
      firstResponseMs: 740,
      custMsg: 'How do I invite new agents and assign them to Billing?',
      aiMsg: 'Admins can open Dashboard > Support Agents, click "Add Support Agent", and assign the agent directly to an active department.',
      agentMsg: null,
    },
    {
      subject: 'Webhook retry interval after 503 outage',
      category: 'Technical',
      dept: 'Technical Support',
      agentIdx: 0,
      custIdx: 5,
      status: 'RESOLVED',
      resolutionType: 'AI_RESOLVED',
      priority: 'MEDIUM',
      daysAgo: 6,
      firstResponseMs: 820,
      custMsg: 'How many times does FlowCloud retry a failed webhook?',
      aiMsg: 'Failed webhooks are retried up to 5 times with exponential backoff (1m, 5m, 15m, 1h, 4h).',
      agentMsg: null,
    },
    {
      subject: 'Requesting SLA response review for weekend outage',
      category: 'Complaints',
      dept: 'Complaints and Customer Relations',
      agentIdx: 3,
      custIdx: 6,
      status: 'RESOLVED',
      resolutionType: 'AGENT_RESOLVED',
      priority: 'HIGH',
      daysAgo: 6,
      firstResponseMs: 1180,
      custMsg: 'We experienced a 40-minute delay on an urgent Saturday ticket and want an SLA review.',
      aiMsg: 'I am connecting your request to Complaints and Customer Relations for an official SLA review.',
      agentMsg: 'Hi Marcus, Tunde here. I completed the Saturday timeline audit and applied an SLA service credit note to your account.',
    },
    {
      subject: 'Draft knowledge base articles leaking check',
      category: 'General',
      dept: 'General Support',
      agentIdx: 4,
      custIdx: 7,
      status: 'CLOSED',
      resolutionType: 'AI_RESOLVED',
      priority: 'LOW',
      daysAgo: 7,
      firstResponseMs: 710,
      custMsg: 'Does the AI assistant read unpublished draft articles?',
      aiMsg: 'No. The Gemini assistant retrieves information exclusively from Published knowledge base articles.',
      agentMsg: null,
    },
    {
      subject: 'Bearer token rejected with 401 on staging server',
      category: 'Technical',
      dept: 'Technical Support',
      agentIdx: 0,
      custIdx: 0,
      status: 'OPEN',
      resolutionType: null,
      priority: 'HIGH',
      daysAgo: 0,
      firstResponseMs: 890,
      custMsg: 'Our staging job is getting HTTP 401 when calling /api/conversations.',
      aiMsg: 'Protected API routes require an Authorization: Bearer <token> header from an active authenticated session.',
      agentMsg: null,
    },
    {
      subject: 'Comparing Starter vs Growth plan conversation limits',
      category: 'Sales',
      dept: 'Sales',
      agentIdx: 2,
      custIdx: 1,
      status: 'RESOLVED',
      resolutionType: 'AI_RESOLVED',
      priority: 'LOW',
      daysAgo: 8,
      firstResponseMs: 760,
      custMsg: 'What is included in the Starter vs Growth plan?',
      aiMsg: 'Starter ($29/mo demo) covers up to 3 agents and 1,000 AI conversations; Growth ($99/mo demo) includes up to 15 agents, custom routing rules, and analytics exports.',
      agentMsg: null,
    },
    {
      subject: 'Transcript deletion request under NDPA right to erasure',
      category: 'Complaints',
      dept: 'Complaints and Customer Relations',
      agentIdx: 3,
      custIdx: 2,
      status: 'ASSIGNED',
      resolutionType: null,
      priority: 'HIGH',
      daysAgo: 1,
      firstResponseMs: 950,
      custMsg: 'I would like to request deletion of an old support transcript containing personal details.',
      aiMsg: 'Under our NDPA data protection policy, erasure requests are handled by our Complaints and Customer Relations team.',
      agentMsg: 'Hello Kofi, I have verified your account and queued the legacy conversation for permanent purge.',
    },
    {
      subject: 'Duplicate invoice notification for April cycle',
      category: 'Billing',
      dept: 'Billing and Accounts',
      agentIdx: 1,
      custIdx: 3,
      status: 'RESOLVED',
      resolutionType: 'AGENT_RESOLVED',
      priority: 'MEDIUM',
      daysAgo: 8,
      firstResponseMs: 1120,
      custMsg: 'We received two invoice emails for the same billing period.',
      aiMsg: 'I recommend speaking with Billing and Accounts so an agent can inspect your invoice dispatch log.',
      agentMsg: 'Hi Elena, I confirmed only one charge exists and removed the duplicate billing notification alias.',
    },
    {
      subject: 'Support hours for London & Lagos teams',
      category: 'General',
      dept: 'General Support',
      agentIdx: 4,
      custIdx: 4,
      status: 'RESOLVED',
      resolutionType: 'AI_RESOLVED',
      priority: 'LOW',
      daysAgo: 9,
      firstResponseMs: 680,
      custMsg: 'What time are live human agents online?',
      aiMsg: 'Live human agents are available Monday–Friday from 08:00 to 20:00 WAT/GMT, while AI support is available 24/7.',
      agentMsg: null,
    },
    {
      subject: 'How routing rules prioritize keyword matches',
      category: 'Technical',
      dept: 'Technical Support',
      agentIdx: 0,
      custIdx: 5,
      status: 'RESOLVED',
      resolutionType: 'AI_RESOLVED',
      priority: 'LOW',
      daysAgo: 9,
      firstResponseMs: 790,
      custMsg: 'How does automated department routing decide where tickets go?',
      aiMsg: 'Support Flow AI matches incoming messages against active Routing Rules (keywords + category priority) and AI intent analysis.',
      agentMsg: null,
    },
    {
      subject: 'Demo request for healthcare customer support team',
      category: 'Sales',
      dept: 'Sales',
      agentIdx: 2,
      custIdx: 6,
      status: 'OPEN',
      resolutionType: null,
      priority: 'MEDIUM',
      daysAgo: 2,
      firstResponseMs: 880,
      custMsg: 'Can we book a walkthrough of the routing rules and analytics dashboard?',
      aiMsg: 'I have routed your demo enquiry to our Sales department. Would you like to share your preferred date or connect with a human representative?',
      agentMsg: null,
    },
    {
      subject: 'Recovering account after losing authenticator phone',
      category: 'Technical',
      dept: 'Technical Support',
      agentIdx: 0,
      custIdx: 7,
      status: 'RESOLVED',
      resolutionType: 'AGENT_RESOLVED',
      priority: 'HIGH',
      daysAgo: 10,
      firstResponseMs: 1210,
      custMsg: 'I lost my phone with my 2FA authenticator app and used my last recovery code.',
      aiMsg: 'For account recovery without recovery codes, please connect with a human Technical Support agent.',
      agentMsg: 'Hi Zainab, after verifying workspace ownership with your admin, we reset your 2FA enrollment.',
    },
    {
      subject: 'Tax ID update on upcoming VAT receipt',
      category: 'Billing',
      dept: 'Billing and Accounts',
      agentIdx: 1,
      custIdx: 0,
      status: 'CLOSED',
      resolutionType: 'AI_RESOLVED',
      priority: 'LOW',
      daysAgo: 10,
      firstResponseMs: 720,
      custMsg: 'Where do I enter our company Tax ID for VAT invoices?',
      aiMsg: 'You can add your company Tax/VAT ID under Settings > Billing Profile.',
      agentMsg: null,
    },
    {
      subject: 'Data retention duration for closed tickets',
      category: 'General',
      dept: 'General Support',
      agentIdx: 4,
      custIdx: 1,
      status: 'RESOLVED',
      resolutionType: 'AI_RESOLVED',
      priority: 'LOW',
      daysAgo: 11,
      firstResponseMs: 700,
      custMsg: 'How long do you keep closed support conversations?',
      aiMsg: 'Active and closed support transcripts are retained for 24 months unless a shorter retention window or deletion request is processed.',
      agentMsg: null,
    },
    {
      subject: 'Escalating unresolved billing discrepancy from March',
      category: 'Complaints',
      dept: 'Complaints and Customer Relations',
      agentIdx: 3,
      custIdx: 2,
      status: 'PENDING',
      resolutionType: null,
      priority: 'HIGH',
      daysAgo: 3,
      firstResponseMs: 960,
      custMsg: 'We are still waiting on confirmation for our March credit memo.',
      aiMsg: 'I am forwarding this to Complaints and Customer Relations for follow-up.',
      agentMsg: 'Hi Kofi, I escalated this internally with Billing and will confirm the credit memo reference shortly.',
    },
    {
      subject: 'Can AI invent refund policies if asked?',
      category: 'General',
      dept: 'General Support',
      agentIdx: 4,
      custIdx: 3,
      status: 'RESOLVED',
      resolutionType: 'AI_RESOLVED',
      priority: 'LOW',
      daysAgo: 11,
      firstResponseMs: 650,
      custMsg: 'How do you ensure the AI does not hallucinate refund policies?',
      aiMsg: 'The assistant is grounded exclusively in Published knowledge base articles and offers human escalation whenever approved information is unavailable.',
      agentMsg: null,
    },
    {
      subject: 'SSO role mapping for new department managers',
      category: 'Technical',
      dept: 'Technical Support',
      agentIdx: 0,
      custIdx: 4,
      status: 'RESOLVED',
      resolutionType: 'AGENT_RESOLVED',
      priority: 'MEDIUM',
      daysAgo: 12,
      firstResponseMs: 1090,
      custMsg: 'How do department managers get elevated from Customer to Agent role?',
      aiMsg: 'Role permissions are managed on the server by workspace administrators in Support Agents.',
      agentMsg: 'Updated role assignment workflow documented and verified with your admin account.',
    },
    {
      subject: 'Cancelling Starter plan before renewal',
      category: 'Billing',
      dept: 'Billing and Accounts',
      agentIdx: 1,
      custIdx: 5,
      status: 'RESOLVED',
      resolutionType: 'AI_RESOLVED',
      priority: 'LOW',
      daysAgo: 12,
      firstResponseMs: 770,
      custMsg: 'Is there any penalty for cancelling a monthly plan before renewal?',
      aiMsg: 'Under our demo terms, monthly plans may be cancelled before the next renewal date with no penalty.',
      agentMsg: null,
    },
    {
      subject: 'Volume discount inquiry for 120 agents',
      category: 'Sales',
      dept: 'Sales',
      agentIdx: 2,
      custIdx: 6,
      status: 'RESOLVED',
      resolutionType: 'AGENT_RESOLVED',
      priority: 'MEDIUM',
      daysAgo: 13,
      firstResponseMs: 1140,
      custMsg: 'Do you offer tiered pricing for 120 agents?',
      aiMsg: 'Yes, teams over 50 agents qualify for custom Enterprise pricing through our Sales team.',
      agentMsg: 'Hi Marcus, sent over our 120-seat Enterprise tier schedule.',
    },
    {
      subject: 'Webhook payload timeout threshold',
      category: 'Technical',
      dept: 'Technical Support',
      agentIdx: 0,
      custIdx: 7,
      status: 'CLOSED',
      resolutionType: 'AI_RESOLVED',
      priority: 'LOW',
      daysAgo: 13,
      firstResponseMs: 740,
      custMsg: 'What is the timeout limit on webhook HTTP requests?',
      aiMsg: 'Webhook endpoints must respond with a 2xx status within 10 seconds before triggering a retry.',
      agentMsg: null,
    },
  ];

  const now = Date.now();
  for (let i = 0; i < sampleSpecs.length; i++) {
    const spec = sampleSpecs[i];
    const createdAt = new Date(now - spec.daysAgo * 86400_000 - (i % 7) * 3600_000);
    const updatedAt = new Date(createdAt.getTime() + 1800_000);
    const resolvedAt =
      spec.status === 'RESOLVED' || spec.status === 'CLOSED'
        ? new Date(createdAt.getTime() + 3600_000 * (spec.resolutionType === 'AI_RESOLVED' ? 0.1 : 3))
        : null;

    const deptId = deptMap.get(spec.dept)!;
    const customer = customerUsers[spec.custIdx];
    const agent = agentUsers[spec.agentIdx];

    const [conv] = await db
      .insert(conversations)
      .values({
        customerId: customer.id,
        assignedAgentId:
          spec.status === 'OPEN' || spec.status === 'ESCALATED' ? null : agent.id,
        departmentId: deptId,
        subject: spec.subject,
        category: spec.category,
        priority: spec.priority,
        status: spec.status,
        resolutionType: spec.resolutionType,
        firstResponseMs: spec.firstResponseMs,
        createdAt,
        updatedAt,
        resolvedAt,
      })
      .returning();

    await db.insert(messages).values([
      {
        conversationId: conv.id,
        senderId: customer.id,
        senderType: 'CUSTOMER',
        message: spec.custMsg,
        messageType: 'TEXT',
        createdAt: new Date(createdAt.getTime() + 1000),
      },
      {
        conversationId: conv.id,
        senderId: null,
        senderType: 'AI',
        message: spec.aiMsg,
        messageType: 'KNOWLEDGE_CITATION',
        createdAt: new Date(createdAt.getTime() + spec.firstResponseMs),
      },
    ]);

    if (spec.status === 'ESCALATED') {
      await db.insert(messages).values({
        conversationId: conv.id,
        senderId: null,
        senderType: 'SYSTEM',
        message: `Escalation requested by ${customer.fullName} (${customer.email}). Routed to ${spec.dept}.`,
        messageType: 'ESCALATION',
        createdAt: new Date(createdAt.getTime() + 45_000),
      });
    }

    if (spec.agentMsg) {
      await db.insert(messages).values({
        conversationId: conv.id,
        senderId: agent.id,
        senderType: 'AGENT',
        message: spec.agentMsg,
        messageType: 'TEXT',
        createdAt: new Date(createdAt.getTime() + 900_000),
      });

      await db.insert(assignments).values({
        conversationId: conv.id,
        agentId: agent.id,
        departmentId: deptId,
        assignedBy: adminUser.id,
        createdAt: new Date(createdAt.getTime() + 300_000),
      });

      await db.insert(conversationNotes).values({
        conversationId: conv.id,
        agentId: agent.id,
        note: `Reviewed ${spec.category.toLowerCase()} context and verified customer account records.`,
        createdAt: new Date(createdAt.getTime() + 600_000),
      });
    }
  }

  await db.insert(auditLogs).values([
    {
      userId: adminUser.id,
      action: 'SYSTEM_SEED_INITIALIZED',
      entityType: 'SYSTEM',
      entityId: 'bootstrap',
      details: 'Initialized 5 departments, 5 agents, 22 KB articles, 5 routing rules, and 32 sample conversations.',
    },
  ]);

  await ensureQuickRepliesSeeded();

  console.log('Support Flow AI demo seed complete.');
}

async function ensureQuickRepliesSeeded(): Promise<void> {
  const [{ value: qrCount }] = await db
    .select({ value: count() })
    .from(quickReplies);

  if (Number(qrCount) > 0) {
    return;
  }

  const allDepts = await db.select().from(departments);
  const deptByName = new Map(allDepts.map((d) => [d.name, d.id]));

  await db.insert(quickReplies).values([
    {
      title: 'Warm Greeting & Triage',
      shortcut: '/greeting',
      category: 'General',
      content:
        'Hello {{customer_name}}, thank you for contacting Support Flow AI (Ticket #{{ticket_id}}). I have reviewed your conversation history and would be happy to assist you right away.',
      departmentId: deptByName.get('General Support') ?? null,
      isActive: true,
      usageCount: 18,
    },
    {
      title: 'Two-Factor Authentication (2FA) Setup',
      shortcut: '/2fa',
      category: 'Technical',
      content:
        'Hi {{customer_name}}, to enable Two-Factor Authentication (2FA), go to Settings > Security and click "Enable Authenticator App". Scan the QR code with an authenticator app such as Google Authenticator or Authy, and store your 8 single-use recovery codes securely.',
      departmentId: deptByName.get('Technical Support') ?? null,
      isActive: true,
      usageCount: 14,
    },
    {
      title: 'Password Reset Guidance',
      shortcut: '/password-reset',
      category: 'Technical',
      content:
        'Hi {{customer_name}}, you can reset your password anytime by selecting "Forgot Password" on the sign-in screen. A time-limited reset link will arrive at your registered email address shortly.',
      departmentId: deptByName.get('Technical Support') ?? null,
      isActive: true,
      usageCount: 12,
    },
    {
      title: 'Webhook 429 & Retry Policy',
      shortcut: '/webhook-429',
      category: 'Technical',
      content:
        'Hi {{customer_name}}, HTTP 429 responses occur when burst rate limits are reached. Failed webhook deliveries automatically retry with exponential backoff—please verify your endpoint response times and check the Retry-After header.',
      departmentId: deptByName.get('Technical Support') ?? null,
      isActive: true,
      usageCount: 9,
    },
    {
      title: 'VAT Invoice & Statement Download',
      shortcut: '/vat-invoice',
      category: 'Billing',
      content:
        'Hello {{customer_name}}, monthly invoices and downloadable PDF VAT receipts are available under Billing > Statements. Let me know which billing period you need if you would like me to verify or reissue a statement.',
      departmentId: deptByName.get('Billing and Accounts') ?? null,
      isActive: true,
      usageCount: 15,
    },
    {
      title: 'Billing Review Escalation Update',
      shortcut: '/billing-review',
      category: 'Billing',
      content:
        'Thank you for sharing those details, {{customer_name}}. I have logged Ticket #{{ticket_id}} with our Billing and Accounts specialists for verification and will follow up as soon as the review is complete.',
      departmentId: deptByName.get('Billing and Accounts') ?? null,
      isActive: true,
      usageCount: 8,
    },
    {
      title: 'Enterprise Plan & Live Demo',
      shortcut: '/enterprise-demo',
      category: 'Sales',
      content:
        'Hello {{customer_name}}, thank you for considering Support Flow AI! Our Enterprise workspace supports custom agent seat volumes, tailored SLA routing rules, and guided onboarding. Could you share your team size and preferred time for a walkthrough?',
      departmentId: deptByName.get('Sales') ?? null,
      isActive: true,
      usageCount: 10,
    },
    {
      title: 'Formal Complaint Acknowledgment',
      shortcut: '/complaint-ack',
      category: 'Complaints',
      content:
        'Dear {{customer_name}}, I sincerely apologize for the inconvenience you experienced. Ticket #{{ticket_id}} has been prioritized with our Customer Relations team, and we are actively reviewing your case to resolve this promptly.',
      departmentId: deptByName.get('Complaints and Customer Relations') ?? null,
      isActive: true,
      usageCount: 11,
    },
    {
      title: 'Request Diagnostic Details',
      shortcut: '/more-details',
      category: 'Technical',
      content:
        'Thank you for reporting this, {{customer_name}}. To help us investigate faster, could you please share the approximate timestamp, any error message displayed, and the steps leading up to the issue?',
      departmentId: deptByName.get('Technical Support') ?? null,
      isActive: true,
      usageCount: 13,
    },
    {
      title: 'Resolution Check & Closing',
      shortcut: '/resolved-check',
      category: 'General',
      content:
        'I am glad we could help resolve this for you, {{customer_name}}! Please let me know if you have any further questions on Ticket #{{ticket_id}}; otherwise, I will go ahead and mark this enquiry as resolved.',
      departmentId: deptByName.get('General Support') ?? null,
      isActive: true,
      usageCount: 16,
    },
  ]);
}
