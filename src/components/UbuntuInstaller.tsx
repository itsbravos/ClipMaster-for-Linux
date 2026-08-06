import React, { useState } from 'react';
import {
  Terminal,
  Copy,
  Check,
  ShieldCheck,
  Cpu,
  ChevronRight,
  Code,
  FileCode,
  Sparkles,
} from 'lucide-react';
import { pythonGtkDaemonCode, ubuntuInstallShellScript, copyqAlternativeScript, quickCurlInstallCommand } from '../data/ubuntuInstallerScripts';

export const UbuntuInstaller: React.FC = () => {
  const [selectedMethod, setSelectedMethod] = useState<'auto' | 'python' | 'copyq'>('auto');
  const [copiedState, setCopiedState] = useState<string | null>(null);

  const handleCopy = (code: string, label: string) => {
    navigator.clipboard.writeText(code);
    setCopiedState(label);
    setTimeout(() => setCopiedState(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="card-neo p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="badge-neo inline-flex items-center space-x-2 px-3 py-1 bg-brand-green dark:bg-brand-green-night text-ink text-xs">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Instalador Nativo para Ubuntu Linux (X11 & Wayland)</span>
            </div>
            <h1 className="font-display text-2xl font-bold text-ink dark:text-paper">
              Como Instalar no seu Ubuntu Nativamente
            </h1>
            <p className="text-xs text-ink/70 dark:text-paper/70">
              Roda em segundo plano consumindo apenas ~12MB de RAM e vincula o atalho <code className="text-brand-blue-dark dark:text-brand-blue-night font-mono font-bold">Super + C</code> no GNOME.
            </p>
          </div>

          <div className="flex items-center space-x-2 bg-cream dark:bg-night-soft p-2 rounded-xl border-2 border-ink/25 dark:border-paper/25 shrink-0">
            <Cpu className="w-4 h-4 text-brand-blue-dark dark:text-brand-blue-night" />
            <span className="text-xs text-ink/70 dark:text-paper/70 font-mono">RAM: ~12 MB | CPU: 0% Idle</span>
          </div>
        </div>
      </div>

      {/* Tab Selectors */}
      <div className="flex items-center flex-wrap gap-2 border-b-2 border-ink/15 dark:border-paper/15 pb-3">
        <button
          onClick={() => setSelectedMethod('auto')}
          className={`btn-neo flex items-center space-x-2 px-4 py-2 text-xs ${
            selectedMethod === 'auto'
              ? 'bg-brand-blue dark:bg-brand-blue-night text-ink'
              : 'bg-cream-card dark:bg-night-card text-ink/60 dark:text-paper/60'
          }`}
        >
          <Terminal className="w-4 h-4" />
          <span>1. Script Automático (Recomendado)</span>
        </button>

        <button
          onClick={() => setSelectedMethod('python')}
          className={`btn-neo flex items-center space-x-2 px-4 py-2 text-xs ${
            selectedMethod === 'python'
              ? 'bg-brand-blue dark:bg-brand-blue-night text-ink'
              : 'bg-cream-card dark:bg-night-card text-ink/60 dark:text-paper/60'
          }`}
        >
          <FileCode className="w-4 h-4" />
          <span>2. Código Python GTK3 (Manual)</span>
        </button>

        <button
          onClick={() => setSelectedMethod('copyq')}
          className={`btn-neo flex items-center space-x-2 px-4 py-2 text-xs ${
            selectedMethod === 'copyq'
              ? 'bg-brand-blue dark:bg-brand-blue-night text-ink'
              : 'bg-cream-card dark:bg-night-card text-ink/60 dark:text-paper/60'
          }`}
        >
          <Code className="w-4 h-4" />
          <span>3. Alternativa via CopyQ</span>
        </button>
      </div>

      {/* Method 1: Auto Script */}
      {selectedMethod === 'auto' && (
        <div className="space-y-5">
          <div className="card-neo p-5 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="font-display font-bold text-sm text-ink dark:text-paper flex items-center space-x-2">
                <Terminal className="w-4 h-4 text-brand-blue-dark dark:text-brand-blue-night" />
                <span>Instalação Automática via Terminal Ubuntu</span>
              </h2>
              <span className="text-xs text-brand-green-night font-bold">Auto-configura Super+C</span>
            </div>

            <p className="text-xs text-ink/70 dark:text-paper/70 leading-relaxed">
              Execute o comando abaixo no terminal do seu Ubuntu (
              <kbd className="px-1.5 py-0.5 bg-ink/10 dark:bg-paper/10 rounded border border-ink/30 dark:border-paper/30 font-mono text-[10px]">
                Ctrl + Alt + T
              </kbd>
              ) para baixar e instalar automaticamente:
            </p>

            <div className="relative bg-night border-[3px] border-ink dark:border-paper/80 rounded-xl p-3.5 font-mono text-xs text-brand-green-night flex items-center justify-between gap-2 overflow-x-auto">
              <code className="text-xs select-all text-brand-green-night font-bold whitespace-nowrap">
                {quickCurlInstallCommand}
              </code>
              <button
                onClick={() => handleCopy(quickCurlInstallCommand, 'quickCurl')}
                className="shrink-0 px-3 py-1.5 rounded-lg bg-night-soft hover:bg-brand-blue-night border-2 border-paper/30 hover:border-ink text-paper hover:text-ink text-xs font-bold flex items-center space-x-1.5 transition-all"
              >
                {copiedState === 'quickCurl' ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar Comando</span>
                  </>
                )}
              </button>
            </div>

            <p className="text-xs text-ink/60 dark:text-paper/60 pt-2">
              Ou se preferir inspecionar/executar o script de instalação completo:
            </p>

            <div className="relative bg-night border-[3px] border-ink dark:border-paper/80 rounded-xl p-4 font-mono text-xs text-paper overflow-x-auto">
              <button
                onClick={() => handleCopy(ubuntuInstallShellScript, 'autoScript')}
                className="absolute top-3 right-3 px-3 py-1.5 rounded-lg bg-night-soft hover:bg-brand-blue-night border-2 border-paper/30 hover:border-ink text-paper hover:text-ink text-xs font-bold flex items-center space-x-1.5 transition-all"
              >
                {copiedState === 'autoScript' ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar Script Bash</span>
                  </>
                )}
              </button>

              <pre className="text-brand-green-night max-h-80 overflow-y-auto pt-6 text-[11px] leading-relaxed">
                {ubuntuInstallShellScript}
              </pre>
            </div>

            <div className="bg-cream dark:bg-night-soft p-4 rounded-xl border-2 border-ink/25 dark:border-paper/25 space-y-2">
              <h3 className="text-xs font-bold text-ink dark:text-paper flex items-center space-x-1.5">
                <ChevronRight className="w-4 h-4 text-brand-blue-dark dark:text-brand-blue-night" />
                <span>O que este script faz no seu computador?</span>
              </h3>
              <ul className="text-xs text-ink/70 dark:text-paper/70 space-y-1 list-disc list-inside pl-2">
                <li>Instala <code className="text-brand-yellow-dark dark:text-brand-yellow-night font-mono">python3-gi</code> e utilitários leves de clipboard (<code className="text-brand-yellow-dark dark:text-brand-yellow-night font-mono">wl-clipboard</code> / <code className="text-brand-yellow-dark dark:text-brand-yellow-night font-mono">xclip</code>).</li>
                <li>Salva o executável leve em <code className="text-brand-yellow-dark dark:text-brand-yellow-night font-mono">~/.local/bin/clipmaster</code>.</li>
                <li>Cria um serviço de usuário do systemd (<code className="text-brand-yellow-dark dark:text-brand-yellow-night font-mono">clipmaster.service</code>) para iniciar silenciosamente em segundo plano no boot.</li>
                <li>Registra automaticamente o atalho <code className="text-brand-blue-dark dark:text-brand-blue-night font-mono">Super + C</code> no painel de Atalhos do Ubuntu GNOME.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Method 2: Python Code Manual */}
      {selectedMethod === 'python' && (
        <div className="card-neo p-5 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="font-display font-bold text-sm text-ink dark:text-paper flex items-center space-x-2">
              <FileCode className="w-4 h-4 text-brand-blue-dark dark:text-brand-blue-night" />
              <span>Código Fonte Python GTK3 (clipmaster.py)</span>
            </h2>
            <button
              onClick={() => handleCopy(pythonGtkDaemonCode, 'pythonCode')}
              className="btn-neo px-3 py-1.5 bg-brand-blue dark:bg-brand-blue-night text-ink text-xs flex items-center space-x-1.5"
            >
              {copiedState === 'pythonCode' ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Código Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar clipmaster.py</span>
                </>
              )}
            </button>
          </div>

          <p className="text-xs text-ink/70 dark:text-paper/70">
            Você pode criar o arquivo <code className="text-brand-yellow-dark dark:text-brand-yellow-night font-mono">clipmaster.py</code> manualmente no seu Ubuntu. Ele usa a biblioteca oficial do GNOME (PyGObject / GTK3) para criar uma janela sobreposta ultra-rápida.
          </p>

          <div className="bg-night border-[3px] border-ink dark:border-paper/80 rounded-xl p-4 font-mono text-xs text-paper max-h-96 overflow-y-auto">
            <pre className="text-brand-blue-night text-[11px] leading-relaxed">{pythonGtkDaemonCode}</pre>
          </div>
        </div>
      )}

      {/* Method 3: CopyQ */}
      {selectedMethod === 'copyq' && (
        <div className="card-neo p-5 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="font-display font-bold text-sm text-ink dark:text-paper flex items-center space-x-2">
              <Code className="w-4 h-4 text-brand-blue-dark dark:text-brand-blue-night" />
              <span>Alternativa usando CopyQ (Pacote Oficial Ubuntu)</span>
            </h2>
            <button
              onClick={() => handleCopy(copyqAlternativeScript, 'copyq')}
              className="btn-neo px-3 py-1.5 bg-cream-card dark:bg-night-card text-ink dark:text-paper text-xs flex items-center space-x-1.5"
            >
              {copiedState === 'copyq' ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar Comandos</span>
                </>
              )}
            </button>
          </div>

          <p className="text-xs text-ink/70 dark:text-paper/70">
            O <code className="text-brand-yellow-dark dark:text-brand-yellow-night font-mono">CopyQ</code> é uma ferramenta bem conhecida no ecossistema Linux. Execute os comandos abaixo para instalá-lo e associá-lo ao atalho <code className="text-brand-blue-dark dark:text-brand-blue-night font-mono">Super + C</code> no GNOME:
          </p>

          <div className="bg-night border-[3px] border-ink dark:border-paper/80 rounded-xl p-4 font-mono text-xs text-brand-green-night">
            <pre className="text-[11px] leading-relaxed">{copyqAlternativeScript}</pre>
          </div>
        </div>
      )}

      {/* Manual GNOME Shortcut Instructions Box */}
      <div className="card-neo p-5 space-y-3 bg-brand-yellow/20 dark:bg-night-card">
        <h3 className="font-display text-sm font-bold text-ink dark:text-paper flex items-center space-x-2">
          <Sparkles className="w-4 h-4 text-brand-yellow-dark dark:text-brand-yellow-night" />
          <span>Como associar o atalho Super + C manualmente pelas Configurações do Ubuntu</span>
        </h3>
        <ol className="text-xs text-ink/80 dark:text-paper/80 space-y-2 list-decimal list-inside pl-2 leading-relaxed">
          <li>Abra o menu do Ubuntu e clique em <strong>Configurações (Settings)</strong>.</li>
          <li>Navegue até a aba <strong>Teclado (Keyboard)</strong> → <strong>Atalhos de Teclado (Keyboard Shortcuts)</strong>.</li>
          <li>Role até o final e clique no botão <strong>Atalhos Personalizados (Custom Shortcuts)</strong>.</li>
          <li>Clique no botão de <strong>+</strong> para adicionar um novo atalho.</li>
          <li>
            Preencha os campos com:
            <ul className="list-disc list-inside pl-4 mt-1 space-y-1 font-mono text-[11px] text-brand-blue-dark dark:text-brand-blue-night">
              <li>Nome: ClipMaster Histórico</li>
              <li>Comando: /home/seu_usuario/.local/bin/clipmaster --toggle</li>
            </ul>
          </li>
          <li>Clique em <strong>Definir atalho...</strong> e pressione as teclas <kbd className="px-1.5 py-0.5 bg-ink text-cream rounded border border-ink">Super + C</kbd> (evita conflitos no Linux).</li>
        </ol>
      </div>
    </div>
  );
};
