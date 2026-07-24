#!/usr/bin/env python3
"""
ClipMaster Ubuntu - Daemon de Histórico de Área de Transferência
Consumo de RAM: ~10MB a 14MB | Nível de CPU: 0% em repouso
Atalho Padrão: Super + C (configurado via GNOME Shortcuts)
Funciona em Ubuntu 20.04, 22.04, 24.04 (X11 & Wayland via XWayland)
"""

import sys
import os
import signal
import gi

# GDK_BACKEND=x11 faz o GTK usar XWayland, que ponteia o clipboard
# Wayland↔X11. O sinal owner-change funciona corretamente nesse modo
# mesmo em sessões Wayland GNOME onde xclip não consegue ler o clipboard.
if os.environ.get("DISPLAY") and not os.environ.get("GDK_BACKEND"):
    os.environ["GDK_BACKEND"] = "x11"

gi.require_version('Gtk', '3.0')
from gi.repository import Gtk, Gdk, GLib

MAX_HISTORY = 50
HISTORY = []

PID_FILE = os.path.expanduser("~/.local/share/clipmaster/clipmaster.pid")


# ---------------------------------------------------------------------------
# Clipboard via GTK (X11 backend via XWayland)
# ---------------------------------------------------------------------------

def gtk_clipboard():
    return Gtk.Clipboard.get(Gdk.SELECTION_CLIPBOARD)


def set_clipboard_text(text):
    cb = gtk_clipboard()
    cb.set_text(text, -1)
    cb.store()


# ---------------------------------------------------------------------------
# Janela principal
# ---------------------------------------------------------------------------

class ClipboardWindow(Gtk.Window):
    def __init__(self):
        super().__init__(title="Histórico de Cópia (Super+C)")
        self.set_border_width(12)
        self.set_default_size(420, 520)
        self.set_position(Gtk.WindowPosition.CENTER)
        self.set_keep_above(True)
        self.set_skip_taskbar_hint(True)
        self.set_skip_pager_hint(True)

        Gtk.Settings.get_default().set_property("gtk-application-prefer-dark-theme", True)

        vbox = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=8)
        self.add(vbox)

        self.search_entry = Gtk.Entry()
        self.search_entry.set_placeholder_text("Pesquisar no histórico...")
        self.search_entry.connect("changed", self.on_search_changed)
        vbox.pack_start(self.search_entry, False, False, 0)

        scrolled = Gtk.ScrolledWindow()
        scrolled.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC)
        vbox.pack_start(scrolled, True, True, 0)

        self.listbox = Gtk.ListBox()
        self.listbox.set_selection_mode(Gtk.SelectionMode.SINGLE)
        self.listbox.connect("row-activated", self.on_row_selected)
        scrolled.add(self.listbox)

        footer = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=6)
        lbl = Gtk.Label(label="Enter para copiar | Esc para fechar")
        lbl.set_opacity(0.6)
        footer.pack_start(lbl, True, True, 0)
        btn_clear = Gtk.Button(label="Limpar")
        btn_clear.connect("clicked", self.on_clear_clicked)
        footer.pack_end(btn_clear, False, False, 0)
        vbox.pack_start(footer, False, False, 0)

        self.connect("key-press-event", self.on_key_press)
        self.connect("delete-event", self.on_delete_event)

    def on_delete_event(self, widget, event):
        self.hide()
        return True

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
                preview = text.strip().replace("\n", " ")
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


# ---------------------------------------------------------------------------
# Monitor de clipboard via owner-change (GTK, main loop, X11/XWayland)
# ---------------------------------------------------------------------------

def setup_clipboard_monitor(win):
    cb = gtk_clipboard()
    last_text = {"value": ""}

    def on_owner_change(clipboard, event):
        # wait_for_text() chamado imediatamente após owner-change funciona
        # porque o dono ainda está ativo no momento do evento
        text = clipboard.wait_for_text()
        if not text or not text.strip():
            return
        if text == last_text["value"]:
            return
        last_text["value"] = text
        if text in HISTORY:
            HISTORY.remove(text)
        HISTORY.insert(0, text)
        if len(HISTORY) > MAX_HISTORY:
            HISTORY.pop()
        if win.is_visible():
            win.refresh_list()

    cb.connect("owner-change", on_owner_change)


# ---------------------------------------------------------------------------
# Toggle da janela
# ---------------------------------------------------------------------------

_toggle_pending = False


def toggle_window(win):
    global _toggle_pending
    _toggle_pending = False
    if win.is_visible():
        win.hide()
    else:
        win.refresh_list()
        win.show_all()
        win.present()
        win.search_entry.grab_focus()
    return False


def schedule_toggle(win):
    global _toggle_pending
    if not _toggle_pending:
        _toggle_pending = True
        GLib.idle_add(toggle_window, win)


# ---------------------------------------------------------------------------
# PID file
# ---------------------------------------------------------------------------

def write_pid_file():
    os.makedirs(os.path.dirname(PID_FILE), exist_ok=True)
    with open(PID_FILE, "w") as f:
        f.write(str(os.getpid()))


def remove_pid_file():
    try:
        os.remove(PID_FILE)
    except FileNotFoundError:
        pass


def send_toggle_to_daemon():
    try:
        with open(PID_FILE) as f:
            pid = int(f.read().strip())
        os.kill(pid, signal.SIGUSR1)
    except FileNotFoundError:
        print("! Daemon não está rodando.")
        sys.exit(1)
    except ProcessLookupError:
        print("! Daemon travado, limpando PID.")
        remove_pid_file()
        sys.exit(1)


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main():
    if "--toggle" in sys.argv:
        send_toggle_to_daemon()
        return

    Gtk.init(sys.argv)
    win = ClipboardWindow()

    # Inicializa widgets filhos após o main loop estar rodando (evita race condition)
    def init_win():
        win.show_all()
        win.hide()
        return False
    GLib.idle_add(init_win)

    GLib.unix_signal_add(GLib.PRIORITY_DEFAULT, signal.SIGUSR1,
                         lambda: schedule_toggle(win) or True)

    write_pid_file()
    import atexit
    atexit.register(remove_pid_file)

    setup_clipboard_monitor(win)

    print("✓ ClipMaster iniciado. Pressione Super+C para abrir o histórico.")
    Gtk.main()


if __name__ == "__main__":
    main()
