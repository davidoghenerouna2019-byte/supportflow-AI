import { useEffect, useState } from 'react';
import { Loader2, Search } from 'lucide-react';
import { StatusIndicator } from '../../components/StatusBadge';
import { api, extractApiError } from '../../services/api';

interface CustomerRecord {
  id: number;
  fullName: string;
  email: string;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
  conversationCount: number;
  conversations: Array<{
    id: number;
    subject: string;
    category: string;
    status: string;
    createdAt: string;
  }>;
}

export function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [selected, setSelected] = useState<CustomerRecord | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ customers: CustomerRecord[] }>('/customers')
      .then((res) => {
        setCustomers(res.data.customers);
        if (res.data.customers.length > 0) {
          setSelected(res.data.customers[0]);
        }
      })
      .catch((err) =>
        setError(extractApiError(err, 'Failed to load customers.'))
      )
      .finally(() => setLoading(false));
  }, []);

  const filtered = customers.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      c.fullName.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q)
    );
  });

  if (loading) {
    return (
      <div className="py-16 flex items-center justify-center gap-2 text-sm text-slate-500">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Loading customer directory...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
        {error}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      <div className="lg:col-span-7 rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-[#062D48]">
            Registered &amp; Contacted Customers ({filtered.length})
          </h2>
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or email..."
              className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-1.5 text-xs focus:outline-none focus:border-[#062D48]"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-500">
                <th className="py-2.5 px-4">Customer</th>
                <th className="py-2.5 px-4">Contact Details</th>
                <th className="py-2.5 px-4 text-right">Conversations</th>
                <th className="py-2.5 px-4 text-right">Registered</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filtered.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => setSelected(c)}
                  className={`cursor-pointer transition-colors ${
                    selected?.id === c.id ? 'bg-slate-50' : 'hover:bg-slate-50/70'
                  }`}
                >
                  <td className="py-3 px-4 font-semibold text-slate-900">
                    {c.fullName}
                  </td>
                  <td className="py-3 px-4 text-slate-600">
                    <div>{c.email}</div>
                    {c.phone && (
                      <div className="font-mono text-[11px] text-slate-400">
                        {c.phone}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-[#062D48]">
                    {c.conversationCount}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-500">
                    {new Date(c.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="lg:col-span-5 rounded-xl border border-slate-200 bg-white p-5 space-y-4">
        {selected ? (
          <>
            <div className="pb-4 border-b border-slate-200">
              <h3 className="text-base font-bold text-[#062D48]">
                {selected.fullName}
              </h3>
              <p className="text-xs text-slate-600 mt-1">{selected.email}</p>
              <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                <span>{selected.phone || 'No phone provided'}</span>
                <span>·</span>
                <span className="font-mono tabular-nums">
                  Joined {new Date(selected.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>

            <div className="space-y-2.5">
              <h4 className="text-xs font-semibold text-[#062D48]">
                Previous Conversation History ({selected.conversationCount})
              </h4>
              {selected.conversations.length === 0 ? (
                <p className="text-xs text-slate-500">
                  No conversations recorded for this customer yet.
                </p>
              ) : (
                selected.conversations.map((h) => (
                  <div
                    key={h.id}
                    className="rounded-lg border border-slate-200 p-3 space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-900 truncate">
                        {h.subject}
                      </span>
                      <StatusIndicator status={h.status} />
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-2">
                      <span>{h.category}</span>
                      <span>·</span>
                      <span className="font-mono tabular-nums">
                        {new Date(h.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        ) : (
          <p className="text-xs text-slate-500">
            Select a customer to inspect their conversation history.
          </p>
        )}
      </div>
    </div>
  );
}
