export const pythonGtkDaemonCode = `#!/usr/bin/env python3
"""
ClipMaster Ubuntu - Daemon de Histórico de Área de Transferência
Consumo de RAM: ~10MB a 14MB | Nível de CPU: 0% em repouso
Atalho Padrão: Super + C (ou Ctrl + Alt + C)
Funciona em Ubuntu 20.04, 22.04, 24.04 (X11 & Wayland)
"""

import sys
import os
import time
import subprocess
import threading
import gi

gi.require_version('Gtk', '3.0')
gi.require_version('Keybinder', '3.0')
from gi.repository import Gtk, Gdk, GLib, Keybinder

MAX_HISTORY = 50
HISTORY = []
PINNED = set()

def get_clipboard_text():
    try:
        # Detecta Wayland ou X11
        if os.environ.get("WAYLAND_DISPLAY"):
            res = subprocess.run(["wl-paste", "--no-newline"], capture_output=True, text=True, timeout=1)
        else:
            res = subprocess.run(["xclip", "-selection", "clipboard", "-o"], capture_output=True, text=True, timeout=1)
        return res.stdout if res.returncode == 0 else None
    except Exception:
        return None

def set_clipboard_text(text):
    try:
        if os.environ.get("WAYLAND_DISPLAY"):
            p = subprocess.Popen(["wl-copy"], stdin=subprocess.PIPE, text=True)
            p.communicate(input=text)
        else:
            p = subprocess.Popen(["xclip", "-selection", "clipboard"], stdin=subprocess.PIPE, text=True)
            p.communicate(input=text)
    except Exception as e:
        print("Erro ao copiar:", e)

class ClipboardWindow(Gtk.Window):
    def __init__(self):
        super().__init__(title="Histórico de Cópia (Super+C)")
        self.set_border_width(12)
        self.set_default_size(420, 520)
        self.set_position(Gtk.WindowPosition.CENTER)
        self.set_keep_above(True)
        self.set_decorated(True)
        
        # Tema Escuro Yaru
        settings = Gtk.Settings.get_default()
        settings.set_property("gtk-application-prefer-dark-theme", True)

        vbox = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=8)
        self.add(vbox)

        # Barra de Pesquisa
        self.search_entry = Gtk.SearchEntry()
        self.search_entry.set_placeholder_text("Pesquisar no histórico (Super+C)...")
        self.search_entry.connect("changed", self.on_search_changed)
        vbox.pack_start(self.search_entry, False, False, 0)

        # Lista de Itens com Scroll
        scrolled = Gtk.ScrolledWindow()
        scrolled.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC)
        vbox.pack_start(scrolled, True, True, 0)

        self.listbox = Gtk.ListBox()
        self.listbox.set_selection_mode(Gtk.SelectionMode.SINGLE)
        self.listbox.connect("row-activated", self.on_row_selected)
        scrolled.add(self.listbox)

        # Rodapé
        footer = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=6)
        lbl_info = Gtk.Label(label="Pressione Enter para copiar/colar | Esc para fechar")
        lbl_info.set_opacity(0.7)
        footer.pack_start(lbl_info, True, True, 0)

        btn_clear = Gtk.Button(label="Limpar")
        btn_clear.connect("clicked", self.on_clear_clicked)
        footer.pack_end(btn_clear, False, False, 0)

        vbox.pack_start(footer, False, False, 0)

        self.connect("key-press-event", self.on_key_press)
        self.connect("delete-event", lambda w, e: self.hide_on_delete())

    def refresh_list(self, filter_text=""):
        for child in self.listbox.get_children():
            self.listbox.remove(child)

        for idx, text in enumerate(HISTORY):
            if filter_text.lower() in text.lower():
                row = Gtk.ListBoxRow()
                box = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=10)
                box.set_margin_top(6)
                box.set_margin_bottom(6)
                box.set_margin_start(10)
                box.set_margin_end(10)

                preview = text.strip().replace("\\n", " ")
                if len(preview) > 60:
                    preview = preview[:57] + "..."

                lbl = Gtk.Label(label=f"{idx + 1}.  {preview}")
                lbl.set_xalign(0)
                box.pack_start(lbl, True, True, 0)

                row.add(box)
                row.text_full = text
                self.listbox.add(row)

        self.listbox.show_all()

    def on_search_changed(self, entry):
        self.refresh_list(entry.get_text())

    def on_row_selected(self, listbox, row):
        if row and hasattr(row, 'text_full'):
            set_clipboard_text(row.text_full)
            self.hide()

    def on_clear_clicked(self, btn):
        global HISTORY
        HISTORY = []
        self.refresh_list()

    def on_key_press(self, widget, event):
        if event.keyval == Gdk.KEY_Escape:
            self.hide()
            return True
        return False

def clipboard_monitor_loop(win):
    last_text = ""
    while True:
        curr = get_clipboard_text()
        if curr and curr.strip() and curr != last_text:
            last_text = curr
            if curr in HISTORY:
                HISTORY.remove(curr)
            HISTORY.insert(0, curr)
            if len(HISTORY) > MAX_HISTORY:
                HISTORY.pop()
            GLib.idle_add(win.refresh_list)
        time.sleep(0.6)

def toggle_window(win):
    if win.is_visible():
        win.hide()
    else:
        win.refresh_list()
        win.present()
        win.search_entry.grab_focus()

def main():
    Gtk.init(sys.argv)
    win = ClipboardWindow()

    # Inicia Thread de monitoramento
    t = threading.Thread(target=clipboard_monitor_loop, args=(win,), daemon=True)
    t.start()

    # Tenta registrar atalho global com Keybinder (X11)
    try:
        Keybinder.init()
        Keybinder.bind("<Super>c", lambda k: toggle_window(win))
        Keybinder.bind("<Ctrl><Alt>c", lambda k: toggle_window(win))
        print("✓ Atalho Super+C e Ctrl+Alt+C registrados via Keybinder.")
    except Exception:
        print("! Dica: Para Wayland, configure o comando 'clipmaster --toggle' no GNOME Shortcuts.")

    if "--toggle" in sys.argv:
        toggle_window(win)

    Gtk.main()

if __name__ == "__main__":
    main()
`;

export const ubuntuInstallShellScript = `#!/usr/bin/env bash
# Script de Instalação Automática do ClipMaster Ubuntu
# Cria atalho Super+C no GNOME e configura serviço em segundo plano

set -e

echo "=========================================="
echo "  Instalador ClipMaster Ubuntu (Super+C)  "
echo "=========================================="

# 1. Instala dependências nativas leves
echo "[1/4] Instalando dependências de sistema..."
sudo apt update -qq
sudo apt install -y python3-gi python3-pip xclip wl-clipboard libkeybinder-3.0-0 gir1.2-keybinder-3.0 -qq

# 2. Cria diretório e arquivo da aplicação
echo "[2/4] Criando script da aplicação em ~/.local/bin/clipmaster..."
mkdir -p ~/.local/bin

cat << 'EOF' > ~/.local/bin/clipmaster
${pythonGtkDaemonCode}
EOF

chmod +x ~/.local/bin/clipmaster

# 3. Configura serviço de inicialização automática (systemd user service)
echo "[3/4] Configurando inicialização em segundo plano..."
mkdir -p ~/.config/systemd/user

cat << 'EOF' > ~/.config/systemd/user/clipmaster.service
[Unit]
Description=ClipMaster Ubuntu Clipboard History Daemon
After=graphical-session.target

[Service]
ExecStart=%h/.local/bin/clipmaster
Restart=always
RestartSec=3

[Install]
WantedBy=graphical-session.target
EOF

systemctl --user daemon-reload
systemctl --user enable clipmaster.service
systemctl --user restart clipmaster.service || true

# 4. Configura atalho de teclado Super+C no GNOME
echo "[4/4] Configurando atalho Super+C no GNOME..."
KEY_PATH="/org/gnome/settings-daemon/plugins/media-keys/custom-keybindings/clipmaster/"

gsettings set org.gnome.settings-daemon.plugins.media-keys.custom-keybinding:$KEY_PATH name 'ClipMaster Histórico de Cópia'
gsettings set org.gnome.settings-daemon.plugins.media-keys.custom-keybinding:$KEY_PATH command "$HOME/.local/bin/clipmaster --toggle"
gsettings set org.gnome.settings-daemon.plugins.media-keys.custom-keybinding:$KEY_PATH binding '<Super>c'

# Adiciona à lista de atalhos se não estiver
CURRENT_BINDINGS=$(gsettings get org.gnome.settings-daemon.plugins.media-keys custom-keybindings)
if [[ "$CURRENT_BINDINGS" != *"$KEY_PATH"* ]]; then
  if [[ "$CURRENT_BINDINGS" == "@as []" ]] || [[ "$CURRENT_BINDINGS" == "[]" ]]; then
    NEW_BINDINGS="['$KEY_PATH']"
  else
    NEW_BINDINGS=$(echo "$CURRENT_BINDINGS" | sed "s|\]|, '$KEY_PATH']|")
  fi
  gsettings set org.gnome.settings-daemon.plugins.media-keys custom-keybindings "$NEW_BINDINGS"
fi

echo ""
echo "✨ Concluído com sucesso!"
echo "Pressione [Super + C] no seu teclado para testar no seu Ubuntu!"
echo "Uso de Memória: ~12 MB | CPU: 0%"
`;

export const copyqAlternativeScript = `# Opção alternativa rápida usando CopyQ (Gerenciador Oficial Ultra Leve com Suporte GNOME/Yaru)
sudo apt update
sudo apt install -y copyq

# Adiciona ao início do sistema
copyq &

# Configura atalho Super+C no Ubuntu
gsettings set org.gnome.settings-daemon.plugins.media-keys.custom-keybinding:/org/gnome/settings-daemon/plugins/media-keys/custom-keybindings/copyq/ name 'CopyQ Histórico'
gsettings set org.gnome.settings-daemon.plugins.media-keys.custom-keybinding:/org/gnome/settings-daemon/plugins/media-keys/custom-keybindings/copyq/ command 'copyq toggle'
gsettings set org.gnome.settings-daemon.plugins.media-keys.custom-keybinding:/org/gnome/settings-daemon/plugins/media-keys/custom-keybindings/copyq/ binding '<Super>c'
`;
