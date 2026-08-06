import React, { useState, useEffect, useCallback } from 'react';
import { ClipboardItem, AppSettings, ActiveTab } from './types';
import { initialHistory } from './data/initialHistory';
import { Navbar } from './components/Navbar';
import { ClipboardOverlay } from './components/ClipboardOverlay';
import { LiveSimulator } from './components/LiveSimulator';
import { UbuntuInstaller } from './components/UbuntuInstaller';
import { SettingsPanel } from './components/SettingsPanel';
import { StatsPanel } from './components/StatsPanel';
import { ToastNotification } from './components/ToastNotification';

const LOCAL_STORAGE_KEY_ITEMS = 'clipmaster_ubuntu_items';
const LOCAL_STORAGE_KEY_SETTINGS = 'clipmaster_ubuntu_settings';

const defaultSettings: AppSettings = {
  maxItems: 50,
  shortcut: 'Super + C',
  soundEnabled: fontSoundDefault(),
  maskSensitive: true,
  autoClearOnLogout: false,
  theme: 'light',
  position: 'center',
  enableNotification: true,
  autoPasteOnSelect: true,
};

function fontSoundDefault() {
  return true;
}

// Interpreta uma string de atalho no formato "Ctrl + Alt + V" e verifica se o
// KeyboardEvent recebido corresponde exatamente às teclas modificadoras e à tecla final.
function matchesShortcut(e: KeyboardEvent, shortcut: string): boolean {
  const parts = shortcut.split('+').map((p) => p.trim()).filter(Boolean);
  if (parts.length < 2) return false;

  const key = parts[parts.length - 1];
  const mods = parts.slice(0, -1);

  const wantSuper = mods.includes('Super');
  const wantCtrl = mods.includes('Ctrl');
  const wantAlt = mods.includes('Alt');
  const wantShift = mods.includes('Shift');

  if (wantSuper !== e.metaKey) return false;
  if (wantCtrl !== e.ctrlKey) return false;
  if (wantAlt !== e.altKey) return false;
  if (wantShift !== e.shiftKey) return false;

  return e.key.toLowerCase() === key.toLowerCase();
}

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('simulator');
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Load items from localStorage
  const [items, setItems] = useState<ClipboardItem[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY_ITEMS);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp),
        }));
      }
    } catch (e) {
      console.error('Failed to parse saved items:', e);
    }
    return initialHistory;
  });

  // Load settings from localStorage
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY_SETTINGS);
      if (saved) {
        return { ...defaultSettings, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.error('Failed to parse settings:', e);
    }
    return defaultSettings;
  });

  // Save items to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY_ITEMS, JSON.stringify(items));
    } catch (e) {
      console.error('Failed to save items:', e);
    }
  }, [items]);

  // Save settings to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY_SETTINGS, JSON.stringify(settings));
    } catch (e) {
      console.error('Failed to save settings:', e);
    }
  }, [settings]);

  // Aplica a classe .dark na raiz do documento conforme o tema escolhido
  useEffect(() => {
    document.documentElement.classList.toggle('dark', settings.theme === 'dark');
  }, [settings.theme]);

  // Play subtle audio tone on copy
  const playCopySound = useCallback(() => {
    if (!settings.soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.08); // A5

      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch (e) {
      // Audio context might be restricted before user gesture
    }
  }, [settings.soundEnabled]);

  // Add item to history
  const handleAddItem = useCallback(
    (content: string, type: ClipboardItem['type'] = 'text', sourceApp: string = 'Navegador') => {
      if (!content || !content.trim()) return;

      const trimmed = content.trim();

      setItems((prev) => {
        // Remove duplicate if exists
        const filtered = prev.filter((item) => item.content !== trimmed);

        const newItem: ClipboardItem = {
          id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          content: trimmed,
          type,
          timestamp: new Date(),
          isPinned: false,
          copyCount: 1,
          sourceApp,
          charCount: trimmed.length,
        };

        const updated = [newItem, ...filtered];
        return updated.slice(0, settings.maxItems);
      });

      playCopySound();
    },
    [settings.maxItems, playCopySound]
  );

  // Global keyboard listener — abre/fecha o pop-up com o atalho configurado em Configurações
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (matchesShortcut(e, settings.shortcut)) {
        e.preventDefault();
        setIsOverlayOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [settings.shortcut]);

  // Intercept Copy event inside window
  useEffect(() => {
    const handleCopyEvent = () => {
      setTimeout(async () => {
        try {
          const text = await navigator.clipboard.readText();
          if (text) {
            handleAddItem(text, 'text', 'Cópia no Sistema');
            if (settings.enableNotification) {
              setToastMessage('Nova cópia gravada no histórico!');
            }
          }
        } catch (e) {
          // Clipboard read access might require permission
        }
      }, 100);
    };

    document.addEventListener('copy', handleCopyEvent);
    return () => document.removeEventListener('copy', handleCopyEvent);
  }, [handleAddItem, settings.enableNotification]);

  // Select & paste item callback
  const handleSelectItem = (item: ClipboardItem) => {
    navigator.clipboard.writeText(item.content);
    setToastMessage('Item copiado para a Área de Transferência!');

    // Increment copy count
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, copyCount: i.copyCount + 1 } : i))
    );
  };

  const handleTogglePin = (id: string) => {
    setItems((prev) =>
      prev.map((i) => {
        if (i.id === id) {
          const nextPinned = !i.isPinned;
          setToastMessage(nextPinned ? 'Item fixado no topo!' : 'Item desafixado.');
          return { ...i, isPinned: nextPinned };
        }
        return i;
      })
    );
  };

  const handleDeleteItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    setToastMessage('Item removido.');
  };

  const handleClearAll = () => {
    // Keep pinned items
    setItems((prev) => {
      const pinnedOnly = prev.filter((i) => i.isPinned);
      setToastMessage(`Histórico limpado. (${pinnedOnly.length} fixados mantidos)`);
      return pinnedOnly;
    });
  };

  const handleUpdateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  const handleResetSettings = () => {
    setSettings(defaultSettings);
    setToastMessage('Configurações restauradas.');
  };

  const handleExportData = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(items, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `clipmaster-backup-${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    setToastMessage('Backup exportado com sucesso!');
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], 'UTF-8');
      fileReader.onload = (event) => {
        try {
          const imported = JSON.parse(event.target?.result as string);
          if (Array.isArray(imported)) {
            const formatted = imported.map((item: any) => ({
              ...item,
              timestamp: new Date(item.timestamp),
            }));
            setItems(formatted);
            setToastMessage(`${formatted.length} itens importados!`);
          }
        } catch (err) {
          setToastMessage('Erro ao importar arquivo JSON.');
        }
      };
    }
  };

  return (
    <div className="min-h-screen bg-cream dark:bg-night text-ink dark:text-paper flex flex-col font-sans selection:bg-brand-yellow selection:text-ink">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        itemCount={items.length}
        onOpenOverlay={() => setIsOverlayOpen(true)}
        settings={settings}
        onToggleTheme={() =>
          setSettings((prev) => ({ ...prev, theme: prev.theme === 'dark' ? 'light' : 'dark' }))
        }
      />

      {/* Main Workspace Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {activeTab === 'simulator' && (
          <LiveSimulator
            items={items}
            onAddItem={handleAddItem}
            onOpenOverlay={() => setIsOverlayOpen(true)}
            settings={settings}
            onCopySuccess={() => setToastMessage('Conteúdo copiado! Teste o Super + C.')}
          />
        )}

        {activeTab === 'ubuntu-script' && <UbuntuInstaller />}

        {activeTab === 'settings' && (
          <SettingsPanel
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            onResetSettings={handleResetSettings}
            onExportData={handleExportData}
            onImportData={handleImportData}
          />
        )}

        {activeTab === 'stats' && <StatsPanel items={items} />}
      </main>

      {/* Floating Pop-up Overlay (Simulating Windows Win+V / Ubuntu Super+V) */}
      <ClipboardOverlay
        isOpen={isOverlayOpen}
        onClose={() => setIsOverlayOpen(false)}
        items={items}
        onSelectItem={handleSelectItem}
        onTogglePin={handleTogglePin}
        onDeleteItem={handleDeleteItem}
        onClearAll={handleClearAll}
        settings={settings}
      />

      {/* Toast Notification */}
      <ToastNotification message={toastMessage} onClose={() => setToastMessage(null)} />

      {/* Footer */}
      <footer className="border-t-[3px] border-ink dark:border-paper/80 py-4 px-6 text-center text-xs text-ink/70 dark:text-paper/70 bg-cream-soft dark:bg-night-soft font-medium">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            ClipMaster Ubuntu • Atalho <code className="text-brand-blue-dark dark:text-brand-blue-night font-bold">{settings.shortcut}</code> para Histórico no Linux
          </span>
          <span>
            Leve (~12MB RAM) • 100% Offline e Seguro
          </span>
        </div>
      </footer>
    </div>
  );
}
