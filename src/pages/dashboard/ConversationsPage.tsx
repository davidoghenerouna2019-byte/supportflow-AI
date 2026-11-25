import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Search,
  Send,
  StickyNote,
  UserPlus,
} from 'lucide-react';
import { QuickRepliesPicker } from '../../components/QuickRepliesPicker';
import { PriorityText, StatusIndicator } from '../../components/StatusBadge';
import { api, extractApiError } from '../../services/api';
import type {
  Conversation,
  ConversationMessage,
  ConversationNote,
  ConversationStatus,
  Department,
} from '../../types';

interface AgentOption {
  id: number;
  fullName: string;
  departmentId: number | null;
  isActive: boolean;
}

const STATUSES: ConversationStatus[] = [
  'OPEN',
  'PENDING',
  'ASSIGNED',
  'ESCALATED',
  'RESOLVED',
  'CLOSED',
];

export function ConversationsPage({ mode }: { mode: 'all' | 'inbox' }) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [agents, setAgents] = useState<AgentOption[]>([]);

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detailConv, setDetailConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [notes, setNotes] = useState<ConversationNote[]>([]);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(
    mode === 'inbox' ? 'ESCALATED' : 'ALL'
  );
  const [deptFilter, setDeptFilter] = useState<string>('all');
  const [agentFilter, setAgentFilter] = useState<string>('all');

  // Action inputs
  const [replyText, setReplyText] = useState('');
  const replyInputRef = React.useRef<HTMLTextAreaElement | null>(null);
  const [noteText, setNoteText] = useState('');
  const [assignDeptId, setAssignDeptId] = useState<string>('');
  const [assignAgentId, setAssignAgentId] = useState<string>('');
  const [resolutionOutcome, setResolutionOutcome] = useState<
    'AI_RESOLVED' | 'AGENT_RESOLVED' | 'UNRESOLVED'
  >('AGENT_RESOLVED');

  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [busyAction, setBusyAction] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  useEffect(() => {
    setStatusFilter(mode === 'inbox' ? 'ESCALATED' : 'ALL');
  }, [mode]);

  const loadMeta = async () => {
    try {
      const [dRes, aRes] = await Promise.all([
        api.get<{ departments: Department[] }>('/departments'),
        api.get<{ agents: AgentOption[] }>('/agents'),
      ]);
      setDepartments(dRes.data.departments);
      setAgents(aRes.data.agents.filter((a) => a.isActive));
    } catch {
      // ignore
    }
  };

  const loadList = async () => {
    setLoadingList(true);
    try {
      const params: Record<string, string> = {};
      if (search.trim()) params.search = search.trim();
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (deptFilter !== 'all') params.departmentId = deptFilter;
      if (agentFilter !== 'all') params.agentId = agentFilter;

      const res = await api.get<{ conversations: Conversation[] }>(
        '/conversations',
        { params }
      );
      let items = res.data.conversations;
      if (mode === 'inbox' && statusFilter === 'ALL') {
        items = items.filter(
          (c) => c.status !== 'RESOLVED' && c.status !== 'CLOSED'
        );
      }
      setConversations(items);
      if (items.length > 0 && !items.some((c) => c.id === selectedId)) {
        setSelectedId(items[0].id);
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        text: extractApiError(err, 'Failed to load conversations.'),
      });
    } finally {
      setLoadingList(false);
    }
  };

  const loadDetail = async (id: number) => {
    setLoadingDetail(true);
    try {
      const res = await api.get<{
        conversation: Conversation;
        messages: ConversationMessage[];
        notes: ConversationNote[];
      }>(`/conversations/${id}`);
      setDetailConv(res.data.conversation);
      setMessages(res.data.messages);
      setNotes(res.data.notes);
      setAssignDeptId(
        res.data.conversation.departmentId
          ? String(res.data.conversation.departmentId)
          : ''
      );
      setAssignAgentId(
        res.data.conversation.assignedAgentId
          ? String(res.data.conversation.assignedAgentId)
          : ''
      );
    } catch (err) {
      setFeedback({
        type: 'error',
        text: extractApiError(err, 'Failed to load conversation details.'),
      });
    } finally {
      setLoadingDetail(false);
    }
  };

  useEffect(() => {
    loadMeta();
  }, []);

  useEffect(() => {
    loadList();
  }, [statusFilter, deptFilter, agentFilter, mode]);

  useEffect(() => {
    if (selectedId) {
      loadDetail(selectedId);
    } else {
      setDetailConv(null);
      setMessages([]);
      setNotes([]);
    }
  }, [selectedId]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadList();
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detailConv || !replyText.trim() || busyAction) return;
    setBusyAction(true);
    setFeedback(null);
    try {
      await api.post(`/conversations/${detailConv.id}/messages`, {
        message: replyText,
      });
      setReplyText('');
      await Promise.all([loadDetail(detailConv.id), loadList()]);
      setFeedback({ type: 'success', text: 'Reply sent to customer.' });
    } catch (err) {
      setFeedback({
        type: 'error',
        text: extractApiError(err, 'Could not send reply.'),
      });
    } finally {
      setBusyAction(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detailConv || !noteText.trim() || busyAction) return;
    setBusyAction(true);
    try {
      const res = await api.post<{ note: ConversationNote }>(
        `/conversations/${detailConv.id}/notes`,
        { note: noteText }
      );
      setNotes((prev) => [res.data.note, ...prev]);
      setNoteText('');
      setFeedback({ type: 'success', text: 'Internal note added.' });
    } catch (err) {
      setFeedback({
        type: 'error',
        text: extractApiError(err, 'Could not save internal note.'),
      });
    } finally {
      setBusyAction(false);
    }
  };

  const handleAssignTransfer = async () => {
    if (!detailConv || !assignDeptId || busyAction) return;
    setBusyAction(true);
    setFeedback(null);
    try {
      await api.post(`/conversations/${detailConv.id}/assign`, {
        departmentId: Number(assignDeptId),
        agentId: assignAgentId ? Number(assignAgentId) : null,
      });
      await Promise.all([loadDetail(detailConv.id), loadList()]);
      setFeedback({
        type: 'success',
        text: 'Conversation assignment and department updated.',
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        text: extractApiError(err, 'Could not assign conversation.'),
      });
    } finally {
      setBusyAction(false);
    }
  };

  const handleStatusChange = async (newStatus: ConversationStatus) => {
    if (!detailConv || busyAction) return;
    setBusyAction(true);
    setFeedback(null);
    try {
      await api.patch(`/conversations/${detailConv.id}`, { status: newStatus });
      await Promise.all([loadDetail(detailConv.id), loadList()]);
      setFeedback({ type: 'success', text: `Status updated to ${newStatus}.` });
    } catch (err) {
      setFeedback({
        type: 'error',
        text: extractApiError(err, 'Could not update status.'),
      });
    } finally {
      setBusyAction(false);
    }
  };

  const handleResolve = async () => {
    if (!detailConv || busyAction) return;
    setBusyAction(true);
    setFeedback(null);
    try {
      await api.post(`/conversations/${detailConv.id}/resolve`, {
        resolutionType: resolutionOutcome,
      });
      await Promise.all([loadDetail(detailConv.id), loadList()]);
      setFeedback({
        type: 'success',
        text: `Conversation resolved (${resolutionOutcome}).`,
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        text: extractApiError(err, 'Could not resolve conversation.'),
      });
    } finally {
      setBusyAction(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Filter Toolbar */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by subject or category..."
            className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-[#062D48]"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter by status"
            className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 bg-white"
          >
            <option value="ALL">
              {mode === 'inbox' ? 'All Active Queue' : 'All Statuses'}
            </option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            aria-label="Filter by department"
            className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 bg-white"
          >
            <option value="all">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={String(d.id)}>
                {d.name}
              </option>
            ))}
          </select>

          <select
            value={agentFilter}
            onChange={(e) => setAgentFilter(e.target.value)}
            aria-label="Filter by assigned agent"
            className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 bg-white"
          >
            <option value="all">All Agents</option>
            {agents.map((a) => (
              <option key={a.id} value={String(a.id)}>
                {a.fullName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {feedback && (
        <div
          className={`rounded-xl border px-4 py-2.5 flex items-center justify-between text-xs ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="font-semibold cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Split Master-Detail Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Conversation List */}
        <div className="lg:col-span-4 rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-xs font-semibold text-[#062D48]">
              {mode === 'inbox' ? 'Live Queue' : 'All Conversations'} (
              <span className="font-mono tabular-nums">{conversations.length}</span>)
            </h2>
          </div>

          <div className="divide-y divide-slate-100 max-h-[680px] overflow-y-auto">
            {loadingList ? (
              <div className="p-6 text-center text-xs text-slate-500">
                Loading conversations...
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">
                No conversations match your current filters.
              </div>
            ) : (
              conversations.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedId(c.id)}
                  className={`w-full text-left p-4 transition-colors cursor-pointer ${
                    selectedId === c.id ? 'bg-slate-50' : 'hover:bg-slate-50/60'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-[#062D48] truncate">
                      {c.customer?.fullName || 'Customer'}
                    </span>
                    <StatusIndicator status={c.status} />
                  </div>
                  <p className="mt-1 text-sm font-medium text-slate-900 truncate">
                    {c.subject}
                  </p>
                  <div className="mt-1.5 flex items-center justify-between gap-2 text-[11px] text-slate-500">
                    <span className="truncate">
                      {c.department?.name || 'General'} · {c.category}
                    </span>
                    <PriorityText priority={c.priority} />
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Conversation Detail & Controls */}
        <div className="lg:col-span-8 space-y-4">
          {!detailConv ? (
            <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500">
              Select a conversation from the queue to inspect messages, assign
              agents, or reply to the customer.
            </div>
          ) : loadingDetail ? (
            <div className="rounded-xl border border-slate-200 bg-white p-12 flex items-center justify-center gap-2 text-sm text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Loading transcript...</span>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
              {/* Detail Header */}
              <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="font-mono tabular-nums">#{detailConv.id}</span>
                    <span>·</span>
                    <span>{detailConv.category}</span>
                    <span>·</span>
                    <PriorityText priority={detailConv.priority} />
                  </div>
                  <h2 className="mt-1 text-lg font-bold text-[#062D48] truncate">
                    {detailConv.subject}
                  </h2>
                  <p className="mt-1 text-xs text-slate-600">
                    Customer:{' '}
                    <span className="font-semibold text-slate-900">
                      {detailConv.customer?.fullName}
                    </span>{' '}
                    ({detailConv.customer?.email})
                    {detailConv.customer?.phone ? ` · ${detailConv.customer.phone}` : ''}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <select
                    value={detailConv.status}
                    onChange={(e) =>
                      handleStatusChange(e.target.value as ConversationStatus)
                    }
                    aria-label="Change conversation status"
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-[#062D48] bg-white"
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Assignment & Resolution Bar */}
              <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={assignDeptId}
                    onChange={(e) => setAssignDeptId(e.target.value)}
                    aria-label="Department"
                    className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs bg-white"
                  >
                    <option value="">Select department...</option>
                    {departments.map((d) => (
                      <option key={d.id} value={String(d.id)}>
                        {d.name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={assignAgentId}
                    onChange={(e) => setAssignAgentId(e.target.value)}
                    aria-label="Assigned Agent"
                    className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs bg-white"
                  >
                    <option value="">Unassigned (Department Queue)</option>
                    {agents.map((a) => (
                      <option key={a.id} value={String(a.id)}>
                        {a.fullName}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    disabled={!assignDeptId || busyAction}
                    onClick={handleAssignTransfer}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#062D48] hover:bg-[#093e63] text-white text-xs font-medium cursor-pointer disabled:opacity-50"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Assign / Transfer</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={resolutionOutcome}
                    onChange={(e) =>
                      setResolutionOutcome(
                        e.target.value as
                          | 'AI_RESOLVED'
                          | 'AGENT_RESOLVED'
                          | 'UNRESOLVED'
                      )
                    }
                    aria-label="Resolution outcome"
                    className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs bg-white"
                  >
                    <option value="AGENT_RESOLVED">Agent Resolved</option>
                    <option value="AI_RESOLVED">AI Resolved</option>
                    <option value="UNRESOLVED">Unresolved</option>
                  </select>
                  <button
                    type="button"
                    disabled={busyAction}
                    onClick={handleResolve}
                    className="px-3 py-1.5 rounded-lg bg-[#0D9488] hover:bg-[#0f766e] text-white text-xs font-medium cursor-pointer disabled:opacity-50"
                  >
                    Mark Resolved
                  </button>
                </div>
              </div>

              {/* Message Transcript */}
              <div className="p-5 space-y-3 max-h-[380px] overflow-y-auto bg-white">
                {messages.map((m) => {
                  const isAgent = m.senderType === 'AGENT';
                  const isSystem = m.senderType === 'SYSTEM';
                  return (
                    <div
                      key={m.id}
                      className={`rounded-lg border p-3.5 text-sm ${
                        isSystem
                          ? 'bg-amber-50/60 border-amber-200 text-amber-950'
                          : isAgent
                            ? 'bg-[#062D48]/5 border-[#062D48]/20 text-slate-900'
                            : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-semibold text-[#062D48]">
                          {m.senderType}
                        </span>
                        <span className="font-mono tabular-nums text-slate-400">
                          {new Date(m.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="whitespace-pre-wrap leading-relaxed">
                        {m.message}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Agent Reply Composer with Quick Replies */}
              <form
                onSubmit={handleReply}
                className="p-4 border-t border-slate-200 bg-slate-50 space-y-2.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <QuickRepliesPicker
                    customerName={detailConv.customer?.fullName}
                    ticketId={detailConv.id}
                    conversationCategory={detailConv.category}
                    slashQuery={replyText.startsWith('/') ? replyText : null}
                    disabled={busyAction}
                    onInsert={(text) => {
                      setReplyText((prev) =>
                        prev.trim() && !prev.trim().startsWith('/')
                          ? `${prev.trimEnd()}\n\n${text}`
                          : text
                      );
                      setTimeout(() => replyInputRef.current?.focus(), 0);
                    }}
                  />
                  <span className="text-[11px] text-slate-400">
                    Tip: Type <span className="font-mono">/</span> for template shortcuts · Enter to send
                  </span>
                </div>

                <div className="flex items-end gap-2">
                  <textarea
                    ref={replyInputRef}
                    rows={2}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if (!busyAction && replyText.trim()) {
                          e.currentTarget.form?.requestSubmit();
                        }
                      }
                    }}
                    placeholder="Write a direct agent response to the customer..."
                    className="flex-1 min-w-0 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-base sm:text-sm focus:outline-none focus:border-[#062D48] resize-y min-h-[44px]"
                  />
                  <button
                    type="submit"
                    disabled={busyAction || !replyText.trim()}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-[#062D48] hover:bg-[#093e63] disabled:opacity-50 text-white text-xs font-semibold cursor-pointer whitespace-nowrap shrink-0 min-h-[44px]"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Reply</span>
                  </button>
                </div>
              </form>

              {/* Internal Agent Notes */}
              <div className="p-5 border-t border-slate-200 bg-white space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#062D48]">
                  <StickyNote className="w-3.5 h-3.5 text-[#0D9488]" />
                  <span>Internal Support Notes (Hidden from Customer)</span>
                </div>

                <form onSubmit={handleAddNote} className="flex gap-2">
                  <input
                    type="text"
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Add internal triage note for team members..."
                    className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs focus:outline-none focus:border-[#062D48]"
                  />
                  <button
                    type="submit"
                    disabled={busyAction || !noteText.trim()}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer disabled:opacity-50"
                  >
                    Add Note
                  </button>
                </form>

                {notes.length > 0 && (
                  <div className="space-y-2 pt-1">
                    {notes.map((n) => (
                      <div
                        key={n.id}
                        className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-xs"
                      >
                        <div className="flex items-center justify-between text-slate-500 mb-0.5">
                          <span className="font-semibold text-slate-800">
                            {n.agentName}
                          </span>
                          <span className="font-mono tabular-nums">
                            {new Date(n.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-slate-700">{n.note}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
