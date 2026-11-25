import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Inbox,
  UserCheck,
  XCircle,
} from 'lucide-react';
import type { ConversationStatus } from '../types';

export function StatusIndicator({ status }: { status: ConversationStatus | string }) {
  const upper = status.toUpperCase();

  switch (upper) {
    case 'OPEN':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#0891B2] whitespace-nowrap">
          <Inbox className="w-3.5 h-3.5" aria-hidden="true" />
          Open
        </span>
      );
    case 'PENDING':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 whitespace-nowrap">
          <Clock className="w-3.5 h-3.5" aria-hidden="true" />
          Pending
        </span>
      );
    case 'ASSIGNED':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#062D48] whitespace-nowrap">
          <UserCheck className="w-3.5 h-3.5" aria-hidden="true" />
          Assigned
        </span>
      );
    case 'ESCALATED':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-700 whitespace-nowrap">
          <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
          Escalated
        </span>
      );
    case 'RESOLVED':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 whitespace-nowrap">
          <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
          Resolved
        </span>
      );
    case 'CLOSED':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 whitespace-nowrap">
          <XCircle className="w-3.5 h-3.5" aria-hidden="true" />
          Closed
        </span>
      );
    default:
      return <span className="text-xs font-medium text-slate-600">{status}</span>;
  }
}

export function PriorityText({ priority }: { priority: string }) {
  const upper = priority.toUpperCase();
  const color =
    upper === 'URGENT'
      ? 'text-rose-700 font-semibold'
      : upper === 'HIGH'
        ? 'text-amber-700 font-medium'
        : upper === 'MEDIUM'
          ? 'text-slate-700'
          : 'text-slate-500';

  const label = upper.charAt(0) + upper.slice(1).toLowerCase();
  return <span className={`text-xs whitespace-nowrap ${color}`}>{label}</span>;
}
