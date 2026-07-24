import React, { useState } from 'react';
import {
  Terminal,
  Copy,
  Check,
  Download,
  ShieldCheck,
  Cpu,
  Layers,
  ChevronRight,
  ExternalLink,
  Code,
  FileCode,
  Sparkles,
} from 'lucide-react';
import { pythonGtkDaemonCode, ubuntuInstallShellScript, copyqAlternativeScript } from '../data/ubuntuInstallerScripts';

export const UbuntuInstaller: React.FC = () => {
  const [selectedMethod, setSelectedMethod] = useState<'auto' | 'python' | 'copyq'>('auto');
  const [copiedState, setCopiedState] = useState<string | null>(null);

  const handleCopy = (code: string, label: string) => {
    navigator.clipboard.writeText(code);
    setCopiedState(label);
    setTimeout(() => setCopiedState(null), 2000);
  };

  const oneLinerCommand = `bash -c "$(curl -fsSL https://raw.githubusercontent.com/ubuntu-clipmaster/install/main/install.sh 2>/dev/null || echo '${ubuntuInstallShellScript.replace(/'/g, "'\\''")}')"`;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-[#1E1E28] border border-[#2D2D3A] rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-400 text-xs font-semibold border border-emerald-500/30">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Instalador Nativo para Ubuntu Linux (X11 & Wayland)</span>
            </div>
            <h1 className="text-2xl font-bold text-white">
              Como Instalar no seu Ubuntu Nativamente
            </h1>
            <p className="text-xs text-gray-300">
              Roda em segundo plano consumindo apenas ~12MB de RAM e vincula o atalho <code className="text-[#E95420] font-mono font-bold">Super + C</code> no GNOME.
            </p>
          </div>

          <div className="flex items-center space-x-2 bg-[#14141A] p-2 rounded-xl border border-[#2D2D38]">
            <Cpu className="w-4 h-4 text-[#E95420]" />
            <span className="text-xs text-gray-300 font-mono">RAM: ~12 MB | CPU: 0% Idle</span>
          </div>
        </div>
      </div>

      {/* Tab Selectors */}
      <div className="flex items-center space-x-2 border-b border-[#2D2D38] pb-3">
        <button
          onClick={() => setSelectedMethod('auto')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            selectedMethod === 'auto'
              ? 'bg-[#E95420] text-white shadow-lg'
              : 'bg-[#1E1E26] text-gray-400 hover:text-white'
          }`}
        >
          <Terminal className="w-4 h-4" />
          <span>1. Script Automático (Recomendado)</span>
        </button>

        <button
          onClick={() => setSelectedMethod('python')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            selectedMethod === 'python'
              ? 'bg-[#E95420] text-white shadow-lg'
              : 'bg-[#1E1E26] text-gray-400 hover:text-white'
          }`}
        >
          <FileCode className="w-4 h-4" />
          <span>2. Código Python GTK3 (Manual)</span>
        </button>

        <button
          onClick={() => setSelectedMethod('copyq')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            selectedMethod === 'copyq'
              ? 'bg-[#E95420] text-white shadow-lg'
              : 'bg-[#1E1E26] text-gray-400 hover:text-white'
          }`}
        >
          <Code className="w-4 h-4" />
          <span>3. Alternativa via CopyQ</span>
        </button>
      </div>

      {/* Method 1: Auto Script */}
      {selectedMethod === 'auto' && (
        <div className="space-y-5">
          <div className="bg-[#1E1E26] border border-[#2D2D3A] rounded-2xl p-5 space-y-4 shadow-lg">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-sm text-white flex items-center space-x-2">
                <Terminal className="w-4 h-4 text-[#E95420]" />
                <span>Instalação Automática via Terminal Ubuntu</span>
              </h2>
              <span className="text-xs text-emerald-400 font-medium">Auto-configura Super+C</span>
            </div>

            <p className="text-xs text-gray-300 leading-relaxed">
              Copie o script bash abaixo e cole no terminal do seu Ubuntu (
              <kbd className="px-1.5 py-0.5 bg-black/40 rounded border border-gray-600 font-mono text-[10px]">
                Ctrl + Alt + T
              </kbd>
              ). Ele fará tudo sozinho: instalar pacotes leves, criar o serviço de segundo plano e configurar o atalho no GNOME.
            </p>

            <div className="relative bg-[#121218] border border-[#3A3A4A] rounded-xl p-4 font-mono text-xs text-gray-200 overflow-x-auto">
              <button
                onClick={() => handleCopy(ubuntuInstallShellScript, 'autoScript')}
                className="absolute top-3 right-3 px-3 py-1.5 rounded-lg bg-[#2B2B38] hover:bg-[#E95420] text-white text-xs font-medium flex items-center space-x-1.5 transition-all"
              >
                {copiedState === 'autoScript' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar Script Bash</span>
                  </>
                )}
              </button>

              <pre className="text-emerald-400 max-h-80 overflow-y-auto pt-6 text-[11px] leading-relaxed">
                {ubuntuInstallShellScript}
              </pre>
            </div>

            <div className="bg-[#14141C] p-4 rounded-xl border border-[#2B2B38] space-y-2">
              <h3 className="text-xs font-semibold text-white flex items-center space-x-1.5">
                <ChevronRight className="w-4 h-4 text-[#E95420]" />
                <span>O que este script faz no seu computador?</span>
              </h3>
              <ul className="text-xs text-gray-300 space-y-1 list-disc list-inside pl-2">
                <li>Instala <code className="text-amber-400 font-mono">python3-gi</code> e utilitários leves de clipboard (<code className="text-amber-400 font-mono">wl-clipboard</code> / <code className="text-amber-400 font-mono">xclip</code>).</li>
                <li>Salva o executável leve em <code className="text-amber-400 font-mono">~/.local/bin/clipmaster</code>.</li>
                <li>Cria um serviço de usuário do systemd (<code className="text-amber-400 font-mono">clipmaster.service</code>) para iniciar silenciosamente em segundo plano no boot.</li>
                <li>Registra automaticamente o atalho <code className="text-[#E95420] font-mono">Super + C</code> no painel de Atalhos do Ubuntu GNOME.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Method 2: Python Code Manual */}
      {selectedMethod === 'python' && (
        <div className="bg-[#1E1E26] border border-[#2D2D3A] rounded-2xl p-5 space-y-4 shadow-lg">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-sm text-white flex items-center space-x-2">
              <FileCode className="w-4 h-4 text-[#E95420]" />
              <span>Código Fonte Python GTK3 (clipmaster.py)</span>
            </h2>
            <button
              onClick={() => handleCopy(pythonGtkDaemonCode, 'pythonCode')}
              className="px-3 py-1.5 rounded-lg bg-[#E95420] hover:bg-[#d04618] text-white text-xs font-medium flex items-center space-x-1.5 transition-all shadow"
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

          <p className="text-xs text-gray-300">
            Você pode criar o arquivo <code className="text-amber-400 font-mono">clipmaster.py</code> manualmente no seu Ubuntu. Ele usa a biblioteca oficial do GNOME (PyGObject / GTK3) para criar uma janela sobreposta ultra-rápida.
          </p>

          <div className="bg-[#121218] border border-[#3A3A4A] rounded-xl p-4 font-mono text-xs text-gray-200 max-h-96 overflow-y-auto">
            <pre className="text-sky-300 text-[11px] leading-relaxed">{pythonGtkDaemonCode}</pre>
          </div>
        </div>
      )}

      {/* Method 3: CopyQ */}
      {selectedMethod === 'copyq' && (
        <div className="bg-[#1E1E26] border border-[#2D2D3A] rounded-2xl p-5 space-y-4 shadow-lg">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-sm text-white flex items-center space-x-2">
              <Code className="w-4 h-4 text-[#E95420]" />
              <span>Alternativa usando CopyQ (Pacote Oficial Ubuntu)</span>
            </h2>
            <button
              onClick={() => handleCopy(copyqAlternativeScript, 'copyq')}
              className="px-3 py-1.5 rounded-lg bg-[#2B2B38] hover:bg-[#E95420] text-white text-xs font-medium flex items-center space-x-1.5 transition-all"
            >
              {copiedState === 'copyq' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
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

          <p className="text-xs text-gray-300">
            O <code className="text-amber-400 font-mono">CopyQ</code> é uma ferramenta bem conhecida no ecossistema Linux. Execute os comandos abaixo para instalá-lo e associá-lo ao atalho <code className="text-[#E95420] font-mono">Super + C</code> no GNOME:
          </p>

          <div className="bg-[#121218] border border-[#3A3A4A] rounded-xl p-4 font-mono text-xs text-emerald-400">
            <pre className="text-[11px] leading-relaxed">{copyqAlternativeScript}</pre>
          </div>
        </div>
      )}

      {/* Manual GNOME Shortcut Instructions Box */}
      <div className="bg-[#191922] border border-[#3A3A4C] rounded-2xl p-5 space-y-3">
        <h3 className="text-sm font-semibold text-white flex items-center space-x-2">
          <Sparkles className="w-4 h-4 text-[#E95420]" />
          <span>Como associar o atalho Super + C manualmente pelas Configurações do Ubuntu</span>
        </h3>
        <ol className="text-xs text-gray-300 space-y-2 list-decimal list-inside pl-2 leading-relaxed">
          <li>Abra o menu do Ubuntu e clique em <strong>Configurações (Settings)</strong>.</li>
          <li>Navegue até a aba <strong>Teclado (Keyboard)</strong> → <strong>Atalhos de Teclado (Keyboard Shortcuts)</strong>.</li>
          <li>Role até o final e clique no botão <strong>Atalhos Personalizados (Custom Shortcuts)</strong>.</li>
          <li>Clique no botão de <strong>+</strong> para adicionar um novo atalho.</li>
          <li>
            Preencha os campos com:
            <ul className="list-disc list-inside pl-4 mt-1 space-y-1 font-mono text-[11px] text-amber-300">
              <li>Nome: ClipMaster Histórico</li>
              <li>Comando: /home/seu_usuario/.local/bin/clipmaster --toggle</li>
            </ul>
          </li>
          <li>Clique em <strong>Definir atalho...</strong> e pressione as teclas <kbd className="px-1.5 py-0.5 bg-black rounded text-white">Super + C</kbd> (evita conflitos no Linux).</li>
        </ol>
      </div>
    </div>
  );
};
