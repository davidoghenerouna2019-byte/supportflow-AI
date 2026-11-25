import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  BookOpen,
  LayoutDashboard,
  LogOut,
  MessageSquarePlus,
  Search,
} from 'lucide-react';
import { StatusIndicator } from '../components/StatusBadge';
import { SupportChatWidget } from '../components/SupportChatWidget';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import type { Conversation, KnowledgeArticle } from '../types';

export function CustomerChatPage() {
  const { user, logout } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<number | null>(null);
  const [chatSessionKey, setChatSessionKey] = useState(0);
  const [kbQuery, setKbQuery] = useState('');
  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
  const [showKbPanel, setShowKbPanel] = useState(false);

  useEffect(() => {
    api
      .get<{ articles: KnowledgeArticle[] }>('/knowledge')
      .then((res) => setArticles(res.data.articles))
      .catch(() => undefined);
  }, []);

  const loadMyConversations = async () => {
    if (!user) return;
    try {
      const res = await api.get<{ conversations: Conversation[] }>('/conversations');
      setConversations(res.data.conversations);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (user) {
      loadMyConversations();
    } else {
      setConversations([]);
    }
  }, [user]);

  const filteredArticles = articles.filter((a) => {
    if (!kbQuery.trim()) return true;
    const q = kbQuery.toLowerCase();
    return (
      a.title.toLowerCase().includes(q) ||
      a.question.toLowerCase().includes(q) ||
      a.category.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-3 sm:px-6 h-16 flex items-center justify-between gap-2 sm:gap-4 shrink-0">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-[#062D48] whitespace-nowrap shrink-0 p-1.5 -ml-1.5 rounded-lg"
            aria-label="Back to Home"
          >
            <ArrowLeft className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">Back to Home</span>
          </Link>
          <span className="hidden sm:inline text-slate-300" aria-hidden="true">
            /
          </span>
          <span className="text-sm sm:text-base font-bold text-[#062D48] truncate">
            Support Flow AI Portal
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setShowKbPanel((v) => !v)}
            className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 cursor-pointer whitespace-nowrap"
          >
            <BookOpen className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">Help Articles ({articles.length})</span>
            <span className="sm:hidden">Articles ({articles.length})</span>
          </button>

          {user ? (
            <>
              {(user.role === 'ADMIN' || user.role === 'AGENT') && (
                <Link
                  to="/dashboard"
                  className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-[#062D48] text-white text-xs font-medium whitespace-nowrap"
                >
                  <LayoutDashboard className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden sm:inline">Dashboard</span>
                </Link>
              )}
              <button
                type="button"
                onClick={logout}
                className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className="px-3 sm:px-3.5 py-1.5 rounded-lg bg-[#062D48] text-white text-xs font-medium whitespace-nowrap"
            >
              Sign In
            </Link>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-4 sm:py-6 grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
        {/* Sidebar: Past Conversations & Knowledge Quick Access (below chat on mobile) */}
        <aside className="order-2 lg:order-1 lg:col-span-4 space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-[#062D48] truncate">
                {user ? `Conversations (${user.fullName})` : 'Support Session'}
              </h2>
              <button
                type="button"
                onClick={() => {
                  setSelectedConvId(null);
                  setChatSessionKey((k) => k + 1);
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#0D9488] hover:bg-[#0f766e] text-white text-xs font-medium cursor-pointer shrink-0"
              >
                <MessageSquarePlus className="w-3.5 h-3.5" />
                <span>New Chat</span>
              </button>
            </div>

            {user ? (
              conversations.length === 0 ? (
                <p className="text-xs text-slate-500 py-2">
                  Your support conversations will appear here so you can revisit
                  answers or follow up on escalated tickets.
                </p>
              ) : (
                <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                  {conversations.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedConvId(c.id)}
                      className={`w-full text-left rounded-lg border p-3 transition-colors cursor-pointer ${
                        selectedConvId === c.id
                          ? 'border-[#062D48] bg-slate-50'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-slate-900 truncate">
                          {c.subject}
                        </span>
                        <StatusIndicator status={c.status} />
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-500">
                        <span>{c.category}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">
                          {new Date(c.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )
            ) : (
              <div className="text-xs text-slate-600 space-y-2">
                <p>
                  You are chatting as a guest visitor. Sign in or register to
                  save and track all past conversations across sessions.
                </p>
                <Link
                  to="/login"
                  className="inline-block text-[#0D9488] font-semibold hover:underline"
                >
                  Sign in or create an account →
                </Link>
              </div>
            )}
          </div>

          {/* Published Knowledge Base Quick Browser */}
          <div
            className={`rounded-xl border border-slate-200 bg-white p-4 space-y-3 ${
              showKbPanel ? 'block' : 'hidden lg:block'
            }`}
          >
            <h3 className="text-sm font-semibold text-[#062D48]">
              Approved Knowledge Base
            </h3>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={kbQuery}
                onChange={(e) => setKbQuery(e.target.value)}
                placeholder="Search support topics..."
                className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-xs focus:outline-none focus:border-[#062D48]"
              />
            </div>
            <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
              {filteredArticles.slice(0, 8).map((article) => (
                <div
                  key={article.id}
                  className="rounded-lg border border-slate-100 bg-slate-50/70 p-3 space-y-1"
                >
                  <p className="text-xs font-semibold text-slate-900">
                    {article.title}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {article.category}
                  </p>
                  <p className="text-xs text-slate-600 line-clamp-2">
                    {article.answer}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Main Area: Live Chat Widget (first on mobile) */}
        <section className="order-1 lg:order-2 lg:col-span-8 min-w-0">
          <SupportChatWidget
            key={`${selectedConvId ?? 'new'}-${chatSessionKey}`}
            conversationId={selectedConvId}
            onConversationCreated={(conv) => {
              if (user) {
                setSelectedConvId(conv.id);
                loadMyConversations();
              }
            }}
          />
        </section>
      </div>
    </div>
  );
}
