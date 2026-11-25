import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  Edit3,
  Loader2,
  MessageSquareText,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api, extractApiError } from '../services/api';
import type { QuickReply } from '../types';

const CATEGORIES = ['All', 'General', 'Technical', 'Billing', 'Sales', 'Complaints'];

interface QuickRepliesPickerProps {
  onInsert: (text: string) => void;
  customerName?: string | null;
  ticketId?: number | null;
  conversationCategory?: string | null;
  slashQuery?: string | null;
  disabled?: boolean;
  align?: 'left' | 'right';
}

export function interpolateTemplate(
  templateContent: string,
  opts: { customerName?: string | null; ticketId?: number | null }
): string {
  const safeName =
    opts.customerName && opts.customerName !== 'Website Visitor'
      ? opts.customerName.trim()
      : 'there';
  const safeTicket = opts.ticketId ? String(opts.ticketId) : 'new';

  return templateContent
    .replace(/\{\{\s*customer_name\s*\}\}/gi, safeName)
    .replace(/\{\{\s*ticket_id\s*\}\}/gi, safeTicket);
}

export function QuickRepliesPicker({
  onInsert,
  customerName,
  ticketId,
  conversationCategory,
  slashQuery,
  disabled = false,
  align = 'left',
}: QuickRepliesPickerProps) {
  const { user } = useAuth();
  const isStaff = user?.role === 'ADMIN' || user?.role === 'AGENT';

  const [open, setOpen] = useState(false);
  const [templates, setTemplates] = useState<QuickReply[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');

  // Create / Edit state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formShortcut, setFormShortcut] = useState('');
  const [formCategory, setFormCategory] = useState('General');
  const [formContent, setFormContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [insertedId, setInsertedId] = useState<number | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);

  const fetchTemplates = useCallback(async () => {
    if (!isStaff) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<{ quickReplies: QuickReply[] }>('/quick-replies');
      setTemplates(res.data.quickReplies);
    } catch (err) {
      setError(extractApiError(err, 'Could not load quick reply templates.'));
    } finally {
      setLoading(false);
    }
  }, [isStaff]);

  useEffect(() => {
    if (isStaff && templates.length === 0) {
      fetchTemplates();
    }
  }, [isStaff]);

  // Close on outside click or Escape
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handleKey);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleKey);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  const filteredTemplates = useMemo(() => {
    const q = search.trim().toLowerCase();
    return templates.filter((t) => {
      if (categoryFilter !== 'All' && t.category !== categoryFilter) {
        return false;
      }
      if (!q) return true;
      return (
        t.title.toLowerCase().includes(q) ||
        t.shortcut.toLowerCase().includes(q) ||
        t.content.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q)
      );
    });
  }, [templates, search, categoryFilter]);

  const slashMatches = useMemo(() => {
    if (!slashQuery || !slashQuery.startsWith('/')) return [];
    const q = slashQuery.toLowerCase().trim();
    return templates
      .filter(
        (t) =>
          t.shortcut.toLowerCase().includes(q) ||
          t.title.toLowerCase().includes(q)
      )
      .slice(0, 4);
  }, [slashQuery, templates]);

  if (!isStaff) {
    return null;
  }

  const handleSelect = (tpl: QuickReply) => {
    const resolved = interpolateTemplate(tpl.content, {
      customerName,
      ticketId,
    });
    onInsert(resolved);
    setInsertedId(tpl.id);
    setTimeout(() => setInsertedId(null), 900);
    setOpen(false);

    // Track template usage in background
    api
      .post<{ quickReply: QuickReply }>(`/quick-replies/${tpl.id}/use`)
      .then((res) => {
        setTemplates((prev) =>
          prev.map((item) =>
            item.id === tpl.id
              ? { ...item, usageCount: res.data.quickReply.usageCount }
              : item
          )
        );
      })
      .catch(() => undefined);
  };

  const openCreateForm = () => {
    setEditingId(null);
    setFormTitle('');
    setFormShortcut('');
    setFormCategory(
      conversationCategory && CATEGORIES.includes(conversationCategory)
        ? conversationCategory
        : 'General'
    );
    setFormContent('');
    setFormError(null);
    setShowForm(true);
  };

  const openEditForm = (tpl: QuickReply, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(tpl.id);
    setFormTitle(tpl.title);
    setFormShortcut(tpl.shortcut);
    setFormCategory(tpl.category);
    setFormContent(tpl.content);
    setFormError(null);
    setShowForm(true);
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setFormError(null);
    setSaving(true);
    try {
      if (editingId) {
        await api.put(`/quick-replies/${editingId}`, {
          title: formTitle,
          shortcut: formShortcut,
          category: formCategory,
          content: formContent,
        });
      } else {
        await api.post('/quick-replies', {
          title: formTitle,
          shortcut: formShortcut,
          category: formCategory,
          content: formContent,
          isActive: true,
        });
      }
      setShowForm(false);
      await fetchTemplates();
    } catch (err) {
      setFormError(extractApiError(err, 'Could not save template.'));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTemplate = async (tpl: QuickReply, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.delete(`/quick-replies/${tpl.id}`);
      setTemplates((prev) => prev.filter((item) => item.id !== tpl.id));
    } catch (err) {
      setError(extractApiError(err, 'Could not delete template.'));
    }
  };

  const canManage = (tpl: QuickReply) =>
    user?.role === 'ADMIN' || tpl.createdById === user?.id;

  return (
    <div ref={containerRef} className="relative inline-block">
      {/* Inline Slash-Command Suggestions when typing "/..." */}
      {slashMatches.length > 0 && !open && (
        <div
          className={`absolute bottom-full mb-2 ${
            align === 'right' ? 'right-0' : 'left-0'
          } w-72 sm:w-96 rounded-xl border border-slate-200 bg-white shadow-lg z-30 overflow-hidden`}
        >
          <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-200 text-[11px] font-medium text-slate-500 flex items-center justify-between">
            <span>Matching Quick Replies</span>
            <span className="font-mono">{slashQuery}</span>
          </div>
          <div className="divide-y divide-slate-100 max-h-52 overflow-y-auto">
            {slashMatches.map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                onClick={() => handleSelect(tpl)}
                className="w-full text-left px-3 py-2 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-[#062D48] truncate">
                    {tpl.title}
                  </span>
                  {tpl.shortcut && (
                    <span className="font-mono text-[11px] text-[#0D9488] shrink-0">
                      {tpl.shortcut}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-600 line-clamp-1 mt-0.5">
                  {tpl.content}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          setOpen((v) => !v);
          if (!open && templates.length === 0) {
            fetchTemplates();
          }
        }}
        aria-expanded={open}
        aria-label="Open Quick Replies templates"
        className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 ${
          open
            ? 'border-[#062D48] bg-[#062D48] text-white'
            : 'border-slate-300 bg-white hover:bg-slate-50 text-[#062D48]'
        }`}
      >
        {insertedId ? (
          <Check className="w-3.5 h-3.5 text-[#0D9488]" aria-hidden="true" />
        ) : (
          <MessageSquareText className="w-3.5 h-3.5" aria-hidden="true" />
        )}
        <span>Quick Replies</span>
      </button>

      {/* Popover Panel */}
      {open && (
        <div
          role="dialog"
          aria-label="Quick Replies template selector"
          className={`absolute bottom-full mb-2 ${
            align === 'right' ? 'right-0' : 'left-0'
          } w-[min(92vw,440px)] rounded-xl border border-slate-200 bg-white shadow-xl z-40 flex flex-col overflow-hidden`}
        >
          {/* Header */}
          <div className="px-4 py-3 bg-[#062D48] text-white flex items-center justify-between gap-2">
            <div>
              <h3 className="text-xs font-semibold">Quick Replies</h3>
              <p className="text-[11px] text-slate-300">
                Select a template to insert into your reply
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              {!showForm && (
                <button
                  type="button"
                  onClick={openCreateForm}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#0D9488] hover:bg-[#0f766e] text-white text-[11px] font-medium cursor-pointer whitespace-nowrap"
                >
                  <Plus className="w-3 h-3" />
                  <span>New Template</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close quick replies"
                className="p-1 rounded-md hover:bg-white/15 text-slate-200 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {showForm ? (
            <form onSubmit={handleSaveTemplate} className="p-4 space-y-3 bg-white">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-[#062D48]">
                  {editingId ? 'Edit Quick Reply Template' : 'Create Quick Reply Template'}
                </h4>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  Back to list
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="e.g., Refund Policy Status"
                    className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs focus:outline-none focus:border-[#062D48]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Shortcut (Optional)
                  </label>
                  <input
                    type="text"
                    value={formShortcut}
                    onChange={(e) => setFormShortcut(e.target.value)}
                    placeholder="/refund-status"
                    className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:border-[#062D48]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">
                  Category
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs bg-white focus:outline-none focus:border-[#062D48]"
                >
                  {CATEGORIES.filter((c) => c !== 'All').map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-medium text-slate-700">
                    Template Message
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {'{{customer_name}} · {{ticket_id}}'}
                  </span>
                </div>
                <textarea
                  required
                  rows={3}
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  placeholder="Write the predefined response text..."
                  className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs focus:outline-none focus:border-[#062D48]"
                />
              </div>

              {formError && (
                <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-2.5 py-1.5">
                  {formError}
                </p>
              )}

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#062D48] hover:bg-[#093e63] disabled:opacity-60 text-white text-xs font-medium cursor-pointer"
                >
                  {saving && <Loader2 className="w-3 h-3 animate-spin" />}
                  <span>{editingId ? 'Save Changes' : 'Create Template'}</span>
                </button>
              </div>
            </form>
          ) : (
            <>
              {/* Search & Category Tabs */}
              <div className="p-3 border-b border-slate-200 space-y-2.5 bg-slate-50/70">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search templates, /shortcuts, or text..."
                    className="w-full rounded-lg border border-slate-300 bg-white pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:border-[#062D48]"
                  />
                </div>
                <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategoryFilter(cat)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        categoryFilter === cat
                          ? 'bg-[#062D48] text-white'
                          : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Template List */}
              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                {loading ? (
                  <div className="p-6 flex items-center justify-center gap-2 text-xs text-slate-500">
                    <Loader2 className="w-4 h-4 animate-spin text-[#0D9488]" />
                    <span>Loading quick replies...</span>
                  </div>
                ) : error ? (
                  <div className="p-4 text-center space-y-2">
                    <p className="text-xs text-rose-700">{error}</p>
                    <button
                      type="button"
                      onClick={fetchTemplates}
                      className="text-xs font-semibold text-[#062D48] hover:underline cursor-pointer"
                    >
                      Retry
                    </button>
                  </div>
                ) : filteredTemplates.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500">
                    No templates match your search.
                  </div>
                ) : (
                  filteredTemplates.map((tpl) => {
                    const preview = interpolateTemplate(tpl.content, {
                      customerName,
                      ticketId,
                    });
                    return (
                      <div
                        key={tpl.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => handleSelect(tpl)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleSelect(tpl);
                          }
                        }}
                        className="p-3 hover:bg-slate-50 transition-colors cursor-pointer group focus:outline-none focus:bg-slate-50"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-[#062D48] truncate">
                              {tpl.title}
                            </p>
                            <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
                              <span>{tpl.category}</span>
                              {tpl.shortcut && (
                                <>
                                  <span aria-hidden="true">·</span>
                                  <span className="font-mono text-[#0D9488]">
                                    {tpl.shortcut}
                                  </span>
                                </>
                              )}
                              <span aria-hidden="true">·</span>
                              <span className="font-mono tabular-nums">
                                Used {tpl.usageCount}x
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {canManage(tpl) && (
                              <>
                                <button
                                  type="button"
                                  onClick={(e) => openEditForm(tpl, e)}
                                  aria-label={`Edit ${tpl.title}`}
                                  className="p-1 rounded text-slate-400 hover:text-[#062D48] hover:bg-slate-100 cursor-pointer"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => handleDeleteTemplate(tpl, e)}
                                  aria-label={`Delete ${tpl.title}`}
                                  className="p-1 rounded text-slate-400 hover:text-rose-700 hover:bg-rose-50 cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                            <span className="text-[11px] font-semibold text-[#0D9488] pl-1">
                              Insert
                            </span>
                          </div>
                        </div>
                        <p className="mt-1.5 text-xs text-slate-600 line-clamp-2 leading-relaxed">
                          {preview}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
