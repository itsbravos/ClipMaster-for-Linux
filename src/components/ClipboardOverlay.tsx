import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Pin,
  Trash2,
  X,
  Code,
  Link,
  Lock,
  Eye,
  EyeOff,
  Copy,
  Check,
  Terminal,
  FileText,
  Keyboard,
  ShieldAlert,
} from 'lucide-react';
import { ClipboardItem, ClipboardType, AppSettings } from '../types';

interface ClipboardOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  items: ClipboardItem[];
  onSelectItem: (item: ClipboardItem) => void;
  onTogglePin: (id: string) => void;
  onDeleteItem: (id: string) => void;
  onClearAll: () => void;
  settings: AppSettings;
}

export const ClipboardOverlay: React.FC<ClipboardOverlayProps> = ({
  isOpen,
  onClose,
  items,
  onSelectItem,
  onTogglePin,
  onDeleteItem,
  onClearAll,
  settings,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<ClipboardType | 'all' | 'pinned'>('all');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [revealedIds, setRevealedIds] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const listContainerRef = useRef<HTMLDivElement>(null);

  // Filter items
  const filteredItems = items.filter((item) => {
    const matchesFilter =
      selectedFilter === 'all'
        ? true
        : selectedFilter === 'pinned'
        ? item.isPinned
        : item.type === selectedFilter;

    const matchesQuery =
      item.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.sourceApp && item.sourceApp.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesFilter && matchesQuery;
  });

  // Reset index on search/filter change
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery, selectedFilter, items.length]);

  // Focus search input when overlay opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Keyboard navigation inside overlay
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev < filteredItems.length - 1 ? prev + 1 : prev));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredItems[selectedIndex]) {
          handleSelect(filteredItems[selectedIndex]);
        }
      } else if (e.key === 'Delete' && e.ctrlKey) {
        e.preventDefault();
        if (filteredItems[selectedIndex]) {
          onDeleteItem(filteredItems[selectedIndex].id);
        }
      } else if ((e.key === 'p' || e.key === 'P') && (e.ctrlKey || e.altKey)) {
        e.preventDefault();
        if (filteredItems[selectedIndex]) {
          onTogglePin(filteredItems[selectedIndex].id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredItems, selectedIndex]);

  // Scroll active item into view
  useEffect(() => {
    if (listContainerRef.current) {
      const activeEl = listContainerRef.current.children[selectedIndex] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  const handleSelect = (item: ClipboardItem) => {
    setCopiedId(item.id);
    onSelectItem(item);
    setTimeout(() => {
      setCopiedId(null);
      onClose();
    }, 200);
  };

  const toggleRevealSecret = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRevealedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const getItemIcon = (type: ClipboardType) => {
    switch (type) {
      case 'code':
        return <Code className="w-4 h-4 text-brand-green dark:text-brand-green-night" />;
      case 'url':
        return <Link className="w-4 h-4 text-brand-blue-dark dark:text-brand-blue-night" />;
      case 'sensitive':
        return <Lock className="w-4 h-4 text-brand-red dark:text-brand-red-night" />;
      case 'command':
        return <Terminal className="w-4 h-4 text-brand-purple dark:text-brand-purple-night" />;
      default:
        return <FileText className="w-4 h-4 text-ink/50 dark:text-paper/50" />;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 dark:bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md card-neo overflow-hidden flex flex-col max-h-[85vh] text-ink dark:text-paper"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-brand-blue dark:bg-brand-blue-night px-4 py-3 border-b-[3px] border-ink dark:border-paper/80 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-brand-red border-2 border-ink" />
            <div className="w-3 h-3 rounded-full bg-brand-yellow border-2 border-ink" />
            <div className="w-3 h-3 rounded-full bg-brand-green border-2 border-ink" />
            <span className="ml-2 font-display font-bold text-sm text-ink tracking-wide">
              Área de Transferência ({filteredItems.length})
            </span>
          </div>

          <div className="flex items-center space-x-1">
            <span className="text-[10px] text-ink/70 font-mono bg-cream-card px-2 py-0.5 rounded border-2 border-ink/70 hidden sm:inline">
              {settings.shortcut}
            </span>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-ink hover:bg-ink/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="p-3 bg-cream-card dark:bg-night-card border-b-2 border-ink/20 dark:border-paper/20 flex items-center space-x-2">
          <Search className="w-4 h-4 text-ink/50 dark:text-paper/50 ml-1 shrink-0" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Pesquisar cópias..."
            className="w-full bg-transparent text-xs text-ink dark:text-paper placeholder-ink/40 dark:placeholder-paper/40 focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-xs text-ink/50 dark:text-paper/50 hover:text-ink dark:hover:text-paper"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="px-3 py-2 bg-cream-soft dark:bg-night-soft border-b-2 border-ink/20 dark:border-paper/20 flex items-center space-x-1.5 overflow-x-auto text-[11px] scrollbar-none">
          <button
            onClick={() => setSelectedFilter('all')}
            className={`badge-neo px-2.5 py-1 transition-all ${
              selectedFilter === 'all'
                ? 'bg-brand-blue dark:bg-brand-blue-night text-ink'
                : 'bg-cream-card dark:bg-night-card text-ink/60 dark:text-paper/60 hover:text-ink dark:hover:text-paper'
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setSelectedFilter('pinned')}
            className={`badge-neo flex items-center space-x-1 px-2.5 py-1 transition-all ${
              selectedFilter === 'pinned'
                ? 'bg-brand-yellow text-ink'
                : 'bg-cream-card dark:bg-night-card text-ink/60 dark:text-paper/60 hover:text-ink dark:hover:text-paper'
            }`}
          >
            <Pin className="w-3 h-3" />
            <span>Fixados</span>
          </button>
          <button
            onClick={() => setSelectedFilter('code')}
            className={`badge-neo px-2.5 py-1 transition-all ${
              selectedFilter === 'code'
                ? 'bg-brand-green dark:bg-brand-green-night text-ink'
                : 'bg-cream-card dark:bg-night-card text-ink/60 dark:text-paper/60 hover:text-ink dark:hover:text-paper'
            }`}
          >
            Código
          </button>
          <button
            onClick={() => setSelectedFilter('url')}
            className={`badge-neo px-2.5 py-1 transition-all ${
              selectedFilter === 'url'
                ? 'bg-brand-blue dark:bg-brand-blue-night text-ink'
                : 'bg-cream-card dark:bg-night-card text-ink/60 dark:text-paper/60 hover:text-ink dark:hover:text-paper'
            }`}
          >
            Links
          </button>
          <button
            onClick={() => setSelectedFilter('command')}
            className={`badge-neo px-2.5 py-1 transition-all ${
              selectedFilter === 'command'
                ? 'bg-brand-purple dark:bg-brand-purple-night text-ink'
                : 'bg-cream-card dark:bg-night-card text-ink/60 dark:text-paper/60 hover:text-ink dark:hover:text-paper'
            }`}
          >
            Comandos
          </button>
        </div>

        {/* Items List */}
        <div
          ref={listContainerRef}
          className="flex-1 overflow-y-auto p-2 space-y-1.5 max-h-[380px] bg-cream dark:bg-night"
        >
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center text-ink/50 dark:text-paper/50 flex flex-col items-center">
              <ShieldAlert className="w-8 h-8 mb-2" />
              <p className="text-sm font-bold">Nenhum item encontrado</p>
              <p className="text-xs mt-1">
                Copie algo no seu computador para ver aqui.
              </p>
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              const isMasked = item.type === 'sensitive' && !revealedIds[item.id] && settings.maskSensitive;

              return (
                <div
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`group relative p-3 rounded-xl border-[3px] transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-cream-card dark:bg-night-card border-ink dark:border-paper/80 shadow-[3px_3px_0_0_rgba(27,26,23,1)] dark:shadow-[3px_3px_0_0_rgba(0,0,0,0.5)]'
                      : 'bg-cream-card/60 dark:bg-night-card/60 border-ink/25 dark:border-paper/25 hover:border-ink/60 dark:hover:border-paper/60'
                  }`}
                >
                  {/* Item Top Meta */}
                  <div className="flex items-center justify-between mb-1.5 text-[10px] text-ink/60 dark:text-paper/60">
                    <div className="flex items-center space-x-1.5">
                      {getItemIcon(item.type)}
                      <span className="capitalize font-bold text-ink/80 dark:text-paper/80">
                        {item.type === 'command'
                          ? 'Comando Terminal'
                          : item.type === 'sensitive'
                          ? 'Sensível/Senha'
                          : item.type}
                      </span>
                      {item.sourceApp && (
                        <>
                          <span>•</span>
                          <span>{item.sourceApp}</span>
                        </>
                      )}
                    </div>

                    <div className="flex items-center space-x-1">
                      {item.isPinned && (
                        <span className="flex items-center text-ink font-bold bg-brand-yellow px-1.5 py-0.5 rounded border border-ink/40">
                          <Pin className="w-2.5 h-2.5 mr-0.5 fill-current" />
                          Fixado
                        </span>
                      )}
                      <span>
                        {new Date(item.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Content Preview */}
                  <div className="text-xs text-ink dark:text-paper font-mono break-all line-clamp-3 leading-relaxed">
                    {isMasked ? (
                      <span className="tracking-widest text-brand-red dark:text-brand-red-night">••••••••••••••••••••</span>
                    ) : (
                      item.content
                    )}
                  </div>

                  {/* Actions overlay / bottom bar */}
                  <div className="mt-2.5 pt-2 border-t-2 border-ink/15 dark:border-paper/15 flex items-center justify-between text-[11px] text-ink/60 dark:text-paper/60">
                    <span className="text-[10px]">
                      {item.charCount} caracteres
                    </span>

                    <div className="flex items-center space-x-1">
                      {item.type === 'sensitive' && (
                        <button
                          onClick={(e) => toggleRevealSecret(item.id, e)}
                          className="p-1 rounded hover:bg-ink/10 dark:hover:bg-paper/10 text-ink/70 dark:text-paper/70 transition-colors"
                          title={revealedIds[item.id] ? 'Ocultar' : 'Revelar'}
                        >
                          {revealedIds[item.id] ? (
                            <EyeOff className="w-3.5 h-3.5" />
                          ) : (
                            <Eye className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onTogglePin(item.id);
                        }}
                        className={`p-1 rounded transition-colors ${
                          item.isPinned
                            ? 'text-ink bg-brand-yellow/60 hover:bg-brand-yellow'
                            : 'text-ink/50 dark:text-paper/50 hover:bg-ink/10 dark:hover:bg-paper/10 hover:text-ink dark:hover:text-paper'
                        }`}
                        title={item.isPinned ? 'Desafixar' : 'Fixar no topo'}
                      >
                        <Pin className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteItem(item.id);
                        }}
                        className="p-1 rounded text-ink/50 dark:text-paper/50 hover:text-brand-red dark:hover:text-brand-red-night hover:bg-brand-red/10 transition-colors"
                        title="Remover item (Ctrl+Del)"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelect(item);
                        }}
                        className="flex items-center space-x-1 px-2 py-0.5 rounded border-2 border-ink font-bold transition-all bg-brand-blue dark:bg-brand-blue-night text-ink"
                      >
                        {copiedId === item.id ? (
                          <>
                            <Check className="w-3 h-3" />
                            <span>Colado!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Colar</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer controls & shortcut tips */}
        <div className="p-3 bg-cream-card dark:bg-night-card border-t-[3px] border-ink dark:border-paper/80 flex items-center justify-between text-xs text-ink/60 dark:text-paper/60">
          <div className="flex items-center space-x-2 text-[11px]">
            <Keyboard className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">
              <kbd className="px-1 py-0.5 bg-ink/10 dark:bg-paper/10 rounded border border-ink/30 dark:border-paper/30">↑↓</kbd> navegar •{' '}
              <kbd className="px-1 py-0.5 bg-ink/10 dark:bg-paper/10 rounded border border-ink/30 dark:border-paper/30">Enter</kbd> colar
            </span>
          </div>

          <button
            onClick={onClearAll}
            className="flex items-center space-x-1 text-ink/60 dark:text-paper/60 hover:text-brand-red dark:hover:text-brand-red-night text-xs font-bold transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Limpar Histórico</span>
          </button>
        </div>
      </div>
    </div>
  );
};
