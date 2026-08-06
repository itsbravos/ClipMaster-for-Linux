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
      <div className="bg-brand-blue dark:bg-brand-blue-night border-[3px] border-ink dark:border-paper/80 rounded-2xl p-6 shadow-[5px_5px_0_0_rgba(27,26,23,1)] dark:shadow-[5px_5px_0_0_rgba(0,0,0,0.5)] relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-60 h-60 bg-brand-yellow/25 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-2xl">
            <div className="badge-neo inline-flex items-center space-x-2 px-3 py-1 bg-brand-yellow text-ink text-xs">
              <Zap className="w-3.5 h-3.5" />
              <span>Simulador de Histórico de Cópia para Ubuntu</span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-ink tracking-tight">
              Histórico de Cópias estilo Windows no Linux Ubuntu
            </h1>
            <p className="text-sm text-ink/80 leading-relaxed">
              Experimente a janela pop-up inteligente que armazena seu histórico de
              <code className="bg-cream-card text-ink px-1.5 py-0.5 rounded mx-1 font-mono border-2 border-ink/70">
                Ctrl + C
              </code>
              e permite colar rapidamente com o atalho
              <code className="bg-cream-card text-ink px-1.5 py-0.5 rounded mx-1 font-mono border-2 border-ink/70">
                {settings.shortcut}
              </code>
              .
            </p>
          </div>

          <div className="flex flex-col items-center justify-center p-5 bg-cream-card border-[3px] border-ink rounded-2xl shadow-[3px_3px_0_0_rgba(27,26,23,1)] text-center shrink-0 w-full md:w-auto">
            <span className="text-xs text-ink/60 font-bold mb-1">
              Atalho Ativo no Simulador
            </span>
            <div className="flex items-center space-x-1.5 my-1">
              <kbd className="px-3 py-1.5 bg-ink text-cream font-mono text-sm font-bold rounded-lg border-2 border-ink">
                Super
              </kbd>
              <span className="text-ink/50 font-bold text-lg">+</span>
              <kbd className="px-3 py-1.5 bg-ink text-cream font-mono text-sm font-bold rounded-lg border-2 border-ink">
                {settings.shortcut.includes('C') ? 'C' : settings.shortcut.split('+')[1]?.trim() || 'C'}
              </kbd>
            </div>
            <button
              onClick={onOpenOverlay}
              className="mt-3 flex items-center space-x-2 text-xs text-brand-blue-dark hover:text-ink font-bold underline underline-offset-4"
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
        <div className="card-neo p-5 space-y-5">
          <div className="flex items-center justify-between border-b-2 border-ink/15 dark:border-paper/15 pb-3">
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-lg bg-brand-blue/25 dark:bg-brand-blue-night/20 text-brand-blue-dark dark:text-brand-blue-night">
                <Copy className="w-4 h-4" />
              </div>
              <h2 className="font-display font-bold text-sm text-ink dark:text-paper">
                1. Testar Copiar Conteúdos
              </h2>
            </div>
            <span className="text-xs text-ink/50 dark:text-paper/50">Clique para copiar</span>
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
                  className="group p-3 rounded-xl bg-cream dark:bg-night-soft border-2 border-ink/25 dark:border-paper/25 hover:border-ink dark:hover:border-paper/80 transition-all cursor-pointer flex items-center justify-between"
                >
                  <div className="space-y-1 pr-3 overflow-hidden">
                    <div className="flex items-center space-x-2 text-xs">
                      <Icon className="w-3.5 h-3.5 text-brand-blue-dark dark:text-brand-blue-night" />
                      <span className="font-bold text-ink dark:text-paper">{snippet.label}</span>
                      <span className="text-[10px] text-ink/50 dark:text-paper/50">• {snippet.app}</span>
                    </div>
                    <p className="text-xs text-ink/60 dark:text-paper/60 font-mono truncate">{snippet.text}</p>
                  </div>

                  <button
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1 shrink-0 transition-all border-2 ${
                      isCopied
                        ? 'bg-brand-green dark:bg-brand-green-night text-ink border-ink'
                        : 'bg-cream-card dark:bg-night-card text-ink/70 dark:text-paper/70 border-ink/25 dark:border-paper/25 group-hover:bg-brand-blue dark:group-hover:bg-brand-blue-night group-hover:text-ink group-hover:border-ink'
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
          <form onSubmit={handleManualAdd} className="space-y-2 pt-2 border-t-2 border-ink/15 dark:border-paper/15">
            <label className="text-xs font-bold text-ink/80 dark:text-paper/80 block">
              Ou digite um texto personalizado para simular cópia:
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder="Ex: Minha nota do Ubuntu..."
                className="input-neo flex-1 px-3 py-2 text-xs"
              />
              <button
                type="submit"
                className="btn-neo px-4 py-2 bg-brand-yellow text-ink text-xs flex items-center space-x-1"
              >
                <Plus className="w-4 h-4" />
                <span>Adicionar</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right Card: Paste Test Box & Floating Window Trigger */}
        <div className="card-neo p-5 space-y-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b-2 border-ink/15 dark:border-paper/15 pb-3 mb-4">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-lg bg-brand-yellow/40 text-ink dark:text-paper">
                  <Terminal className="w-4 h-4" />
                </div>
                <h2 className="font-display font-bold text-sm text-ink dark:text-paper">
                  2. Áreas de Colagem (Pressione {settings.shortcut})
                </h2>
              </div>
              <span className="text-xs text-ink/50 dark:text-paper/50">Campo de teste</span>
            </div>

            <p className="text-xs text-ink/70 dark:text-paper/70 mb-3">
              Abra a janela pop-up de histórico (<code className="text-brand-blue-dark dark:text-brand-blue-night font-mono font-bold">{settings.shortcut}</code>) e selecione qualquer item para colar automaticamente neste campo:
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-ink/60 dark:text-paper/60 mb-1 block">
                  Caixa de Colagem Interativa:
                </label>
                <textarea
                  value={targetPasteValue}
                  onChange={(e) => setTargetPasteValue(e.target.value)}
                  placeholder={`Selecione um item no pop-up do ${settings.shortcut} para colar aqui...`}
                  rows={5}
                  className="input-neo w-full p-3 text-xs text-brand-blue-dark dark:text-brand-green-night font-mono"
                />
              </div>

              {targetPasteValue && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-brand-green-night dark:text-brand-green-night flex items-center space-x-1 font-bold">
                    <Check className="w-3.5 h-3.5" />
                    <span>Texto colado com sucesso!</span>
                  </span>
                  <button
                    onClick={() => setTargetPasteValue('')}
                    className="text-ink/60 dark:text-paper/60 hover:text-ink dark:hover:text-paper underline text-[11px]"
                  >
                    Limpar campo
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Shortcut Banner Trigger */}
          <div className="bg-cream dark:bg-night-soft border-2 border-ink/25 dark:border-paper/25 p-4 rounded-xl flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-ink dark:text-paper block">
                Janela do Histórico em Segundo Plano
              </span>
              <span className="text-[11px] text-ink/60 dark:text-paper/60 block">
                {items.length} itens gravados na memória local
              </span>
            </div>

            <button
              onClick={onOpenOverlay}
              className="btn-neo px-4 py-2 bg-brand-blue dark:bg-brand-blue-night text-ink text-xs flex items-center space-x-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>Abrir Pop-up</span>
            </button>
          </div>
        </div>
      </div>

      {/* Feature Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card-neo p-4 space-y-2">
          <div className="flex items-center space-x-2 text-brand-blue-dark dark:text-brand-blue-night">
            <Cpu className="w-4 h-4" />
            <span className="font-display font-bold text-xs text-ink dark:text-paper">Baixo Consumo</span>
          </div>
          <p className="text-xs text-ink/60 dark:text-paper/60">
            Daemon em Python/GTK3 que consome apenas ~12MB de memória RAM no seu Ubuntu.
          </p>
        </div>

        <div className="card-neo p-4 space-y-2">
          <div className="flex items-center space-x-2 text-brand-green-night">
            <Layers className="w-4 h-4" />
            <span className="font-display font-bold text-xs text-ink dark:text-paper">X11 & Wayland</span>
          </div>
          <p className="text-xs text-ink/60 dark:text-paper/60">
            Suporte integrado para Ubuntu 20.04, 22.04 LTS e 24.04 LTS com GNOME Shell.
          </p>
        </div>

        <div className="card-neo p-4 space-y-2">
          <div className="flex items-center space-x-2 text-brand-yellow-dark dark:text-brand-yellow-night">
            <Info className="w-4 h-4" />
            <span className="font-display font-bold text-xs text-ink dark:text-paper">Segurança & Privacidade</span>
          </div>
          <p className="text-xs text-ink/60 dark:text-paper/60">
            Armazenamento 100% offline no seu computador, sem nenhum envio para a nuvem.
          </p>
        </div>
      </div>
    </div>
  );
};
