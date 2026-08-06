export type ClipboardType = 'text' | 'code' | 'url' | 'sensitive' | 'command';

export interface ClipboardItem {
  id: string;
  content: string;
  type: ClipboardType;
  timestamp: Date;
  isPinned: boolean;
  copyCount: number;
  sourceApp?: string;
  charCount: number;
}

export type ThemeMode = 'light' | 'dark';

export interface AppSettings {
  maxItems: number;
  shortcut: string;
  soundEnabled: boolean;
  maskSensitive: boolean;
  autoClearOnLogout: boolean;
  theme: ThemeMode;
  position: 'center' | 'bottom-right' | 'mouse';
  enableNotification: boolean;
  autoPasteOnSelect: boolean;
}

export type ActiveTab = 'simulator' | 'ubuntu-script' | 'settings' | 'stats';
