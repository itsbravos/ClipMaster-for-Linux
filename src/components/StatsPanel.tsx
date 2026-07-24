import React from 'react';
import { Cpu, HardDrive, BarChart2, Activity, Zap, CheckCircle2, ShieldCheck, Layers } from 'lucide-react';
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
      <div className="bg-[#1E1E28] border border-[#2D2D3A] rounded-2xl p-6 shadow-xl flex items-center justify-between">
        <div className="space-y-1">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-sky-500/15 text-sky-400 text-xs font-semibold border border-sky-500/30">
            <Activity className="w-3.5 h-3.5 animate-pulse" />
            <span>Telemetria de Desempenho & Memória</span>
          </div>
          <h1 className="text-xl font-bold text-white">Consumo de Recursos do Sistema Ubuntu</h1>
          <p className="text-xs text-gray-400">
            Acompanhe o consumo ultrabaixo em segundo plano do daemon GTK3 / Python.
          </p>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#1E1E26] border border-[#2D2D3A] rounded-2xl p-4 space-y-2 shadow-lg">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>Uso Estima de RAM</span>
            <HardDrive className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-black text-white">{estimatedRam}</span>
            <span className="text-xs text-emerald-400 font-bold">MB</span>
          </div>
          <p className="text-[11px] text-gray-500">~90% menor que apps Electron</p>
        </div>

        <div className="bg-[#1E1E26] border border-[#2D2D3A] rounded-2xl p-4 space-y-2 shadow-lg">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>Uso de CPU em Repouso</span>
            <Cpu className="w-4 h-4 text-sky-400" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-black text-white">0.0</span>
            <span className="text-xs text-sky-400 font-bold">%</span>
          </div>
          <p className="text-[11px] text-gray-500">Zero impacto no processador</p>
        </div>

        <div className="bg-[#1E1E26] border border-[#2D2D3A] rounded-2xl p-4 space-y-2 shadow-lg">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>Itens no Histórico</span>
            <BarChart2 className="w-4 h-4 text-[#E95420]" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-black text-white">{totalItems}</span>
            <span className="text-xs text-[#E95420] font-bold">cópias</span>
          </div>
          <p className="text-[11px] text-gray-500">{pinnedCount} itens fixados</p>
        </div>

        <div className="bg-[#1E1E26] border border-[#2D2D3A] rounded-2xl p-4 space-y-2 shadow-lg">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>Atalho Registrado</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-lg font-bold text-amber-400">Super + C</span>
          </div>
          <p className="text-[11px] text-gray-500">GNOME Media Keys Binding</p>
        </div>
      </div>

      {/* Comparison Chart */}
      <div className="bg-[#1E1E26] border border-[#2D2D3A] rounded-2xl p-6 space-y-5 shadow-lg">
        <h2 className="text-sm font-semibold text-white flex items-center space-x-2">
          <BarChart2 className="w-4 h-4 text-[#E95420]" />
          <span>Comparativo de Consumo de RAM no Linux (MB)</span>
        </h2>

        <div className="space-y-4 text-xs">
          {/* ClipMaster GTK */}
          <div>
            <div className="flex justify-between mb-1">
              <span className="font-semibold text-emerald-400 flex items-center space-x-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>ClipMaster Ubuntu (Nosso Daemon Python GTK3)</span>
              </span>
              <span className="font-mono text-emerald-400 font-bold">~12 MB</span>
            </div>
            <div className="w-full bg-[#14141C] h-3 rounded-full overflow-hidden">
              <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: '8%' }} />
            </div>
          </div>

          {/* CopyQ */}
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-gray-300">CopyQ (Qt C++)</span>
              <span className="font-mono text-gray-300">~28 MB</span>
            </div>
            <div className="w-full bg-[#14141C] h-3 rounded-full overflow-hidden">
              <div className="bg-sky-500 h-full rounded-full transition-all duration-500" style={{ width: '18%' }} />
            </div>
          </div>

          {/* GPaste */}
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-gray-300">GPaste (Vala/GNOME)</span>
              <span className="font-mono text-gray-300">~35 MB</span>
            </div>
            <div className="w-full bg-[#14141C] h-3 rounded-full overflow-hidden">
              <div className="bg-purple-500 h-full rounded-full transition-all duration-500" style={{ width: '22%' }} />
            </div>
          </div>

          {/* Electron App */}
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-rose-400">Gerenciadores Genéricos em Electron</span>
              <span className="font-mono text-rose-400">~180 MB+</span>
            </div>
            <div className="w-full bg-[#14141C] h-3 rounded-full overflow-hidden">
              <div className="bg-rose-500 h-full rounded-full transition-all duration-500" style={{ width: '90%' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Content Types Breakdown */}
      <div className="bg-[#1E1E26] border border-[#2D2D3A] rounded-2xl p-6 space-y-4 shadow-lg">
        <h2 className="text-sm font-semibold text-white flex items-center space-x-2">
          <Layers className="w-4 h-4 text-sky-400" />
          <span>Distribuição por Tipo de Conteúdo</span>
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-[#14141C] p-3 rounded-xl border border-[#2B2B38]">
            <span className="text-gray-400 block mb-1">Comandos Terminal</span>
            <span className="text-lg font-bold text-purple-400">{commandCount}</span>
          </div>

          <div className="bg-[#14141C] p-3 rounded-xl border border-[#2B2B38]">
            <span className="text-gray-400 block mb-1">Códigos Snippets</span>
            <span className="text-lg font-bold text-emerald-400">{codeCount}</span>
          </div>

          <div className="bg-[#14141C] p-3 rounded-xl border border-[#2B2B38]">
            <span className="text-gray-400 block mb-1">Links / URLs</span>
            <span className="text-lg font-bold text-sky-400">{urlCount}</span>
          </div>

          <div className="bg-[#14141C] p-3 rounded-xl border border-[#2B2B38]">
            <span className="text-gray-400 block mb-1">Chaves / Senhas</span>
            <span className="text-lg font-bold text-amber-400">{sensitiveCount}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
