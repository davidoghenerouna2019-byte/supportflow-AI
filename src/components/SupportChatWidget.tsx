import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  Bot,
  CheckCircle2,
  Headphones,
  Loader2,
  RefreshCw,
  Send,
  User as UserIcon,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  api,
  extractApiError,
  getInMemoryAuthToken,
  setInMemoryGuestChatToken,
} from '../services/api';
import type { Conversation, ConversationMessage } from '../types';
import { QuickRepliesPicker } from './QuickRepliesPicker';
import { StatusIndicator } from './StatusBadge';

interface SupportChatWidgetProps {
  conversationId?: number | null;
  onConversationCreated?: (conv: Conversation) => void;
  onClose?: () => void;
  compact?: boolean;
  drawer?: boolean;
}

interface AiMetaBanner {
  category: string;
  recommendedDepartment: string;
  recommendEscalation: boolean;
}

export function SupportChatWidget({
  conversationId: externalConvId,
  onConversationCreated,
  onClose,
  compact = false,
  drawer = false,
}: SupportChatWidgetProps) {
  const { user } = useAuth();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [input, setInput] = useState('');
  const [initializing, setInitializing] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiMeta, setAiMeta] = useState<AiMetaBanner | null>(null);

  // Escalation modal state
  const [showEscalationForm, setShowEscalationForm] = useState(false);
  const [escName, setEscName] = useState(user?.fullName ?? '');
  const [escEmail, setEscEmail] = useState(user?.email ?? '');
  const [escSummary, setEscSummary] = useState('');
  const [escalating, setEscalating] = useState(false);
  const [escalationSuccess, setEscalationSuccess] = useState<string | null>(null);

  // Scoped per-widget guest token so multiple mounted widgets never overwrite each other
  const guestTokenRef = useRef<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const isStaff = user?.role === 'ADMIN' || user?.role === 'AGENT';

  const getRequestConfig = useCallback(() => {
    const userToken = getInMemoryAuthToken();
    if (!userToken && guestTokenRef.current) {
      return {
        headers: {
          Authorization: `Bearer ${guestTokenRef.current}`,
        },
      };
    }
    return undefined;
  }, []);

  useEffect(() => {
    if (user) {
      setEscName((prev) => prev || user.fullName);
      setEscEmail((prev) => prev || user.email);
    }
  }, [user]);

  const initConversation = useCallback(async () => {
    setInitializing(true);
    setError(null);
    setEscalationSuccess(null);
    setAiMeta(null);

    try {
      if (externalConvId) {
        const res = await api.get<{
          conversation: Conversation;
          messages: ConversationMessage[];
        }>(`/conversations/${externalConvId}`, getRequestConfig());
        setConversation(res.data.conversation);
        setMessages(res.data.messages);
      } else {
        guestTokenRef.current = null;
        const res = await api.post<{
          conversation: Conversation;
          messages: ConversationMessage[];
          guestToken?: string;
        }>('/conversations', {});
        if (res.data.guestToken) {
          guestTokenRef.current = res.data.guestToken;
          setInMemoryGuestChatToken(res.data.guestToken);
        }
        setConversation(res.data.conversation);
        setMessages(res.data.messages);
        onConversationCreated?.(res.data.conversation);
      }
    } catch (err) {
      setError(extractApiError(err, 'Could not start support conversation.'));
    } finally {
      setInitializing(false);
    }
  }, [externalConvId, getRequestConfig, onConversationCreated]);

  // Initialize or load conversation
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!cancelled) {
        await initConversation();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [externalConvId]);

  // Poll for agent replies when conversation is escalated or assigned
  useEffect(() => {
    if (
      !conversation ||
      (conversation.status !== 'ESCALATED' &&
        conversation.status !== 'ASSIGNED' &&
        conversation.status !== 'PENDING')
    ) {
      return;
    }

    const timer = setInterval(async () => {
      try {
        const res = await api.get<{
          conversation: Conversation;
          messages: ConversationMessage[];
        }>(`/conversations/${conversation.id}`, getRequestConfig());
        setConversation(res.data.conversation);
        setMessages(res.data.messages);
      } catch {
        // silent background poll
      }
    }, 5000);

    return () => clearInterval(timer);
  }, [conversation?.id, conversation?.status, getRequestConfig]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending, showEscalationForm]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || !conversation || sending) return;

    setError(null);
    setSending(true);
    setInput('');

    // Optimistic append for immediate UI feedback
    const optimisticId = -Date.now();
    const optimisticMsg: ConversationMessage = {
      id: optimisticId,
      conversationId: conversation.id,
      senderId: user?.id ?? null,
      senderType: isStaff ? 'AGENT' : 'CUSTOMER',
      message: trimmed,
      messageType: 'TEXT',
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      const res = await api.post<{
        customerMessage: ConversationMessage | null;
        replyMessage: ConversationMessage | null;
        conversation: Conversation;
        aiMetadata?: AiMetaBanner;
        awaitingHumanAgent?: boolean;
      }>(
        `/conversations/${conversation.id}/messages`,
        { message: trimmed },
        getRequestConfig()
      );

      setConversation(res.data.conversation);
      setMessages((prev) => {
        const withoutOptimistic = prev.filter((m) => m.id !== optimisticId);
        const next = [...withoutOptimistic];
        if (res.data.customerMessage) {
          next.push(res.data.customerMessage);
        }
        if (res.data.replyMessage) {
          next.push(res.data.replyMessage);
        }
        return next;
      });

      if (res.data.aiMetadata) {
        setAiMeta(res.data.aiMetadata);
      }
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      setInput(trimmed);
      setError(
        extractApiError(err, 'Failed to send message. Please try again.')
      );
    } finally {
      setSending(false);
    }
  };

  const handleEscalateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!conversation || escalating) return;
    setError(null);
    setEscalating(true);

    try {
      const res = await api.post<{
        conversation: Conversation;
        escalationMessage: ConversationMessage;
        routedDepartment: string;
      }>(
        `/conversations/${conversation.id}/escalate`,
        {
          customerName: escName,
          customerEmail: escEmail,
          issueSummary: escSummary,
        },
        getRequestConfig()
      );

      setConversation(res.data.conversation);
      setMessages((prev) => [...prev, res.data.escalationMessage]);
      setShowEscalationForm(false);
      setEscSummary('');
      setEscalationSuccess(
        `Your request has been forwarded to ${res.data.routedDepartment}. A human agent will review your transcript and respond shortly.`
      );
    } catch (err) {
      setError(extractApiError(err, 'Could not submit escalation request.'));
    } finally {
      setEscalating(false);
    }
  };

  const formatTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  const parseCitations = (
    raw?: string | null
  ): Array<{ id: number; title: string; category: string }> => {
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const containerClasses = drawer
    ? 'flex flex-col bg-white h-full w-full overflow-hidden'
    : compact
      ? 'flex flex-col bg-white h-full w-full rounded-xl border border-slate-200 overflow-hidden'
      : 'flex flex-col bg-white h-[min(680px,calc(100dvh-6rem))] sm:h-[min(720px,calc(100dvh-7.5rem))] min-h-[420px] w-full rounded-xl border border-slate-200 overflow-hidden';

  return (
    <div className={containerClasses}>
      {/* Chat Header */}
      <div className="flex items-center justify-between gap-2 sm:gap-3 px-3 sm:px-4 py-3 border-b border-slate-200 bg-[#062D48] text-white shrink-0">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-[#0D9488] flex items-center justify-center shrink-0">
            <Bot className="w-4 h-4 sm:w-5 sm:h-5 text-white" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h2 className="text-xs sm:text-sm font-semibold truncate">
              Support Flow AI Assistant
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-300 truncate">
              {conversation?.department?.name
                ? `Routed: ${conversation.department.name}`
                : 'Grounded Knowledge Assistant'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {conversation &&
            conversation.status !== 'ESCALATED' &&
            conversation.status !== 'RESOLVED' &&
            conversation.status !== 'CLOSED' && (
              <button
                type="button"
                onClick={() => setShowEscalationForm(true)}
                className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-[11px] sm:text-xs font-medium text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                <Headphones className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>Talk to a Human</span>
              </button>
            )}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close support chat"
              className="p-2 rounded-lg hover:bg-white/15 text-slate-200 hover:text-white transition-colors cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Sub-bar with conversation state */}
      {conversation && (
        <div className="flex items-center justify-between gap-3 px-3 sm:px-4 py-2 bg-slate-50 border-b border-slate-200 text-xs text-slate-600 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-mono tabular-nums text-slate-500 shrink-0">
              #{conversation.id}
            </span>
            <span aria-hidden="true">·</span>
            <span className="truncate">{conversation.category}</span>
          </div>
          <StatusIndicator status={conversation.status} />
        </div>
      )}

      {/* Messages Viewport */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 space-y-4 bg-slate-50/60">
        {initializing ? (
          <div className="flex items-center justify-center h-full text-slate-500 text-sm gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-[#0D9488]" />
            <span>Connecting to Support Flow AI...</span>
          </div>
        ) : !conversation ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4 space-y-3">
            <AlertCircle className="w-6 h-6 text-rose-600" />
            <p className="text-sm text-slate-700">
              {error || 'Unable to connect to the support chat session.'}
            </p>
            <button
              type="button"
              onClick={initConversation}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#062D48] hover:bg-[#093e63] text-white text-xs font-medium cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Connection</span>
            </button>
          </div>
        ) : (
          <>
            {messages.map((msg) => {
              const isCustomer = msg.senderType === 'CUSTOMER';
              const isSystem = msg.senderType === 'SYSTEM';
              const isAgent = msg.senderType === 'AGENT';
              const citations = parseCitations(msg.citedArticleIds);

              if (isSystem) {
                return (
                  <div
                    key={msg.id}
                    className="mx-auto max-w-xl rounded-lg border border-slate-200 bg-white px-3.5 py-3 text-xs text-slate-700"
                  >
                    <div className="flex items-start gap-2.5">
                      <Headphones
                        className="w-4 h-4 text-[#0D9488] shrink-0 mt-0.5"
                        aria-hidden="true"
                      />
                      <div className="space-y-1 min-w-0">
                        <p className="font-medium text-slate-900">
                          Escalation Notice
                        </p>
                        <p className="leading-relaxed break-words">{msg.message}</p>
                        <span className="block font-mono tabular-nums text-[11px] text-slate-400">
                          {formatTime(msg.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={msg.id}
                  className={`flex gap-2 sm:gap-2.5 ${
                    isCustomer ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {!isCustomer && (
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-1 ${
                        isAgent
                          ? 'bg-[#062D48] text-white'
                          : 'bg-[#0D9488]/15 text-[#0D9488]'
                      }`}
                    >
                      {isAgent ? (
                        <Headphones className="w-3.5 h-3.5" />
                      ) : (
                        <Bot className="w-4 h-4" />
                      )}
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] sm:max-w-[80%] min-w-0 rounded-xl px-3.5 sm:px-4 py-2.5 sm:py-3 text-sm leading-relaxed ${
                      isCustomer
                        ? 'bg-[#062D48] text-white'
                        : isAgent
                          ? 'bg-white border border-[#062D48]/20 text-slate-900'
                          : 'bg-white border border-slate-200 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3 mb-1">
                      <span
                        className={`text-[11px] font-medium truncate ${
                          isCustomer
                            ? 'text-slate-300'
                            : isAgent
                              ? 'text-[#062D48]'
                              : 'text-[#0D9488]'
                        }`}
                      >
                        {isCustomer
                          ? 'You'
                          : isAgent
                            ? 'Human Support Agent'
                            : 'Support Flow AI'}
                      </span>
                      <span
                        className={`font-mono tabular-nums text-[11px] shrink-0 ${
                          isCustomer ? 'text-slate-300' : 'text-slate-400'
                        }`}
                      >
                        {formatTime(msg.createdAt)}
                      </span>
                    </div>

                    <p className="whitespace-pre-wrap break-words">{msg.message}</p>

                    {citations.length > 0 && (
                      <div className="mt-2.5 pt-2 border-t border-slate-100 text-xs text-slate-500 space-y-1">
                        <div className="flex items-center gap-1.5 font-medium text-slate-600">
                          <BookOpen className="w-3 h-3 shrink-0" aria-hidden="true" />
                          <span>Referenced Knowledge Base</span>
                        </div>
                        {citations.map((c) => (
                          <div key={c.id} className="text-slate-600 break-words">
                            {c.title} <span aria-hidden="true">·</span>{' '}
                            <span className="text-slate-400">{c.category}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {isCustomer && (
                    <div className="w-7 h-7 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 mt-1">
                      <UserIcon className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
              );
            })}

            {sending && (
              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[#0D9488]/15 text-[#0D9488] flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="rounded-xl bg-white border border-slate-200 px-3.5 py-2.5 text-xs text-slate-500 flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0D9488] shrink-0" />
                  <span>Support Flow AI is reviewing approved articles...</span>
                </div>
              </div>
            )}

            {aiMeta?.recommendEscalation &&
              conversation?.status !== 'ESCALATED' &&
              !showEscalationForm && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="text-xs text-amber-950">
                    <p className="font-semibold">
                      Human assistance recommended ({aiMeta.recommendedDepartment})
                    </p>
                    <p className="text-amber-800 mt-0.5">
                      Connect directly with a support specialist while keeping your chat transcript.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowEscalationForm(true)}
                    className="px-3 py-2 rounded-lg bg-[#062D48] hover:bg-[#093e63] text-white text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer self-start sm:self-center"
                  >
                    Talk to a Human
                  </button>
                </div>
              )}

            {escalationSuccess && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 flex items-start gap-2.5 text-xs text-emerald-900">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <span>{escalationSuccess}</span>
              </div>
            )}
          </>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Inline Human Escalation Form */}
      {showEscalationForm && (
        <form
          onSubmit={handleEscalateSubmit}
          className="border-t border-slate-200 bg-white p-3.5 sm:p-4 space-y-3 max-h-[62%] overflow-y-auto shrink-0"
        >
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-[#062D48]">
              Connect with a Human Support Agent
            </h3>
            <button
              type="button"
              onClick={() => setShowEscalationForm(false)}
              className="text-xs text-slate-500 hover:text-slate-800 cursor-pointer py-1 px-2"
            >
              Cancel
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Your Name
              </label>
              <input
                type="text"
                required
                value={escName}
                onChange={(e) => setEscName(e.target.value)}
                placeholder="Full name"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base sm:text-sm focus:outline-none focus:border-[#062D48]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                value={escEmail}
                onChange={(e) => setEscEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base sm:text-sm focus:outline-none focus:border-[#062D48]"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Brief Description of Your Issue
            </label>
            <textarea
              required
              rows={2}
              value={escSummary}
              onChange={(e) => setEscSummary(e.target.value)}
              placeholder="Summarize what you need help with so our specialist can respond faster..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base sm:text-sm focus:outline-none focus:border-[#062D48]"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="submit"
              disabled={escalating}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0D9488] hover:bg-[#0f766e] disabled:opacity-60 text-white text-xs font-medium transition-colors cursor-pointer"
            >
              {escalating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Submit Escalation Request
            </button>
          </div>
        </form>
      )}

      {/* Error Banner */}
      {error && conversation && (
        <div className="px-3 sm:px-4 py-2.5 bg-rose-50 border-t border-rose-200 flex items-center justify-between gap-2 text-xs text-rose-800 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="break-words">{error}</span>
          </div>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-rose-700 hover:text-rose-900 font-medium cursor-pointer shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Message Input (+ Agent Quick Replies toolbar when signed in as Agent/Admin) */}
      <form
        onSubmit={handleSend}
        className="p-2.5 sm:p-3 border-t border-slate-200 bg-white space-y-2 shrink-0"
      >
        {isStaff && conversation && (
          <div className="flex items-center justify-between gap-2">
            <QuickRepliesPicker
              customerName={conversation.customer?.fullName}
              ticketId={conversation.id}
              conversationCategory={conversation.category}
              slashQuery={input.startsWith('/') ? input : null}
              disabled={initializing || sending || !conversation}
              onInsert={(text) => {
                setInput((prev) =>
                  prev.trim() && !prev.trim().startsWith('/')
                    ? `${prev.trimEnd()}\n\n${text}`
                    : text
                );
                setTimeout(() => inputRef.current?.focus(), 0);
              }}
            />
            <span className="text-[11px] text-slate-400 truncate">
              Agent mode · Type <span className="font-mono">/</span> for shortcuts
            </span>
          </div>
        )}

        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            rows={isStaff ? 2 : 1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (!initializing && !sending && input.trim() && conversation) {
                  e.currentTarget.form?.requestSubmit();
                }
              }
            }}
            disabled={initializing || sending || !conversation}
            placeholder={
              isStaff
                ? 'Reply as a human agent or insert a Quick Reply...'
                : conversation?.status === 'ESCALATED'
                  ? 'Add details for your human agent...'
                  : 'Ask Support Flow AI a question...'
            }
            aria-label="Message input"
            className="flex-1 min-w-0 rounded-lg border border-slate-300 px-3 sm:px-3.5 py-2.5 text-base sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#062D48] disabled:bg-slate-50 resize-none max-h-36 overflow-y-auto"
          />
          <button
            type="submit"
            disabled={initializing || sending || !input.trim() || !conversation}
            aria-label="Send message"
            className="inline-flex items-center justify-center gap-1.5 px-3.5 sm:px-4 py-2.5 rounded-lg bg-[#062D48] hover:bg-[#093e63] disabled:opacity-50 text-white text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer min-h-[42px]"
          >
            <Send className="w-4 h-4" aria-hidden="true" />
            <span className="hidden xs:inline sm:inline">Send</span>
          </button>
        </div>
      </form>
    </div>
  );
}
