import { Activity, BarChart3, Home, Plus, Settings, SlidersHorizontal } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Screen } from '../types';

const navItems: Array<{ key: Screen; label: string; icon: LucideIcon }> = [
  { key: 'home', label: 'Home', icon: Home },
  { key: 'add', label: 'Add', icon: Plus },
  { key: 'insights', label: 'Insights', icon: BarChart3 },
  { key: 'areas', label: 'Areas', icon: Activity },
  { key: 'settings', label: 'Settings', icon: Settings }
];

export function AppShell({
  screen,
  onNavigate,
  children
}: {
  screen: Screen;
  onNavigate: (screen: Screen) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p>{new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: '2-digit', month: 'long' }).format(new Date())}</p>
          <h1>Life Dashboard</h1>
        </div>
        <div className="cat-lockup" aria-hidden="true">
          <span className="mini-paws" />
          <span className="cat-silhouette" />
        </div>
      </header>

      <div className="desktop-frame">
        <aside className="desktop-rail" aria-label="Dashboard navigation">
          <div className="rail-brand">
            <SlidersHorizontal size={18} />
            <span>Private</span>
          </div>
          {navItems.map(({ key, label, icon: Icon }) => (
            <button key={key} type="button" className={screen === key ? 'active' : ''} onClick={() => onNavigate(key)}>
              <Icon size={18} />
              <span>{label}</span>
            </button>
          ))}
        </aside>
        <main className="screen-panel">{children}</main>
      </div>

      <nav className="bottom-nav" aria-label="Dashboard navigation">
        {navItems.map(({ key, label, icon: Icon }) => (
          <button key={key} type="button" className={screen === key ? 'active' : ''} onClick={() => onNavigate(key)}>
            <Icon size={20} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
