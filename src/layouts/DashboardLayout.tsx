import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  BookOpen,
  Building2,
  GitBranch,
  Inbox,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Settings,
  UserCog,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  { label: 'Overview', to: '/dashboard', icon: LayoutDashboard, end: true },
  { label: 'Conversations', to: '/dashboard/conversations', icon: MessageSquare },
  { label: 'Live Inbox', to: '/dashboard/inbox', icon: Inbox },
  { label: 'Customers', to: '/dashboard/customers', icon: Users },
  { label: 'Support Agents', to: '/dashboard/agents', icon: UserCog },
  { label: 'Departments', to: '/dashboard/departments', icon: Building2 },
  { label: 'Knowledge Base', to: '/dashboard/knowledge', icon: BookOpen },
  { label: 'Routing Rules', to: '/dashboard/routing', icon: GitBranch },
  { label: 'Analytics', to: '/dashboard/analytics', icon: BarChart3 },
  { label: 'Settings', to: '/dashboard/settings', icon: Settings },
];

export function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);

  const currentNav =
    NAV_ITEMS.find((n) =>
      n.end ? location.pathname === n.to : location.pathname.startsWith(n.to)
    ) ?? NAV_ITEMS[0];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const avatarSrc =
    user?.role === 'ADMIN'
      ? '/src/assets/images/avatar_admin_director_1795355403423.jpg'
      : '/src/assets/images/avatar_support_lead_1795355403433.jpg';

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#062D48] text-slate-200">
      <div className="h-16 px-5 flex items-center justify-between border-b border-white/10">
        <Link
          to="/"
          className="text-base font-bold tracking-tight text-white whitespace-nowrap"
        >
          Support Flow AI
        </Link>
        <button
          type="button"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close navigation"
          className="lg:hidden p-1.5 rounded-lg text-slate-300 hover:bg-white/10"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-[#0D9488] text-white'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="p-3 border-t border-white/10 space-y-2">
        <div className="px-3 py-2 flex items-center gap-3">
          {!avatarFailed ? (
            <img
              src={avatarSrc}
              alt={user?.fullName || 'User avatar'}
              referrerPolicy="no-referrer"
              onError={() => setAvatarFailed(true)}
              className="w-9 h-9 rounded-lg object-cover shrink-0 border border-white/15"
            />
          ) : (
            <div className="w-9 h-9 rounded-lg bg-[#0D9488] flex items-center justify-center text-xs font-bold text-white shrink-0">
              {(user?.fullName || 'SF').slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-xs font-semibold text-white truncate">
              {user?.fullName}
            </p>
            <p className="text-[11px] text-slate-300 truncate">{user?.role}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 border-r border-slate-200">
        <div className="sticky top-0 h-screen">{sidebarContent}</div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="w-64 h-full shadow-xl">{sidebarContent}</div>
          <div
            className="flex-1 bg-slate-950/40"
            onClick={() => setSidebarOpen(false)}
          />
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation"
              className="lg:hidden p-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-sm min-w-0">
              <span className="text-slate-400 hidden sm:inline">Dashboard</span>
              <span className="text-slate-300 hidden sm:inline">/</span>
              <h1 className="font-semibold text-[#062D48] truncate">
                {currentNav.label}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              to="/chat"
              className="px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 whitespace-nowrap"
            >
              Customer Chat View
            </Link>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1440px] w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
