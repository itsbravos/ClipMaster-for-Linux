import React, { useState } from 'react';
import {
  Copy,
  Terminal,
  Code,
  Globe,
  Sparkles,
  Check,
  Plus,
  Zap,
  Cpu,
  Layers,
  Info,
  Key,
} from 'lucide-react';
import { ClipboardItem, AppSettings } from '../types';

interface LiveSimulatorProps {
  items: ClipboardItem[];
  onAddItem: (content: string, type?: ClipboardItem['type'], sourceApp?: string) => void;
  onOpenOverlay: () => void;
  settings: AppSettings;
  onCopySuccess: (text: string) => void;
}

export const LiveSimulator: React.FC<LiveSimulatorProps> = ({
  items,
  onAddItem,
  onOpenOverlay,
  settings,
  onCopySuccess,
}) => {
  const [customText, setCustomText] = useState('');
  const [targetPasteValue, setTargetPasteValue] = useState('');
  const [copiedSnippetIndex, setCopiedSnippetIndex] = useState<number | null>(null);

  const sampleSnippets = [
    {
      label: 'Comando Ubuntu (APT)',
      type: 'command' as const,
      app: 'GNOME Terminal',
      text: 'sudo apt update && sudo apt install -y curl git build-essential',
      icon: Terminal,
    },
    {
      label: 'Link de Repositório',
      type: 'url' as const,
      app: 'Firefox Browser',
      text: 'https://github.com/ubuntu/gnome-shell-extension-clipboard',
      icon: Globe,
    },
    {
      label: 'Trecho de Código Python',
      type: 'code' as const,
      app: 'VS Code',
      text: 'def get_clipboard():\n    import subprocess\n    return subprocess.check_output(["wl-paste"]).decode("utf-8")',
      icon: Code,
    },
    {
      label: 'Chave Token Sensível',
      type: 'sensitive' as const,
      app: 'Terminal',
      text: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0',
      icon: Key,
    },
  ];

  const handleCopySnippet = (snippet: typeof sampleSnippets[0], index: number) => {
    navigator.clipboard.writeText(snippet.text);
    onAddItem(snippet.text, snippet.type, snippet.app);
    onCopySuccess(snippet.text);
    setCopiedSnippetIndex(index);
    setTimeout(() => setCopiedSnippetIndex(null), 1500);
  };

  const handleManualAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customText.trim()) return;

    let type: ClipboardItem['type'] = 'text';
    if (customText.startsWith('http://') || customText.startsWith('https://')) {
      type = 'url';
    } else if (
      customText.startsWith('sudo ') ||
      customText.startsWith('git ') ||
      customText.startsWith('docker ')
    ) {
      type = 'command';
    } else if (
      customText.includes('function') ||
      customText.includes('const ') ||
      customText.includes('def ')
    ) {
      type = 'code';
    }

    onAddItem(customText, type, 'Simulador de Cópia');
    onCopySuccess(customText);
    setCustomText('');
  };

  return (
    <div className="space-y-6">
      {/* Hero Banner with Shortcut Banner */}
      <div className="bg-gradient-to-r from-[#1E1E28] via-[#282130] to-[#1E1E28] border border-[#3A3A4C] rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-60 h-60 bg-[#E95420]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#E95420]/15 text-[#E95420] text-xs font-semibold border border-[#E95420]/30">
              <Zap className="w-3.5 h-3.5" />
              <span>Simulador de Histórico de Cópia para Ubuntu</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Histórico de Copias estilo Windows no Linux Ubuntu
            </h1>
            <p className="text-sm text-gray-300 leading-relaxed">
              Experimente a janela pop-up inteligente que armazena seu histórico de
              <code className="bg-[#14141A] text-[#E95420] px-1.5 py-0.5 rounded mx-1 font-mono">
                Ctrl + C
              </code>
              e permite colar rapidamente com o atalho
              <code className="bg-[#14141A] text-amber-400 px-1.5 py-0.5 rounded mx-1 font-mono">
                {settings.shortcut}
              </code>
              .
            </p>
          </div>

          <div className="flex flex-col items-center justify-center p-5 bg-[#14141D] rounded-2xl border border-[#3A3A4A] shadow-inner text-center shrink-0 w-full md:w-auto">
            <span className="text-xs text-gray-400 font-medium mb-1">
              Atalho Ativo no Simulador
            </span>
            <div className="flex items-center space-x-1.5 my-1">
              <kbd className="px-3 py-1.5 bg-[#E95420] text-white font-mono text-sm font-bold rounded-lg shadow-md border border-[#f0612d]">
                Super
              </kbd>
              <span className="text-gray-400 font-bold text-lg">+</span>
              <kbd className="px-3 py-1.5 bg-[#E95420] text-white font-mono text-sm font-bold rounded-lg shadow-md border border-[#f0612d]">
                {settings.shortcut.includes('C') ? 'C' : settings.shortcut.split('+')[1]?.trim() || 'C'}
              </kbd>
            </div>
            <button
              onClick={onOpenOverlay}
              className="mt-3 flex items-center space-x-2 text-xs text-[#E95420] hover:text-[#f06835] font-semibold underline underline-offset-4"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Abrir Histórico Agora</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Copy Generator + Target Paste Box */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Card: Quick Copy Snippets & Custom Text Input */}
        <div className="bg-[#1E1E26] border border-[#2D2D3A] rounded-2xl p-5 space-y-5 shadow-lg">
          <div className="flex items-center justify-between border-b border-[#2D2D3A] pb-3">
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-lg bg-[#E95420]/15 text-[#E95420]">
                <Copy className="w-4 h-4" />
              </div>
              <h2 className="font-semibold text-sm text-white">
                1. Testar Copiar Conteúdos
              </h2>
            </div>
            <span className="text-xs text-gray-400">Clique para copiar</span>
          </div>

          {/* Sample Snippets */}
          <div className="space-y-2.5">
            {sampleSnippets.map((snippet, idx) => {
              const Icon = snippet.icon;
              const isCopied = copiedSnippetIndex === idx;

              return (
                <div
                  key={idx}
                  onClick={() => handleCopySnippet(snippet, idx)}
                  className="group p-3 rounded-xl bg-[#14141C] border border-[#2B2B38] hover:border-[#E95420] transition-all cursor-pointer flex items-center justify-between"
                >
                  <div className="space-y-1 pr-3 overflow-hidden">
                    <div className="flex items-center space-x-2 text-xs">
                      <Icon className="w-3.5 h-3.5 text-[#E95420]" />
                      <span className="font-medium text-gray-200">{snippet.label}</span>
                      <span className="text-[10px] text-gray-500">• {snippet.app}</span>
                    </div>
                    <p className="text-xs text-gray-400 font-mono truncate">{snippet.text}</p>
                  </div>

                  <button
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-1 shrink-0 transition-all ${
                      isCopied
                        ? 'bg-emerald-600 text-white'
                        : 'bg-[#252532] text-gray-300 group-hover:bg-[#E95420] group-hover:text-white'
                    }`}
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Manual Input Form */}
          <form onSubmit={handleManualAdd} className="space-y-2 pt-2 border-t border-[#2D2D3A]">
            <label className="text-xs font-medium text-gray-300 block">
              Ou digite um texto personalizado para simular cópia:
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder="Ex: Minha nota do Ubuntu..."
                className="flex-1 bg-[#14141C] border border-[#3A3A4A] rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#E95420]"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-[#E95420] hover:bg-[#d44819] text-white text-xs font-medium flex items-center space-x-1 shadow transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Adicionar</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right Card: Paste Test Box & Floating Window Trigger */}
        <div className="bg-[#1E1E26] border border-[#2D2D3A] rounded-2xl p-5 space-y-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-[#2D2D3A] pb-3 mb-4">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-lg bg-amber-500/15 text-amber-400">
                  <Terminal className="w-4 h-4" />
                </div>
                <h2 className="font-semibold text-sm text-white">
                  2. Áreas de Colagem (Pressione {settings.shortcut})
                </h2>
              </div>
              <span className="text-xs text-gray-400">Campo de teste</span>
            </div>

            <p className="text-xs text-gray-300 mb-3">
              Abra a janela pop-up de histórico (<code className="text-[#E95420] font-mono">{settings.shortcut}</code>) e selecione qualquer item para colar automaticamente neste campo:
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-medium text-gray-400 mb-1 block">
                  Caixa de Colagem Interativa:
                </label>
                <textarea
                  value={targetPasteValue}
                  onChange={(e) => setTargetPasteValue(e.target.value)}
                  placeholder={`Selecione um item no pop-up do ${settings.shortcut} para colar aqui...`}
                  rows={5}
                  className="w-full bg-[#14141C] border border-[#3A3A4A] rounded-xl p-3 text-xs text-emerald-400 font-mono placeholder-gray-600 focus:outline-none focus:border-[#E95420] transition-all"
                />
              </div>

              {targetPasteValue && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-emerald-400 flex items-center space-x-1">
                    <Check className="w-3.5 h-3.5" />
                    <span>Texto colado com sucesso!</span>
                  </span>
                  <button
                    onClick={() => setTargetPasteValue('')}
                    className="text-gray-400 hover:text-white underline text-[11px]"
                  >
                    Limpar campo
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Shortcut Banner Trigger */}
          <div className="bg-[#14141C] border border-[#2B2B38] p-4 rounded-xl flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-xs font-semibold text-white block">
                Janela do Histórico em Segundo Plano
              </span>
              <span className="text-[11px] text-gray-400 block">
                {items.length} itens gravados na memória local
              </span>
            </div>

            <button
              onClick={onOpenOverlay}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#E95420] to-[#77216F] hover:opacity-90 text-white text-xs font-bold shadow flex items-center space-x-2 transition-all transform active:scale-95"
            >
              <Sparkles className="w-4 h-4" />
              <span>Abrir Pop-up</span>
            </button>
          </div>
        </div>
      </div>

      {/* Feature Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-[#1E1E26] border border-[#2D2D3A] space-y-2">
          <div className="flex items-center space-x-2 text-[#E95420]">
            <Cpu className="w-4 h-4" />
            <span className="font-semibold text-xs text-white">Baixo Consumo</span>
          </div>
          <p className="text-xs text-gray-400">
            Daemon em Python/GTK3 que consome apenas ~12MB de memória RAM no seu Ubuntu.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-[#1E1E26] border border-[#2D2D3A] space-y-2">
          <div className="flex items-center space-x-2 text-emerald-400">
            <Layers className="w-4 h-4" />
            <span className="font-semibold text-xs text-white">X11 & Wayland</span>
          </div>
          <p className="text-xs text-gray-400">
            Suporte integrado para Ubuntu 20.04, 22.04 LTS e 24.04 LTS com GNOME Shell.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-[#1E1E26] border border-[#2D2D3A] space-y-2">
          <div className="flex items-center space-x-2 text-amber-400">
            <Info className="w-4 h-4" />
            <span className="font-semibold text-xs text-white">Segurança & Privacidade</span>
          </div>
          <p className="text-xs text-gray-400">
            Armazenamento 100% offline no seu computador, sem nenhum envio para a nuvem.
          </p>
        </div>
      </div>
    </div>
  );
};
