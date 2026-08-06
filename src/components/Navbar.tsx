import React from 'react';
import { Clipboard, Terminal, Settings as SettingsIcon, BarChart3, Command, Sparkles, Sun, Moon } from 'lucide-react';
import { ActiveTab, AppSettings } from '../types';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  itemCount: number;
  onOpenOverlay: () => void;
  settings: AppSettings;
  onToggleTheme: () => void;
}

const TABS: { id: ActiveTab; label: string; shortLabel: string; icon: React.ElementType }[] = [
  { id: 'simulator', label: 'Simulador Ao Vivo', shortLabel: 'Simulador', icon: Command },
  { id: 'ubuntu-script', label: 'Instalação no Ubuntu', shortLabel: 'Instalar', icon: Terminal },
  { id: 'settings', label: 'Configurações', shortLabel: 'Ajustes', icon: SettingsIcon },
  { id: 'stats', label: 'Recursos & RAM', shortLabel: 'RAM & CPU', icon: BarChart3 },
];

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  itemCount,
  onOpenOverlay,
  settings,
  onToggleTheme,
}) => {
  return (
    <header className="bg-cream dark:bg-night border-b-[3px] border-ink dark:border-paper/80 sticky top-0 z-40 text-ink dark:text-paper">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* Brand Logo */}
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-10 h-10 shrink-0 rounded-xl bg-brand-blue dark:bg-brand-blue-night border-[3px] border-ink dark:border-paper/80 flex items-center justify-center shadow-[3px_3px_0_0_rgba(27,26,23,1)] dark:shadow-[3px_3px_0_0_rgba(0,0,0,0.55)]">
              <Clipboard className="w-5 h-5 text-ink" strokeWidth={2.5} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <span className="font-display font-bold text-lg tracking-tight truncate">ClipMaster</span>
                <span className="badge-neo text-[10px] px-2 py-0.5 bg-brand-yellow text-ink shrink-0">
                  Ubuntu Nativo
                </span>
              </div>
              <p className="text-xs text-ink/60 dark:text-paper/60 hidden sm:block truncate">
                Histórico de Cópia ({settings.shortcut}) • Consumo Low-RAM (~12MB)
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center space-x-1 bg-cream-soft dark:bg-night-soft p-1.5 rounded-xl border-[3px] border-ink dark:border-paper/80">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-brand-blue dark:bg-brand-blue-night text-ink border-2 border-ink dark:border-paper/80 shadow-[2px_2px_0_0_rgba(27,26,23,1)] dark:shadow-[2px_2px_0_0_rgba(0,0,0,0.5)]'
                      : 'text-ink/60 dark:text-paper/60 hover:text-ink dark:hover:text-paper hover:bg-cream dark:hover:bg-night-card border-2 border-transparent'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                  {tab.id === 'simulator' && (
                    <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded bg-ink/10 dark:bg-paper/15 font-bold">
                      {itemCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Action Trigger + Theme Toggle */}
          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={onToggleTheme}
              className="btn-neo p-2 bg-cream-card dark:bg-night-card text-ink dark:text-paper"
              title={settings.theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
            >
              {settings.theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <button
              onClick={onOpenOverlay}
              className="btn-neo hidden sm:flex items-center space-x-2 px-3.5 py-2 bg-brand-yellow text-ink text-xs"
              title="Abrir janela de histórico (Super + V)"
            >
              <Sparkles className="w-4 h-4" />
              <span>Testar Pop-up</span>
              <kbd className="px-1.5 py-0.5 bg-ink/10 rounded text-[10px] font-mono border border-ink/20">
                {settings.shortcut}
              </kbd>
            </button>
            <button
              onClick={onOpenOverlay}
              className="btn-neo sm:hidden p-2 bg-brand-yellow text-ink"
              title="Abrir janela de histórico"
            >
              <Sparkles className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mobile Navigation Tabs */}
        <div className="md:hidden flex items-center justify-around py-2 border-t-2 border-ink/20 dark:border-paper/20 overflow-x-auto text-xs gap-1">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-lg font-bold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-brand-blue dark:bg-brand-blue-night text-ink border-2 border-ink dark:border-paper/80'
                    : 'text-ink/60 dark:text-paper/60'
                }`}
              >
                {tab.id === 'simulator' ? `${tab.shortLabel} (${itemCount})` : tab.shortLabel}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
