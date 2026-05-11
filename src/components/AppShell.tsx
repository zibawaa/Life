import { Activity, BarChart3, CalendarDays, Dumbbell, HeartPulse, Home, Plus, Settings, Smile, Soup, Target, Trophy, WalletCards } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { AreaKey, Screen } from '../types';
import { useHorizontalDrag } from '../hooks/useHorizontalDrag';

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
  onAreaShortcut,
  children
}: {
  screen: Screen;
  onNavigate: (screen: Screen) => void;
  onAreaShortcut: (area: AreaKey) => void;
  children: React.ReactNode;
}) {
  const filterDrag = useHorizontalDrag<HTMLDivElement>();
  const filters: Array<{ key: 'all' | AreaKey; label: string; icon?: LucideIcon }> = [
    { key: 'all', label: 'All' },
    { key: 'mood', label: 'Mood', icon: Smile },
    { key: 'health', label: 'Health', icon: HeartPulse },
    { key: 'gym', label: 'Gym', icon: Dumbbell },
    { key: 'food', label: 'Food', icon: Soup },
    { key: 'finance', label: 'Money', icon: WalletCards },
    { key: 'goal', label: 'Goals', icon: Target },
    { key: 'bucket', label: 'Bucket', icon: Trophy }
  ];

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <h1>Life Dashboard</h1>
          <p>Log today. Learn tomorrow. Live better.</p>
        </div>
        <div className="cat-lockup" aria-hidden="true">
          <span className="mini-paws" />
          <span className="cat-silhouette" />
        </div>
        <button type="button" className="calendar-button" aria-label="Calendar">
          <CalendarDays size={22} />
        </button>
      </header>

      <div
        className={`filter-rail drag-scroll ${filterDrag.dragging ? 'dragging' : ''}`}
        aria-label="Timeline filters"
        ref={filterDrag.ref}
        {...filterDrag.dragProps}
      >
        {filters.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            className={key === 'all' && screen === 'home' ? 'active' : ''}
            onClick={() => (key === 'all' ? onNavigate('home') : onAreaShortcut(key))}
          >
            {Icon && <Icon size={18} />}
            <span>{label}</span>
          </button>
        ))}
      </div>

      <div className="desktop-frame">
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
