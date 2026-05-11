import { AppShell } from './components/AppShell';
import { EmptyState } from './components/Primitives';
import { useDashboardData } from './hooks/useDashboardData';
import { AddScreen } from './screens/Add';
import { AreasScreen } from './screens/Areas';
import { HomeScreen } from './screens/Home';
import { InsightsScreen } from './screens/Insights';
import { OnboardingScreen } from './screens/Onboarding';
import { SettingsScreen } from './screens/Settings';
import type { AreaKey, DashboardEntry, EntryType, Screen } from './types';
import { useState } from 'react';

export default function App() {
  const dashboard = useDashboardData();
  const [screen, setScreen] = useState<Screen>('home');
  const [selectedArea, setSelectedArea] = useState<AreaKey>('mood');
  const [activeEntryType, setActiveEntryType] = useState<EntryType>('mood');
  const [editingEntry, setEditingEntry] = useState<DashboardEntry | null>(null);

  const startAdd = (type: EntryType) => {
    setEditingEntry(null);
    setActiveEntryType(type);
    setScreen('add');
  };

  const startEdit = (entry: DashboardEntry) => {
    setEditingEntry(entry);
    setActiveEntryType(entry.type);
    setScreen('add');
  };

  const navigate = (nextScreen: Screen) => {
    if (nextScreen !== 'add') setEditingEntry(null);
    setScreen(nextScreen);
  };

  if (dashboard.loading || !dashboard.settings) {
    return (
      <main className="app-loading">
        <div className="cat-badge" aria-hidden="true" />
        <h1>Life Dashboard</h1>
        <p>Opening your private local dashboard...</p>
      </main>
    );
  }

  const saveEntry = async (entry: DashboardEntry) => {
    await dashboard.upsertEntry(entry);
    setEditingEntry(null);
    setScreen('home');
  };

  return (
    <>
      <AppShell
        screen={screen}
        onNavigate={navigate}
        onAreaShortcut={(area) => {
          setSelectedArea(area);
          setScreen('areas');
        }}
        dimmed={!dashboard.settings.onboardingCompleted}
      >
        {screen === 'home' && (
          <HomeScreen
            entries={dashboard.entries}
            settings={dashboard.settings}
            insights={dashboard.insights}
            onAdd={startAdd}
            onEdit={startEdit}
            onDelete={dashboard.removeEntry}
          />
        )}

        {screen === 'add' && (
          <AddScreen
            activeType={activeEntryType}
            settings={dashboard.settings}
            editingEntry={editingEntry}
            onTypeChange={setActiveEntryType}
            onSave={saveEntry}
            onSaveSettings={dashboard.updateSettings}
            onSaveLocalFood={dashboard.upsertLocalFood}
            onCancelEdit={() => {
              setEditingEntry(null);
              setScreen('home');
            }}
          />
        )}

        {screen === 'insights' && <InsightsScreen insights={dashboard.insights} />}

        {screen === 'areas' && (
          <AreasScreen
            selectedArea={selectedArea}
            entries={dashboard.entries}
            settings={dashboard.settings}
            insights={dashboard.insights}
            onAreaChange={setSelectedArea}
            onAdd={startAdd}
            onEdit={startEdit}
            onDelete={dashboard.removeEntry}
            localFoods={dashboard.localFoods}
            weightLogs={dashboard.weightLogs}
            onSaveEntry={dashboard.upsertEntry}
            onSaveLocalFood={dashboard.upsertLocalFood}
            onSaveSettings={dashboard.updateSettings}
            onSaveWeightLog={dashboard.upsertWeightLog}
          />
        )}

        {screen === 'settings' && (
          <SettingsScreen
            settings={dashboard.settings}
            onSaveSettings={dashboard.updateSettings}
            onExport={dashboard.exportData}
            onImport={dashboard.importData}
            onReset={dashboard.resetData}
          />
        )}

        {!['home', 'add', 'insights', 'areas', 'settings'].includes(screen) && (
          <EmptyState title="Screen missing" body="Choose another area from the navigation." />
        )}
      </AppShell>

      {!dashboard.settings.onboardingCompleted && (
        <OnboardingScreen settings={dashboard.settings} onComplete={dashboard.updateSettings} />
      )}
    </>
  );
}
