import React from 'react';
import { Cpu, HardDrive, BarChart2, Activity, Zap, CheckCircle2, Layers } from 'lucide-react';
import { ClipboardItem } from '../types';

interface StatsPanelProps {
  items: ClipboardItem[];
}

export const StatsPanel: React.FC<StatsPanelProps> = ({ items }) => {
  const totalItems = items.length;
  const pinnedCount = items.filter((i) => i.isPinned).length;
  const codeCount = items.filter((i) => i.type === 'code').length;
  const urlCount = items.filter((i) => i.type === 'url').length;
  const commandCount = items.filter((i) => i.type === 'command').length;
  const sensitiveCount = items.filter((i) => i.type === 'sensitive').length;

  const estimatedRam = Math.min(25, 8 + totalItems * 0.12).toFixed(1);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Title */}
      <div className="card-neo p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="badge-neo inline-flex items-center space-x-2 px-3 py-1 bg-brand-blue dark:bg-brand-blue-night text-ink text-xs">
            <Activity className="w-3.5 h-3.5 animate-pulse" />
            <span>Telemetria de Desempenho & Memória</span>
          </div>
          <h1 className="font-display text-xl font-bold text-ink dark:text-paper">Consumo de Recursos do Sistema Ubuntu</h1>
          <p className="text-xs text-ink/60 dark:text-paper/60">
            Acompanhe o consumo ultrabaixo em segundo plano do daemon GTK3 / Python.
          </p>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card-neo p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-ink/60 dark:text-paper/60">
            <span>Uso Estimado de RAM</span>
            <HardDrive className="w-4 h-4 text-brand-green-night" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="font-display text-2xl font-black text-ink dark:text-paper">{estimatedRam}</span>
            <span className="text-xs text-brand-green-night font-bold">MB</span>
          </div>
          <p className="text-[11px] text-ink/50 dark:text-paper/50">~90% menor que apps Electron</p>
        </div>

        <div className="card-neo p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-ink/60 dark:text-paper/60">
            <span>Uso de CPU em Repouso</span>
            <Cpu className="w-4 h-4 text-brand-blue-dark dark:text-brand-blue-night" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="font-display text-2xl font-black text-ink dark:text-paper">0.0</span>
            <span className="text-xs text-brand-blue-dark dark:text-brand-blue-night font-bold">%</span>
          </div>
          <p className="text-[11px] text-ink/50 dark:text-paper/50">Zero impacto no processador</p>
        </div>

        <div className="card-neo p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-ink/60 dark:text-paper/60">
            <span>Itens no Histórico</span>
            <BarChart2 className="w-4 h-4 text-brand-purple dark:text-brand-purple-night" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="font-display text-2xl font-black text-ink dark:text-paper">{totalItems}</span>
            <span className="text-xs text-brand-purple dark:text-brand-purple-night font-bold">cópias</span>
          </div>
          <p className="text-[11px] text-ink/50 dark:text-paper/50">{pinnedCount} itens fixados</p>
        </div>

        <div className="card-neo p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-ink/60 dark:text-paper/60">
            <span>Atalho Registrado</span>
            <Zap className="w-4 h-4 text-brand-yellow-dark dark:text-brand-yellow-night" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="font-display text-lg font-bold text-brand-yellow-dark dark:text-brand-yellow-night">Super + C</span>
          </div>
          <p className="text-[11px] text-ink/50 dark:text-paper/50">GNOME Media Keys Binding</p>
        </div>
      </div>

      {/* Comparison Chart */}
      <div className="card-neo p-6 space-y-5">
        <h2 className="font-display text-sm font-bold text-ink dark:text-paper flex items-center space-x-2">
          <BarChart2 className="w-4 h-4 text-brand-blue-dark dark:text-brand-blue-night" />
          <span>Comparativo de Consumo de RAM no Linux (MB)</span>
        </h2>

        <div className="space-y-4 text-xs">
          {/* ClipMaster GTK */}
          <div>
            <div className="flex justify-between mb-1">
              <span className="font-bold text-brand-green-night flex items-center space-x-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>ClipMaster Ubuntu (Nosso Daemon Python GTK3)</span>
              </span>
              <span className="font-mono text-brand-green-night font-bold">~12 MB</span>
            </div>
            <div className="w-full bg-cream dark:bg-night-soft h-3 rounded-full overflow-hidden border-2 border-ink/20 dark:border-paper/20">
              <div className="bg-brand-green dark:bg-brand-green-night h-full rounded-full transition-all duration-500" style={{ width: '8%' }} />
            </div>
          </div>

          {/* CopyQ */}
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-ink/70 dark:text-paper/70 font-semibold">CopyQ (Qt C++)</span>
              <span className="font-mono text-ink/70 dark:text-paper/70">~28 MB</span>
            </div>
            <div className="w-full bg-cream dark:bg-night-soft h-3 rounded-full overflow-hidden border-2 border-ink/20 dark:border-paper/20">
              <div className="bg-brand-blue dark:bg-brand-blue-night h-full rounded-full transition-all duration-500" style={{ width: '18%' }} />
            </div>
          </div>

          {/* GPaste */}
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-ink/70 dark:text-paper/70 font-semibold">GPaste (Vala/GNOME)</span>
              <span className="font-mono text-ink/70 dark:text-paper/70">~35 MB</span>
            </div>
            <div className="w-full bg-cream dark:bg-night-soft h-3 rounded-full overflow-hidden border-2 border-ink/20 dark:border-paper/20">
              <div className="bg-brand-purple dark:bg-brand-purple-night h-full rounded-full transition-all duration-500" style={{ width: '22%' }} />
            </div>
          </div>

          {/* Electron App */}
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-brand-red dark:text-brand-red-night font-semibold">Gerenciadores Genéricos em Electron</span>
              <span className="font-mono text-brand-red dark:text-brand-red-night">~180 MB+</span>
            </div>
            <div className="w-full bg-cream dark:bg-night-soft h-3 rounded-full overflow-hidden border-2 border-ink/20 dark:border-paper/20">
              <div className="bg-brand-red dark:bg-brand-red-night h-full rounded-full transition-all duration-500" style={{ width: '90%' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Content Types Breakdown */}
      <div className="card-neo p-6 space-y-4">
        <h2 className="font-display text-sm font-bold text-ink dark:text-paper flex items-center space-x-2">
          <Layers className="w-4 h-4 text-brand-blue-dark dark:text-brand-blue-night" />
          <span>Distribuição por Tipo de Conteúdo</span>
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-cream dark:bg-night-soft p-3 rounded-xl border-2 border-ink/20 dark:border-paper/20">
            <span className="text-ink/60 dark:text-paper/60 block mb-1">Comandos Terminal</span>
            <span className="text-lg font-bold text-brand-purple dark:text-brand-purple-night">{commandCount}</span>
          </div>

          <div className="bg-cream dark:bg-night-soft p-3 rounded-xl border-2 border-ink/20 dark:border-paper/20">
            <span className="text-ink/60 dark:text-paper/60 block mb-1">Códigos Snippets</span>
            <span className="text-lg font-bold text-brand-green-night">{codeCount}</span>
          </div>

          <div className="bg-cream dark:bg-night-soft p-3 rounded-xl border-2 border-ink/20 dark:border-paper/20">
            <span className="text-ink/60 dark:text-paper/60 block mb-1">Links / URLs</span>
            <span className="text-lg font-bold text-brand-blue-dark dark:text-brand-blue-night">{urlCount}</span>
          </div>

          <div className="bg-cream dark:bg-night-soft p-3 rounded-xl border-2 border-ink/20 dark:border-paper/20">
            <span className="text-ink/60 dark:text-paper/60 block mb-1">Chaves / Senhas</span>
            <span className="text-lg font-bold text-brand-red dark:text-brand-red-night">{sensitiveCount}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
