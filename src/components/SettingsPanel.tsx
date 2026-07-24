import React, { useState } from 'react';
import {
  Settings,
  Keyboard,
  Sliders,
  Shield,
  Volume2,
  Bell,
  Palette,
  Download,
  Upload,
  RotateCcw,
  Check,
  Zap,
} from 'lucide-react';
import { AppSettings, ThemeMode } from '../types';

interface SettingsPanelProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  onResetSettings: () => void;
  onExportData: () => void;
  onImportData: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  settings,
  onUpdateSettings,
  onResetSettings,
  onExportData,
  onImportData,
}) => {
  const [savedMessage, setSavedMessage] = useState(false);

  const handleSave = () => {
    setSavedMessage(true);
    setTimeout(() => setSavedMessage(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Title */}
      <div className="bg-[#1E1E28] border border-[#2D2D3A] rounded-2xl p-6 shadow-xl flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-[#E95420]/20 text-[#E95420]">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Configurações do ClipMaster</h1>
            <p className="text-xs text-gray-400">
              Ajuste limites de memória, atalhos do teclado e regras de privacidade.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {savedMessage && (
            <span className="text-xs text-emerald-400 font-medium flex items-center space-x-1 animate-in fade-in">
              <Check className="w-3.5 h-3.5" />
              <span>Salvo!</span>
            </span>
          )}
          <button
            onClick={onResetSettings}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-[#2B2B38] hover:bg-[#383848] text-xs text-gray-300 transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restaurar Padrões</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Shortcut & Limits Card */}
        <div className="bg-[#1E1E26] border border-[#2D2D3A] rounded-2xl p-5 space-y-5 shadow-lg">
          <div className="flex items-center space-x-2 border-b border-[#2D2D3A] pb-3">
            <Keyboard className="w-4 h-4 text-[#E95420]" />
            <h2 className="font-semibold text-sm text-white">Atalhos & Limites</h2>
          </div>

          <div className="space-y-4 text-xs">
            {/* Shortcut Combo */}
            <div>
              <label className="font-medium text-gray-300 block mb-1">
                Atalho de Teclado Principal (Pop-up):
              </label>
              <select
                value={settings.shortcut}
                onChange={(e) => {
                  onUpdateSettings({ shortcut: e.target.value });
                  handleSave();
                }}
                className="w-full bg-[#14141C] border border-[#3A3A4A] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#E95420]"
              >
                <option value="Super + C">Super + C (Recomendado no Linux - Sem Conflitos)</option>
                <option value="Super + V">Super + V (Estilo Windows)</option>
                <option value="Ctrl + Shift + V">Ctrl + Shift + V</option>
                <option value="Alt + C">Alt + C</option>
                <option value="Alt + V">Alt + V</option>
                <option value="Ctrl + Alt + V">Ctrl + Alt + V</option>
              </select>
            </div>

            {/* Max Items */}
            <div>
              <div className="flex justify-between mb-1">
                <label className="font-medium text-gray-300">
                  Limite Máximo de Itens no Histórico:
                </label>
                <span className="text-[#E95420] font-bold">{settings.maxItems} itens</span>
              </div>
              <input
                type="range"
                min="10"
                max="200"
                step="10"
                value={settings.maxItems}
                onChange={(e) => {
                  onUpdateSettings({ maxItems: Number(e.target.value) });
                  handleSave();
                }}
                className="w-full accent-[#E95420] bg-[#14141C] h-2 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-gray-500 mt-1">
                <span>10 (Ultra leve ~5MB)</span>
                <span>100 (Recomendado ~12MB)</span>
                <span>200 (Máximo)</span>
              </div>
            </div>

            {/* Position */}
            <div>
              <label className="font-medium text-gray-300 block mb-1">
                Posição da Janela Pop-up na Tela:
              </label>
              <select
                value={settings.position}
                onChange={(e) => {
                  onUpdateSettings({ position: e.target.value as AppSettings['position'] });
                  handleSave();
                }}
                className="w-full bg-[#14141C] border border-[#3A3A4A] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#E95420]"
              >
                <option value="center">Centro da Tela (Padrão)</option>
                <option value="bottom-right">Canto Inferior Direito (Estilo Windows)</option>
                <option value="mouse">Posição Atual do Cursor do Mouse</option>
              </select>
            </div>
          </div>
        </div>

        {/* Security & Privacy Card */}
        <div className="bg-[#1E1E26] border border-[#2D2D3A] rounded-2xl p-5 space-y-5 shadow-lg">
          <div className="flex items-center space-x-2 border-b border-[#2D2D3A] pb-3">
            <Shield className="w-4 h-4 text-amber-400" />
            <h2 className="font-semibold text-sm text-white">Segurança & Máscaras</h2>
          </div>

          <div className="space-y-4 text-xs">
            {/* Mask Sensitive Toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#14141C] border border-[#2B2B38]">
              <div className="space-y-0.5 pr-2">
                <span className="font-medium text-white block">
                  Ocultar Senhas e Chaves Secretas
                </span>
                <span className="text-gray-400 text-[11px] block">
                  Aplica máscara automática (<code className="text-amber-400">•••••</code>) em tokens e chaves identificadas.
                </span>
              </div>
              <input
                type="checkbox"
                checked={settings.maskSensitive}
                onChange={(e) => {
                  onUpdateSettings({ maskSensitive: e.target.checked });
                  handleSave();
                }}
                className="w-4 h-4 accent-[#E95420] rounded cursor-pointer"
              />
            </div>

            {/* Auto Paste Toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#14141C] border border-[#2B2B38]">
              <div className="space-y-0.5 pr-2">
                <span className="font-medium text-white block">
                  Colar Automaticamente ao Selecionar
                </span>
                <span className="text-gray-400 text-[11px] block">
                  Envia evento de colagem imediatamente após pressionar Enter no pop-up.
                </span>
              </div>
              <input
                type="checkbox"
                checked={settings.autoPasteOnSelect}
                onChange={(e) => {
                  onUpdateSettings({ autoPasteOnSelect: e.target.checked });
                  handleSave();
                }}
                className="w-4 h-4 accent-[#E95420] rounded cursor-pointer"
              />
            </div>

            {/* Sound Toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#14141C] border border-[#2B2B38]">
              <div className="space-y-0.5 pr-2">
                <span className="font-medium text-white block">
                  Som de Confirmação de Cópia
                </span>
                <span className="text-gray-400 text-[11px] block">
                  Reproduz um bipe suave de notificação do Ubuntu ao capturar novas cópias.
                </span>
              </div>
              <input
                type="checkbox"
                checked={settings.soundEnabled}
                onChange={(e) => {
                  onUpdateSettings({ soundEnabled: e.target.checked });
                  handleSave();
                }}
                className="w-4 h-4 accent-[#E95420] rounded cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Backup & Data Card */}
      <div className="bg-[#1E1E26] border border-[#2D2D3A] rounded-2xl p-5 space-y-4 shadow-lg">
        <div className="flex items-center space-x-2 border-b border-[#2D2D3A] pb-3">
          <Download className="w-4 h-4 text-emerald-400" />
          <h2 className="font-semibold text-sm text-white">Backup & Exportação de Histórico</h2>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-gray-300">
            Exporte todo o seu histórico gravado em formato JSON para restaurar depois ou migrar entre computadores.
          </p>

          <div className="flex items-center space-x-3 shrink-0">
            <button
              onClick={onExportData}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow transition-all"
            >
              <Download className="w-4 h-4" />
              <span>Exportar JSON</span>
            </button>

            <label className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-[#2B2B38] hover:bg-[#383848] text-white text-xs font-semibold cursor-pointer shadow transition-all">
              <Upload className="w-4 h-4" />
              <span>Importar JSON</span>
              <input type="file" accept=".json" onChange={onImportData} className="hidden" />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
