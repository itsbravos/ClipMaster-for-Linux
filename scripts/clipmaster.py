#!/usr/bin/env python3
"""
ClipMaster Ubuntu - Daemon de Histórico de Área de Transferência
Consumo de RAM: ~15MB | Nível de CPU: 0% em repouso
Atalho Padrão: Super + C (configurado via GNOME Shortcuts)
Funciona em Ubuntu 20.04, 22.04, 24.04 (Wayland & X11)
"""

import sys
import os
import re
import signal
import gi

gi.require_version('Gtk', '3.0')
gi.require_version('GdkPixbuf', '2.0')
from gi.repository import Gtk, Gdk, GLib, GdkPixbuf

MAX_HISTORY = 50
HISTORY = []  # [{"type": "text"|"link"|"image", "content": str|Pixbuf, "sensitive": bool}]

PID_FILE = os.path.expanduser("~/.local/share/clipmaster/clipmaster.pid")

LINK_RE = re.compile(r'^https?://\S+$', re.IGNORECASE)


# ---------------------------------------------------------------------------
# Clipboard helpers
# ---------------------------------------------------------------------------

def get_clipboard():
    return Gtk.Clipboard.get(Gdk.SELECTION_CLIPBOARD)


def restore_clipboard(item):
    cb = get_clipboard()
    if item["type"] == "image":
        cb.set_image(item["content"])
    else:
        cb.set_text(item["content"], -1)
        cb.store()


def pixbuf_key(pixbuf):
    """Chave de deduplicação para imagens (hash dos primeiros bytes)."""
    try:
        return hash(bytes(pixbuf.get_pixels()[:512]))
    except Exception:
        return None


# ---------------------------------------------------------------------------
# Janela principal
# ---------------------------------------------------------------------------

class ClipboardWindow(Gtk.Window):
    def __init__(self):
        super().__init__(title="Histórico de Cópia (Super+C)")
        self.set_border_width(10)
        self.set_default_size(480, 580)
        self.set_position(Gtk.WindowPosition.CENTER)
        self.set_keep_above(True)
        self._filter_updating = False

        Gtk.Settings.get_default().set_property("gtk-application-prefer-dark-theme", True)

        vbox = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=6)
        self.add(vbox)

        # Busca
        self.search_entry = Gtk.Entry()
        self.search_entry.set_placeholder_text("Pesquisar no histórico...")
        self.search_entry.connect("changed", lambda _: self.refresh_list())
        vbox.pack_start(self.search_entry, False, False, 0)

        # Barra de filtros
        filter_bar = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=4)
        self.filter_buttons = {}
        prev = None
        for label, fid in [("Todos", "all"), ("Texto", "text"), ("Links", "link"), ("Imagens", "image")]:
            btn = Gtk.RadioButton.new_with_label_from_widget(prev, label)
            btn.connect("toggled", self._on_filter_toggled, fid)
            filter_bar.pack_start(btn, True, True, 0)
            self.filter_buttons[fid] = btn
            prev = btn
        vbox.pack_start(filter_bar, False, False, 0)

        vbox.pack_start(Gtk.Separator(orientation=Gtk.Orientation.HORIZONTAL), False, False, 2)

        # Lista
        scrolled = Gtk.ScrolledWindow()
        scrolled.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC)
        vbox.pack_start(scrolled, True, True, 0)

        self.listbox = Gtk.ListBox()
        self.listbox.set_selection_mode(Gtk.SelectionMode.SINGLE)
        self.listbox.connect("row-activated", self._on_row_activated)
        scrolled.add(self.listbox)

        # Rodapé
        footer = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=6)
        lbl = Gtk.Label(label="Enter para copiar | Esc para fechar")
        lbl.set_opacity(0.6)
        footer.pack_start(lbl, True, True, 0)
        btn_clear = Gtk.Button(label="Limpar")
        btn_clear.connect("clicked", lambda _: self._clear_all())
        footer.pack_end(btn_clear, False, False, 0)
        vbox.pack_start(footer, False, False, 0)

        self.connect("key-press-event", self._on_key_press)
        self.connect("delete-event", self._on_delete_event)

    # --- Filtro ---

    def _active_filter(self):
        for fid, btn in self.filter_buttons.items():
            if btn.get_active():
                return fid
        return "all"

    def _on_filter_toggled(self, btn, fid):
        if self._filter_updating or not btn.get_active():
            return
        self.refresh_list()

    # --- Lista ---

    def refresh_list(self):
        for child in self.listbox.get_children():
            self.listbox.remove(child)

        search = self.search_entry.get_text().lower()
        filt = self._active_filter()

        for item in HISTORY:
            itype = item["type"]

            if filt != "all" and itype != filt:
                continue

            if search and itype != "image":
                if search not in item["content"].lower():
                    continue

            self.listbox.add(self._build_row(item))

        self.listbox.show_all()

    def _build_row(self, item):
        row = Gtk.ListBoxRow()
        box = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=8)
        box.set_margin_top(5)
        box.set_margin_bottom(5)
        box.set_margin_start(10)
        box.set_margin_end(6)

        itype = item["type"]
        icons = {"text": "📄", "link": "🔗", "image": "🖼️"}
        box.pack_start(Gtk.Label(label=icons.get(itype, "")), False, False, 0)

        if itype == "image":
            pixbuf = item["content"]
            w, h = pixbuf.get_width(), pixbuf.get_height()
            scale = min(36 / w, 36 / h) if w > 0 and h > 0 else 1
            thumb = pixbuf.scale_simple(
                max(1, int(w * scale)), max(1, int(h * scale)),
                GdkPixbuf.InterpType.BILINEAR
            )
            box.pack_start(Gtk.Image.new_from_pixbuf(thumb), False, False, 0)
            lbl = Gtk.Label(label=f"Imagem  {w}×{h} px")
            lbl.set_xalign(0)
            box.pack_start(lbl, True, True, 0)
        else:
            if item["sensitive"]:
                preview = "🔒   ••••••••"
            else:
                preview = item["content"].strip().replace("\n", " ")
                if len(preview) > 58:
                    preview = preview[:55] + "…"
            lbl = Gtk.Label(label=preview)
            lbl.set_xalign(0)
            box.pack_start(lbl, True, True, 0)

        # Cadeado para marcar como senha/sensível
        lock = Gtk.ToggleButton(label="🔒" if item["sensitive"] else "🔓")
        lock.set_active(item["sensitive"])
        lock.set_relief(Gtk.ReliefStyle.NONE)
        lock.set_tooltip_text("Marcar como senha (oculta o conteúdo)")
        lock.connect("toggled", self._on_lock_toggled, item)
        box.pack_end(lock, False, False, 0)

        row.add(box)
        row.item = item
        return row

    def _on_lock_toggled(self, btn, item):
        item["sensitive"] = btn.get_active()
        btn.set_label("🔒" if item["sensitive"] else "🔓")
        self.refresh_list()

    def _on_row_activated(self, listbox, row):
        if row and hasattr(row, "item"):
            restore_clipboard(row.item)
            self.hide()

    def _clear_all(self):
        HISTORY.clear()
        self.refresh_list()

    def _on_delete_event(self, w, e):
        self.hide()
        return True

    def _on_key_press(self, w, event):
        if event.keyval == Gdk.KEY_Escape:
            self.hide()
            return True
        return False


# ---------------------------------------------------------------------------
# Monitor de clipboard (owner-change, Wayland nativo)
# ---------------------------------------------------------------------------

def setup_clipboard_monitor(win):
    cb = get_clipboard()
    last_text = {"value": ""}
    last_img_key = {"value": None}

    def on_owner_change(cb, event):
        # Tenta imagem primeiro
        pixbuf = cb.wait_for_image()
        if pixbuf:
            key = pixbuf_key(pixbuf)
            if key and key != last_img_key["value"]:
                last_img_key["value"] = key
                _add_item({"type": "image", "content": pixbuf, "sensitive": False}, win)
            return

        # Tenta texto/link
        text = cb.wait_for_text()
        if not text or not text.strip() or text == last_text["value"]:
            return
        last_text["value"] = text
        itype = "link" if LINK_RE.match(text.strip()) else "text"
        _add_item({"type": itype, "content": text, "sensitive": False}, win)

    cb.connect("owner-change", on_owner_change)


def _add_item(item, win):
    # Remove duplicata existente
    if item["type"] == "image":
        key = pixbuf_key(item["content"])
        HISTORY[:] = [i for i in HISTORY
                      if not (i["type"] == "image" and pixbuf_key(i["content"]) == key)]
    else:
        HISTORY[:] = [i for i in HISTORY
                      if not (i["type"] != "image" and i["content"] == item["content"])]

    HISTORY.insert(0, item)
    if len(HISTORY) > MAX_HISTORY:
        HISTORY.pop()

    if win.is_visible():
        win.refresh_list()


# ---------------------------------------------------------------------------
# Toggle da janela
# ---------------------------------------------------------------------------

def toggle_window(win):
    if win.is_visible():
        win.hide()
    else:
        win.refresh_list()
        win.show_all()
        win.present()
        win.search_entry.grab_focus()
    return False


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

    def on_sigusr1(signum, frame):
        GLib.idle_add(toggle_window, win)

    signal.signal(signal.SIGUSR1, on_sigusr1)

    write_pid_file()
    import atexit
    atexit.register(remove_pid_file)

    def init_win():
        win.show_all()
        win.hide()
        return False
    GLib.idle_add(init_win)

    setup_clipboard_monitor(win)

    print("✓ ClipMaster iniciado. Pressione Super+C para abrir o histórico.")
    Gtk.main()


if __name__ == "__main__":
    main()
