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
        return <Code className="w-4 h-4 text-emerald-400" />;
      case 'url':
        return <Link className="w-4 h-4 text-sky-400" />;
      case 'sensitive':
        return <Lock className="w-4 h-4 text-amber-400" />;
      case 'command':
        return <Terminal className="w-4 h-4 text-purple-400" />;
      default:
        return <FileText className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-[#23232C] border border-[#3A3A4A] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] text-gray-100 ring-1 ring-black/40"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Ubuntu Yaru Styled */}
        <div className="bg-gradient-to-r from-[#2B2B36] to-[#1E1E26] px-4 py-3 border-b border-[#3A3A4A] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-[#E95420]" />
            <div className="w-3 h-3 rounded-full bg-amber-500" />
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
            <span className="ml-2 font-semibold text-sm text-gray-200 tracking-wide">
              Área de Transferência ({filteredItems.length})
            </span>
          </div>

          <div className="flex items-center space-x-1">
            <span className="text-[10px] text-gray-400 font-mono bg-[#14141A] px-2 py-0.5 rounded border border-[#3A3A4A] hidden sm:inline">
              {settings.shortcut}
            </span>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="p-3 bg-[#1A1A22] border-b border-[#3A3A4A] flex items-center space-x-2">
          <Search className="w-4 h-4 text-gray-400 ml-1 shrink-0" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Pesquisar cópias..."
            className="w-full bg-transparent text-xs text-white placeholder-gray-500 focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-xs text-gray-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="px-3 py-2 bg-[#1A1A22]/80 border-b border-[#2D2D3A] flex items-center space-x-1.5 overflow-x-auto text-[11px] scrollbar-none">
          <button
            onClick={() => setSelectedFilter('all')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
              selectedFilter === 'all'
                ? 'bg-[#E95420] text-white shadow'
                : 'bg-[#2B2B38] text-gray-400 hover:text-white'
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setSelectedFilter('pinned')}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg font-medium transition-all ${
              selectedFilter === 'pinned'
                ? 'bg-[#E95420] text-white shadow'
                : 'bg-[#2B2B38] text-gray-400 hover:text-white'
            }`}
          >
            <Pin className="w-3 h-3" />
            <span>Fixados</span>
          </button>
          <button
            onClick={() => setSelectedFilter('code')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
              selectedFilter === 'code'
                ? 'bg-emerald-600 text-white shadow'
                : 'bg-[#2B2B38] text-gray-400 hover:text-white'
            }`}
          >
            Código
          </button>
          <button
            onClick={() => setSelectedFilter('url')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
              selectedFilter === 'url'
                ? 'bg-sky-600 text-white shadow'
                : 'bg-[#2B2B38] text-gray-400 hover:text-white'
            }`}
          >
            Links
          </button>
          <button
            onClick={() => setSelectedFilter('command')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
              selectedFilter === 'command'
                ? 'bg-purple-600 text-white shadow'
                : 'bg-[#2B2B38] text-gray-400 hover:text-white'
            }`}
          >
            Comandos
          </button>
        </div>

        {/* Items List */}
        <div
          ref={listContainerRef}
          className="flex-1 overflow-y-auto p-2 space-y-1.5 scrollbar-thin scrollbar-thumb-gray-700 max-h-[380px]"
        >
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center text-gray-400 flex flex-col items-center">
              <ShieldAlert className="w-8 h-8 text-gray-500 mb-2" />
              <p className="text-sm font-medium">Nenhum item encontrado</p>
              <p className="text-xs text-gray-500 mt-1">
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
                  className={`group relative p-3 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#31313E] border-[#E95420] shadow-md'
                      : 'bg-[#272732] border-[#363646] hover:bg-[#2D2D3A]'
                  }`}
                >
                  {/* Item Top Meta */}
                  <div className="flex items-center justify-between mb-1.5 text-[10px] text-gray-400">
                    <div className="flex items-center space-x-1.5">
                      {getItemIcon(item.type)}
                      <span className="capitalize font-medium text-gray-300">
                        {item.type === 'command'
                          ? 'Comando Terminal'
                          : item.type === 'sensitive'
                          ? 'Sensível/Senha'
                          : item.type}
                      </span>
                      {item.sourceApp && (
                        <>
                          <span>•</span>
                          <span className="text-gray-400">{item.sourceApp}</span>
                        </>
                      )}
                    </div>

                    <div className="flex items-center space-x-1">
                      {item.isPinned && (
                        <span className="flex items-center text-[#E95420] font-medium bg-[#E95420]/10 px-1.5 py-0.5 rounded">
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
                  <div className="text-xs text-gray-100 font-mono break-all line-clamp-3 leading-relaxed">
                    {isMasked ? (
                      <span className="tracking-widest text-amber-400">••••••••••••••••••••</span>
                    ) : (
                      item.content
                    )}
                  </div>

                  {/* Actions overlay / bottom bar */}
                  <div className="mt-2.5 pt-2 border-t border-[#3A3A48] flex items-center justify-between text-[11px] text-gray-400">
                    <span className="text-[10px]">
                      {item.charCount} caracteres
                    </span>

                    <div className="flex items-center space-x-1">
                      {item.type === 'sensitive' && (
                        <button
                          onClick={(e) => toggleRevealSecret(item.id, e)}
                          className="p-1 rounded hover:bg-white/10 text-gray-300 transition-colors"
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
                            ? 'text-[#E95420] hover:bg-[#E95420]/20'
                            : 'text-gray-400 hover:bg-white/10 hover:text-white'
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
                        className="p-1 rounded text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Remover item (Ctrl+Del)"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelect(item);
                        }}
                        className="flex items-center space-x-1 px-2 py-0.5 rounded bg-[#E95420] text-white hover:bg-[#d04618] font-medium transition-all"
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
        <div className="p-3 bg-[#1A1A22] border-t border-[#3A3A4A] flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center space-x-2 text-[11px]">
            <Keyboard className="w-3.5 h-3.5 text-gray-400" />
            <span className="hidden sm:inline">
              <kbd className="px-1 py-0.5 bg-black/40 rounded border border-gray-600">↑↓</kbd> navegar •{' '}
              <kbd className="px-1 py-0.5 bg-black/40 rounded border border-gray-600">Enter</kbd> colar
            </span>
          </div>

          <button
            onClick={onClearAll}
            className="flex items-center space-x-1 text-gray-400 hover:text-rose-400 text-xs transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Limpar Histórico</span>
          </button>
        </div>
      </div>
    </div>
  );
};
