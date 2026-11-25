import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Bot,
  CheckCircle2,
  ChevronDown,
  GitBranch,
  Headphones,
  Layers,
  Menu,
  MessageSquare,
  ShieldCheck,
  X,
} from 'lucide-react';
import { SupportChatWidget } from '../components/SupportChatWidget';
import { useAuth } from '../context/AuthContext';
import { api, extractApiError } from '../services/api';

const FEATURES = [
  {
    num: '01',
    title: 'AI-Powered Customer Support',
    description:
      'Deliver immediate, polite answers grounded exclusively in your organization’s published knowledge base—never fabricated policies or prices.',
    icon: Bot,
    span: 'lg:col-span-2',
  },
  {
    num: '02',
    title: 'Intelligent Enquiry Classification',
    description:
      'Automatically categorize every incoming enquiry across Technical, Billing, Sales, Complaints, and General streams.',
    icon: Layers,
    span: 'lg:col-span-1',
  },
  {
    num: '03',
    title: 'Automated Issue Routing',
    description:
      'Combine administrator-configured keyword routing rules with AI department recommendations so tickets reach the right specialists immediately.',
    icon: GitBranch,
    span: 'lg:col-span-1',
  },
  {
    num: '04',
    title: 'Human Agent Escalation',
    description:
      'One-click "Talk to a Human" transfer preserves full conversation transcripts and customer context for seamless agent takeover.',
    icon: Headphones,
    span: 'lg:col-span-2',
  },
  {
    num: '05',
    title: 'Real-Time Conversation Management',
    description:
      'Search, filter, assign, transfer between departments, add internal agent notes, and track resolution outcomes from one unified inbox.',
    icon: MessageSquare,
    span: 'lg:col-span-1',
  },
  {
    num: '06',
    title: 'Knowledge Base Management',
    description:
      'Draft, review, and publish verified support articles. Only published articles are retrieved by the Gemini assistant.',
    icon: BookOpen,
    span: 'lg:col-span-1',
  },
  {
    num: '07',
    title: 'Support Analytics',
    description:
      'Measure first-response time, AI resolution rate, escalation volume, and department workloads directly from live database records.',
    icon: BarChart3,
    span: 'lg:col-span-1',
  },
  {
    num: '08',
    title: 'Secure User Management',
    description:
      'Role-based access control across Admin, Support Agent, and Customer accounts with hashed credentials, rate limiting, and audit trails.',
    icon: ShieldCheck,
    span: 'lg:col-span-3',
  },
];

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Customer sends an enquiry',
    detail:
      'Visitors open the web chat anytime without waiting in phone queues or navigating complex ticket portals.',
  },
  {
    step: '02',
    title: 'AI understands the enquiry',
    detail:
      'Google Gemini analyzes customer intent, classifies the enquiry category, and checks sensitivity or urgency.',
  },
  {
    step: '03',
    title: 'AI searches approved support information and responds',
    detail:
      'Retrieval-augmented generation grounds replies strictly in published knowledge-base articles with transparent citations.',
  },
  {
    step: '04',
    title: 'Unresolved issues are transferred to human agents',
    detail:
      'When approved answers are unavailable or a customer clicks "Talk to a Human", routing rules send the full transcript to the right department.',
  },
];

const FAQS = [
  {
    q: 'How does Support Flow AI prevent the assistant from inventing refund or product policies?',
    a: 'Every prompt retrieves only Published articles from your PostgreSQL knowledge base before generating an answer. If no approved article covers the customer’s question, the assistant states it cannot answer reliably and offers immediate human agent escalation.',
  },
  {
    q: 'Can human agents override AI department recommendations?',
    a: 'Yes. Configured routing rules take precedence over AI suggestions, and authorized agents or administrators can reassign conversations or transfer them across departments at any time.',
  },
  {
    q: 'How is customer personal data protected?',
    a: 'Support Flow AI keeps API keys strictly on the server, hashes passwords, enforces role-based access so customers only see their own conversations, and records administrative changes in an audit log aligned with Nigeria NDPA data protection principles.',
  },
  {
    q: 'Are payments processed inside this initial release?',
    a: 'No. Payment processing is intentionally excluded from this release so teams can evaluate conversational automation, routing, and analytics without billing dependencies.',
  },
];

export function LandingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [chatDrawerOpen, setChatDrawerOpen] = useState(false);
  const [previewTab, setPreviewTab] = useState<'chat' | 'dashboard'>('chat');
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(0);
  const [heroImgFailed, setHeroImgFailed] = useState(false);
  const [aboutImgFailed, setAboutImgFailed] = useState(false);

  // Contact form state
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactCompany, setContactCompany] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [contactSubmitting, setContactSubmitting] = useState(false);
  const [contactSuccess, setContactSuccess] = useState<string | null>(null);
  const [contactError, setContactError] = useState<string | null>(null);

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setContactError(null);
    setContactSuccess(null);
    setContactSubmitting(true);
    try {
      const res = await api.post<{ message: string }>('/contact', {
        name: contactName,
        email: contactEmail,
        company: contactCompany,
        message: contactMessage,
      });
      setContactSuccess(res.data.message);
      setContactName('');
      setContactEmail('');
      setContactCompany('');
      setContactMessage('');
    } catch (err) {
      setContactError(extractApiError(err, 'Could not send your message.'));
    } finally {
      setContactSubmitting(false);
    }
  };

  const primaryDestination =
    user && (user.role === 'ADMIN' || user.role === 'AGENT')
      ? '/dashboard'
      : '/chat';

  return (
    <div id="home" className="min-h-screen bg-white text-slate-900 flex flex-col">
      {/* Top Bar (Strict 3-Zone Contract) */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Brand Wordmark */}
          <Link
            to="/"
            className="text-lg font-bold tracking-tight text-[#062D48] whitespace-nowrap shrink-0"
          >
            Support Flow AI
          </Link>

          {/* Zone 2: Navigation Links */}
          <nav className="hidden lg:flex items-center gap-7 text-sm font-medium text-slate-600">
            <a
              href="#home"
              className="hover:text-[#062D48] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Home
            </a>
            <a
              href="#features"
              className="hover:text-[#062D48] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              className="hover:text-[#062D48] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              How It Works
            </a>
            <a
              href="#about"
              className="hover:text-[#062D48] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              About
            </a>
            <a
              href="#contact"
              className="hover:text-[#062D48] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Contact
            </a>
            <Link
              to={user ? primaryDestination : '/login'}
              className="hover:text-[#062D48] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              {user ? (user.role === 'CUSTOMER' ? 'My Chats' : 'Dashboard') : 'Sign In'}
            </Link>
          </nav>

          {/* Zone 3: Single Primary Action + Mobile Menu Trigger */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => navigate('/chat')}
              className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#062D48] hover:bg-[#093e63] text-white text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Get Started
            </button>
            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label="Toggle navigation menu"
              className="lg:hidden p-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Nav Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-200 bg-white px-4 py-4 space-y-3">
            <div className="flex flex-col space-y-2.5 text-sm font-medium text-slate-700">
              <a href="#home" onClick={() => setMobileMenuOpen(false)}>
                Home
              </a>
              <a href="#features" onClick={() => setMobileMenuOpen(false)}>
                Features
              </a>
              <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)}>
                How It Works
              </a>
              <a href="#about" onClick={() => setMobileMenuOpen(false)}>
                About
              </a>
              <a href="#contact" onClick={() => setMobileMenuOpen(false)}>
                Contact
              </a>
              <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                Sign In
              </Link>
              <Link
                to="/chat"
                onClick={() => setMobileMenuOpen(false)}
                className="inline-flex items-center justify-center px-4 py-2.5 rounded-lg bg-[#062D48] text-white font-medium"
              >
                Get Started
              </Link>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="border-b border-slate-200 bg-gradient-to-b from-slate-50 to-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
              <div className="lg:col-span-6 flex flex-col justify-center space-y-6">
                <p className="text-sm font-medium text-[#0D9488]">
                  AI Customer Support Management System
                </p>
                <h1 className="text-[clamp(2.25rem,4vw,3.5rem)] font-bold tracking-tight text-[#062D48] leading-[1.1] [text-wrap:balance]">
                  Smarter Customer Support. Faster Solutions.
                </h1>
                <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-xl">
                  Let AI handle repetitive customer enquiries while your support
                  team focuses on what matters most. Deliver faster responses,
                  smarter issue routing and better customer experiences.
                </p>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => navigate('/chat')}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#062D48] hover:bg-[#093e63] text-white text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <span>Get Started</span>
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </button>
                  <a
                    href="#features"
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-sm font-semibold transition-colors whitespace-nowrap shrink-0"
                  >
                    Explore Features
                  </a>
                  <button
                    type="button"
                    onClick={() => setChatDrawerOpen(true)}
                    className="inline-flex items-center gap-2 px-4 py-3 text-sm font-semibold text-[#0D9488] hover:text-[#0f766e] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <MessageSquare className="w-4 h-4" aria-hidden="true" />
                    <span>Launch Live AI Chat</span>
                  </button>
                </div>

                <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500">
                  <span>Gemini Grounded RAG</span>
                  <span aria-hidden="true">·</span>
                  <span>Published Knowledge Base Only</span>
                  <span aria-hidden="true">·</span>
                  <span>Department Routing &amp; Human Escalation</span>
                </div>
              </div>

              <div className="lg:col-span-6">
                <div className="h-full rounded-xl border border-slate-200 bg-white overflow-hidden flex flex-col">
                  <div className="relative flex-1 min-h-[280px] bg-[#062D48]">
                    {!heroImgFailed ? (
                      <img
                        src="/src/assets/images/hero_product_environment_1795355403322.jpg"
                        alt="Support Flow AI customer operations command studio"
                        referrerPolicy="no-referrer"
                        onError={() => setHeroImgFailed(true)}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center p-8 text-white/80 text-sm">
                        Support Flow AI Command Workspace
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#062D48]/85 via-[#062D48]/20 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
                      <p className="text-xs text-teal-300 font-medium">
                        Unified Customer &amp; Agent Workspace
                      </p>
                      <p className="text-sm font-semibold mt-1">
                        Instant grounded answers for routine questions; full
                        transcript handoff for complex cases.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Bento Grid */}
        <section id="features" className="py-16 lg:py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mb-12">
              <p className="text-sm font-medium text-[#0D9488] mb-2">
                Platform Capabilities
              </p>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#062D48]">
                Built for accurate AI resolution and accountable human support
              </h2>
              <p className="mt-3 text-slate-600 leading-relaxed">
                Every workflow connects customer messaging, approved business
                knowledge, routing rules, and team oversight inside a single
                relational database.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {FEATURES.map((feat) => {
                const Icon = feat.icon;
                return (
                  <div
                    key={feat.num}
                    className={`${feat.span} rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-300 transition-colors p-6 flex flex-col justify-between gap-4`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <span className="font-mono text-xs font-semibold text-[#0D9488] tabular-nums">
                        {feat.num}.
                      </span>
                      <Icon
                        className="w-5 h-5 text-[#062D48] shrink-0"
                        aria-hidden="true"
                      />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-[#062D48]">
                        {feat.title}
                      </h3>
                      <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                        {feat.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section
          id="how-it-works"
          className="py-16 lg:py-24 bg-slate-50 border-y border-slate-200"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mb-12">
              <p className="text-sm font-medium text-[#0D9488] mb-2">
                How It Works
              </p>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#062D48]">
                Four steps from first enquiry to verified resolution
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {HOW_IT_WORKS.map((item) => (
                <div
                  key={item.step}
                  className="rounded-xl border border-slate-200 bg-white p-6 flex flex-col gap-3"
                >
                  <span className="font-mono text-sm font-bold text-[#0D9488] tabular-nums">
                    Step {item.step}
                  </span>
                  <h3 className="text-base font-semibold text-[#062D48]">
                    {item.title}
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {item.detail}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Interactive Product Preview */}
        <section className="py-16 lg:py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
              <div className="max-w-2xl">
                <p className="text-sm font-medium text-[#0D9488] mb-2">
                  Product Preview
                </p>
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#062D48]">
                  Two purpose-built workspaces, synchronized in real time
                </h2>
              </div>

              <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start">
                <button
                  type="button"
                  onClick={() => setPreviewTab('chat')}
                  className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                    previewTab === 'chat'
                      ? 'bg-white text-[#062D48] shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Customer AI Chat
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTab('dashboard')}
                  className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                    previewTab === 'dashboard'
                      ? 'bg-white text-[#062D48] shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Support Agent Console
                </button>
              </div>
            </div>

            {previewTab === 'chat' ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 sm:p-6">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                  <div className="lg:col-span-5 space-y-4">
                    <h3 className="text-xl font-semibold text-[#062D48]">
                      Try the live Support Flow AI assistant
                    </h3>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      Ask about workspace support hours, 2FA setup, webhook
                      retries, billing invoices, or NDPA data privacy. When
                      approved articles do not cover a request, click
                      &ldquo;Talk to a Human&rdquo; to escalate directly into
                      the agent queue.
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <Link
                        to="/chat"
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#062D48] text-white text-xs font-semibold hover:bg-[#093e63] transition-colors"
                      >
                        Open Full Chat Portal
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                  <div className="lg:col-span-7 h-[460px] sm:h-[520px] min-w-0">
                    <SupportChatWidget compact />
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-[#062D48] text-white p-6 sm:p-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                  <div className="lg:col-span-5 space-y-4">
                    <h3 className="text-xl font-semibold">
                      Administrator &amp; Agent Operations Dashboard
                    </h3>
                    <p className="text-sm text-slate-300 leading-relaxed">
                      Monitor live inbox escalations, assign agents across
                      General Support, Technical Support, Sales, Billing, and
                      Complaints, manage published knowledge articles, and
                      inspect PostgreSQL-backed analytics.
                    </p>
                    <Link
                      to="/login"
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#0D9488] hover:bg-[#0f766e] text-white text-xs font-semibold transition-colors"
                    >
                      Sign In to Dashboard
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                  <div className="lg:col-span-7 rounded-lg border border-white/15 bg-white/5 p-5 space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { label: 'Queues', value: '5 Depts' },
                        { label: 'Statuses', value: '6 States' },
                        { label: 'Routing', value: 'Rule + AI' },
                        { label: 'Audit Trail', value: 'Logged' },
                      ].map((stat) => (
                        <div
                          key={stat.label}
                          className="rounded-lg bg-white/10 p-3"
                        >
                          <p className="text-[11px] text-slate-300">
                            {stat.label}
                          </p>
                          <p className="text-sm font-semibold mt-1 tabular-nums">
                            {stat.value}
                          </p>
                        </div>
                      ))}
                    </div>
                    <div className="border-t border-white/10 pt-4 space-y-2 text-xs text-slate-200">
                      <div className="flex items-center justify-between py-1.5 border-b border-white/10">
                        <span>Technical Support · Webhook 429 escalation</span>
                        <span className="font-mono text-teal-300">ESCALATED</span>
                      </div>
                      <div className="flex items-center justify-between py-1.5 border-b border-white/10">
                        <span>Billing and Accounts · VAT invoice query</span>
                        <span className="font-mono text-emerald-300">AI_RESOLVED</span>
                      </div>
                      <div className="flex items-center justify-between py-1.5">
                        <span>Sales · 65-seat Enterprise quote</span>
                        <span className="font-mono text-sky-300">ASSIGNED</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Why Choose Support Flow AI / About Section */}
        <section
          id="about"
          className="py-16 lg:py-24 bg-slate-50 border-y border-slate-200"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
              <div className="lg:col-span-6 rounded-xl border border-slate-200 overflow-hidden bg-white">
                {!aboutImgFailed ? (
                  <img
                    src="/src/assets/images/about_team_collaboration_1795355404923.jpg"
                    alt="Customer support operations team collaborating on metrics"
                    referrerPolicy="no-referrer"
                    onError={() => setAboutImgFailed(true)}
                    className="w-full h-full min-h-[300px] object-cover"
                  />
                ) : (
                  <div className="w-full h-full min-h-[300px] bg-slate-100 flex items-center justify-center text-slate-500 text-sm">
                    Support Flow AI Operations Team
                  </div>
                )}
              </div>

              <div className="lg:col-span-6 flex flex-col justify-center space-y-6">
                <div>
                  <p className="text-sm font-medium text-[#0D9488] mb-2">
                    Why Choose Support Flow AI
                  </p>
                  <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#062D48]">
                    Designed to eliminate repetitive queues without sacrificing
                    trust
                  </h2>
                </div>

                <p className="text-slate-600 leading-relaxed">
                  Built by Product Owner{' '}
                  <span className="font-semibold text-slate-900">
                    Ijirigho David Oghenerouna
                  </span>
                  , Support Flow AI pairs strict knowledge-base grounding with
                  human-in-the-loop accountability so businesses respond faster
                  and protect customer trust.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <p className="text-xs font-medium text-slate-500">
                      Proposed 90-Day Target
                    </p>
                    <p className="text-2xl font-bold text-[#062D48] mt-1 tabular-nums">
                      -50%
                    </p>
                    <p className="text-xs text-slate-600 mt-1">
                      Proposed reduction in median first-response time within 90
                      days of launch.
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <p className="text-xs font-medium text-slate-500">
                      Proposed 90-Day Target
                    </p>
                    <p className="text-2xl font-bold text-[#0D9488] mt-1 tabular-nums">
                      60%+
                    </p>
                    <p className="text-xs text-slate-600 mt-1">
                      Proposed eligible routine enquiries resolved without human
                      hand-off within 90 days.
                    </p>
                  </div>
                </div>

                <ul className="space-y-2.5 text-sm text-slate-700">
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#0D9488] shrink-0 mt-0.5" />
                    <span>
                      Consistent answers sourced strictly from approved,
                      published articles.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#0D9488] shrink-0 mt-0.5" />
                    <span>
                      Department-level visibility across Technical, Billing,
                      Sales, Complaints, and General Support.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#0D9488] shrink-0 mt-0.5" />
                    <span>
                      Privacy-conscious architecture aligned with Nigeria NDPA
                      data protection principles.
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-16 lg:py-24 bg-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-10">
              <p className="text-sm font-medium text-[#0D9488] mb-2">
                Frequently Asked Questions
              </p>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#062D48]">
                Clear answers about deployment, grounding, and governance
              </h2>
            </div>

            <div className="divide-y divide-slate-200 border-y border-slate-200">
              {FAQS.map((item, idx) => {
                const isOpen = openFaqIdx === idx;
                return (
                  <div key={item.q} className="py-4">
                    <button
                      type="button"
                      onClick={() => setOpenFaqIdx(isOpen ? null : idx)}
                      className="w-full flex items-center justify-between gap-4 text-left py-1 cursor-pointer"
                    >
                      <span className="text-base font-semibold text-[#062D48]">
                        {item.q}
                      </span>
                      <ChevronDown
                        className={`w-5 h-5 text-slate-500 shrink-0 transition-transform ${
                          isOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                    {isOpen && (
                      <p className="mt-3 text-sm text-slate-600 leading-relaxed pr-8">
                        {item.a}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section
          id="contact"
          className="py-16 lg:py-24 bg-slate-50 border-t border-slate-200"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
              <div className="lg:col-span-5 space-y-4">
                <p className="text-sm font-medium text-[#0D9488]">
                  Contact Us
                </p>
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#062D48]">
                  Ready to modernize your customer support workflow?
                </h2>
                <p className="text-slate-600 leading-relaxed">
                  Send a message to our team or open the live AI chat assistant
                  for immediate support answers.
                </p>
                <div className="pt-4 space-y-2 text-sm text-slate-600">
                  <p>
                    <span className="font-semibold text-slate-900">
                      Product Owner:
                    </span>{' '}
                    Ijirigho David Oghenerouna
                  </p>
                  <p>
                    <span className="font-semibold text-slate-900">
                      Support Hours:
                    </span>{' '}
                    AI 24/7 · Human Agents Mon–Fri 08:00–20:00 WAT/GMT
                  </p>
                </div>
              </div>

              <div className="lg:col-span-7">
                <form
                  onSubmit={handleContactSubmit}
                  className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 space-y-4"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Full Name
                      </label>
                      <input
                        type="text"
                        required
                        value={contactName}
                        onChange={(e) => setContactName(e.target.value)}
                        placeholder="Jane Doe"
                        className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#062D48]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Work Email
                      </label>
                      <input
                        type="email"
                        required
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        placeholder="jane@company.com"
                        className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#062D48]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Company / Organization (Optional)
                    </label>
                    <input
                      type="text"
                      value={contactCompany}
                      onChange={(e) => setContactCompany(e.target.value)}
                      placeholder="Organization name"
                      className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#062D48]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      How can we help?
                    </label>
                    <textarea
                      required
                      rows={4}
                      value={contactMessage}
                      onChange={(e) => setContactMessage(e.target.value)}
                      placeholder="Tell us about your support volume, departments, or questions..."
                      className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#062D48]"
                    />
                  </div>

                  {contactError && (
                    <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                      {contactError}
                    </p>
                  )}
                  {contactSuccess && (
                    <p className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                      {contactSuccess}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={contactSubmitting}
                    className="px-6 py-2.5 rounded-lg bg-[#062D48] hover:bg-[#093e63] disabled:opacity-60 text-white text-sm font-semibold transition-colors cursor-pointer"
                  >
                    {contactSubmitting ? 'Sending...' : 'Send Message'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-[#062D48] text-slate-300 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between gap-8 pb-8 border-b border-white/10">
            <div className="max-w-sm space-y-2">
              <p className="text-lg font-bold text-white">Support Flow AI</p>
              <p className="text-xs text-slate-300 leading-relaxed">
                AI-powered customer support management platform. Product Owner:
                Ijirigho David Oghenerouna.
              </p>
            </div>
            <div className="flex flex-wrap gap-8 text-sm">
              <div className="space-y-2">
                <p className="font-semibold text-white">Platform</p>
                <div className="flex flex-col space-y-1.5 text-xs">
                  <a href="#features" className="hover:text-white">
                    Features
                  </a>
                  <a href="#how-it-works" className="hover:text-white">
                    How It Works
                  </a>
                  <Link to="/chat" className="hover:text-white">
                    Customer Support Chat
                  </Link>
                </div>
              </div>
              <div className="space-y-2">
                <p className="font-semibold text-white">Access</p>
                <div className="flex flex-col space-y-1.5 text-xs">
                  <Link to="/login" className="hover:text-white">
                    Sign In
                  </Link>
                  <Link to="/register" className="hover:text-white">
                    Create Customer Account
                  </Link>
                  <Link to="/dashboard" className="hover:text-white">
                    Admin &amp; Agent Dashboard
                  </Link>
                </div>
              </div>
            </div>
          </div>
          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
            <p>© {new Date().getFullYear()} Support Flow AI. All rights reserved.</p>
            <p>NDPA-aligned privacy &amp; data minimization controls enabled.</p>
          </div>
        </div>
      </footer>

      {/* Floating Support Chat Launcher */}
      {!chatDrawerOpen && (
        <button
          type="button"
          onClick={() => setChatDrawerOpen(true)}
          aria-label="Open customer support chat"
          className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2.5 px-4 py-3 rounded-xl bg-[#0D9488] hover:bg-[#0f766e] text-white text-sm font-semibold shadow-lg transition-transform hover:scale-[1.02] cursor-pointer"
        >
          <MessageSquare className="w-4 h-4" aria-hidden="true" />
          <span>Support Chat</span>
        </button>
      )}

      {/* Slide-Over Chat Drawer */}
      {chatDrawerOpen && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-slate-950/40 backdrop-blur-[1px]"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setChatDrawerOpen(false);
            }
          }}
        >
          <div className="w-full sm:max-w-md h-[100dvh] bg-white shadow-2xl flex flex-col">
            <SupportChatWidget
              compact
              drawer
              onClose={() => setChatDrawerOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
