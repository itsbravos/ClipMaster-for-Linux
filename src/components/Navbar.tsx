import React from 'react';
import { Clipboard, Terminal, Settings as SettingsIcon, BarChart3, Command, Cpu, Sparkles } from 'lucide-react';
import { ActiveTab, AppSettings } from '../types';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  itemCount: number;
  onOpenOverlay: () => void;
  settings: AppSettings;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  itemCount,
  onOpenOverlay,
  settings,
}) => {
  return (
    <header className="bg-[#1E1E24] border-b border-[#2D2D38] sticky top-0 z-40 text-gray-100 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Ubuntu Yaru Badge */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#E95420] to-[#77216F] flex items-center justify-center shadow-lg shadow-[#E95420]/20">
              <Clipboard className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg text-white tracking-tight">ClipMaster</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-[#E95420]/20 text-[#E95420] font-medium border border-[#E95420]/30">
                  Ubuntu Yaru
                </span>
              </div>
              <p className="text-xs text-gray-400 hidden sm:block">
                Histórico de Cópia ({settings.shortcut}) • Consumo Low-RAM (~12MB)
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center space-x-1 bg-[#141418] p-1.5 rounded-xl border border-[#2D2D38]">
            <button
              onClick={() => setActiveTab('simulator')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'simulator'
                  ? 'bg-[#E95420] text-white shadow'
                  : 'text-gray-400 hover:text-white hover:bg-[#252530]'
              }`}
            >
              <Command className="w-3.5 h-3.5" />
              <span>Simulador Ao Vivo</span>
              <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded bg-black/30 font-bold">
                {itemCount}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('ubuntu-script')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'ubuntu-script'
                  ? 'bg-[#E95420] text-white shadow'
                  : 'text-gray-400 hover:text-white hover:bg-[#252530]'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Instalação no Ubuntu</span>
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'settings'
                  ? 'bg-[#E95420] text-white shadow'
                  : 'text-gray-400 hover:text-white hover:bg-[#252530]'
              }`}
            >
              <SettingsIcon className="w-3.5 h-3.5" />
              <span>Configurações</span>
            </button>

            <button
              onClick={() => setActiveTab('stats')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'stats'
                  ? 'bg-[#E95420] text-white shadow'
                  : 'text-gray-400 hover:text-white hover:bg-[#252530]'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Recursos & RAM</span>
            </button>
          </nav>

          {/* Action Trigger Button */}
          <div className="flex items-center space-x-3">
            <button
              onClick={onOpenOverlay}
              className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#E95420] to-[#C74312] hover:from-[#f05a26] hover:to-[#d84815] text-white text-xs font-semibold shadow-lg shadow-[#E95420]/25 transition-all transform active:scale-95"
              title="Abrir janela de histórico (Super + V)"
            >
              <Sparkles className="w-4 h-4 animate-pulse" />
              <span className="hidden sm:inline">Testar Pop-up</span>
              <kbd className="px-1.5 py-0.5 bg-black/30 rounded text-[10px] font-mono border border-white/20">
                {settings.shortcut}
              </kbd>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Tabs */}
        <div className="md:hidden flex items-center justify-around py-2 border-t border-[#2D2D38] overflow-x-auto text-xs">
          <button
            onClick={() => setActiveTab('simulator')}
            className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap ${
              activeTab === 'simulator' ? 'bg-[#E95420] text-white' : 'text-gray-400'
            }`}
          >
            Simulador ({itemCount})
          </button>
          <button
            onClick={() => setActiveTab('ubuntu-script')}
            className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap ${
              activeTab === 'ubuntu-script' ? 'bg-[#E95420] text-white' : 'text-gray-400'
            }`}
          >
            Instalar
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap ${
              activeTab === 'settings' ? 'bg-[#E95420] text-white' : 'text-gray-400'
            }`}
          >
            Ajustes
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap ${
              activeTab === 'stats' ? 'bg-[#E95420] text-white' : 'text-gray-400'
            }`}
          >
            RAM & CPU
          </button>
        </div>
      </div>
    </header>
  );
};
