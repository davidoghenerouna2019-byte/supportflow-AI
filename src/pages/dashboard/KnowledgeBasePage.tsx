import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  EyeOff,
  Loader2,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api, extractApiError } from '../../services/api';
import type { KnowledgeArticle } from '../../types';

const CATEGORIES = ['General', 'Technical', 'Billing', 'Sales', 'Complaints'];

export function KnowledgeBasePage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('General');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [keywords, setKeywords] = useState('');
  const [isPublished, setIsPublished] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get<{ articles: KnowledgeArticle[] }>('/knowledge', {
        params: {
          ...(search.trim() ? { search: search.trim() } : {}),
          ...(categoryFilter !== 'ALL' ? { category: categoryFilter } : {}),
        },
      });
      setArticles(res.data.articles);
    } catch (err) {
      setError(extractApiError(err, 'Failed to load knowledge base.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [categoryFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    load();
  };

  const openNew = () => {
    setEditingId(null);
    setTitle('');
    setCategory('General');
    setQuestion('');
    setAnswer('');
    setKeywords('');
    setIsPublished(true);
    setShowForm(true);
  };

  const openEdit = (a: KnowledgeArticle) => {
    setEditingId(a.id);
    setTitle(a.title);
    setCategory(a.category);
    setQuestion(a.question);
    setAnswer(a.answer);
    setKeywords(a.keywords);
    setIsPublished(a.isPublished);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        title,
        category,
        question,
        answer,
        keywords,
        isPublished,
      };
      if (editingId) {
        await api.put(`/knowledge/${editingId}`, payload);
      } else {
        await api.post('/knowledge', payload);
      }
      setShowForm(false);
      await load();
    } catch (err) {
      setError(extractApiError(err, 'Could not save article.'));
    } finally {
      setSaving(false);
    }
  };

  const togglePublish = async (a: KnowledgeArticle) => {
    try {
      await api.put(`/knowledge/${a.id}`, { isPublished: !a.isPublished });
      await load();
    } catch (err) {
      setError(extractApiError(err, 'Could not change publication status.'));
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/knowledge/${id}`);
      await load();
    } catch (err) {
      setError(extractApiError(err, 'Could not delete article.'));
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-[#062D48]">
            Approved Knowledge Base
          </h2>
          <p className="text-xs text-slate-500">
            The Gemini AI assistant retrieves answers exclusively from Published
            articles below.
          </p>
        </div>

        <button
          type="button"
          onClick={openNew}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#062D48] hover:bg-[#093e63] text-white text-xs font-semibold cursor-pointer self-start"
        >
          <Plus className="w-4 h-4" />
          <span>Create Article</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <form onSubmit={handleSearch} className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title, question, keywords..."
            className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-xs focus:outline-none focus:border-[#062D48]"
          />
        </form>

        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
          {['ALL', ...CATEGORIES].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                categoryFilter === cat
                  ? 'bg-white text-[#062D48] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {cat === 'ALL' ? 'All' : cat}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800">
          {error}
        </div>
      )}

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-slate-200 bg-white p-5 space-y-4"
        >
          <h3 className="text-sm font-semibold text-[#062D48]">
            {editingId ? 'Edit Knowledge Article' : 'New Knowledge Article'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Title
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Customer Question
            </label>
            <input
              type="text"
              required
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Approved Answer
            </label>
            <textarea
              required
              rows={4}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Keywords (comma-separated)
              </label>
              <input
                type="text"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="refund, invoice, billing"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 pt-5 cursor-pointer">
              <input
                type="checkbox"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
                className="rounded border-slate-300"
              />
              <span>Publish immediately (make available to AI assistant)</span>
            </label>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-[#0D9488] text-white text-xs font-semibold cursor-pointer disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save Article'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="py-12 flex items-center justify-center gap-2 text-sm text-slate-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Loading knowledge articles...</span>
        </div>
      ) : (
        <div className="space-y-3">
          {articles.map((a) => (
            <div
              key={a.id}
              className="rounded-xl border border-slate-200 bg-white p-5 space-y-2.5"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span>{a.category}</span>
                    <span>·</span>
                    <span className="font-mono tabular-nums">
                      Updated {new Date(a.updatedAt).toLocaleDateString()}
                    </span>
                    <span>·</span>
                    {a.isPublished ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Published
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-slate-500 font-medium">
                        <EyeOff className="w-3.5 h-3.5" />
                        Draft
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-bold text-[#062D48] mt-1">
                    {a.title}
                  </h3>
                </div>

                <div className="flex items-center gap-3 text-xs shrink-0">
                  <button
                    type="button"
                    onClick={() => togglePublish(a)}
                    className="font-semibold text-[#0D9488] hover:underline cursor-pointer"
                  >
                    {a.isPublished ? 'Unpublish' : 'Publish'}
                  </button>
                  <button
                    type="button"
                    onClick={() => openEdit(a)}
                    className="font-semibold text-[#062D48] hover:underline cursor-pointer"
                  >
                    Edit
                  </button>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => handleDelete(a.id)}
                      aria-label={`Delete ${a.title}`}
                      className="text-rose-600 hover:text-rose-800 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <p className="text-xs font-medium text-slate-700">
                Q: {a.question}
              </p>
              <p className="text-sm text-slate-600 leading-relaxed">
                {a.answer}
              </p>
              {a.keywords && (
                <p className="text-[11px] text-slate-400">
                  Keywords: {a.keywords}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
