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
import json
import signal
import gi

gi.require_version('Gtk', '3.0')
gi.require_version('GdkPixbuf', '2.0')
from gi.repository import Gtk, Gdk, GLib, GdkPixbuf

# ---------------------------------------------------------------------------
# Indicador de bandeja (opcional): tenta Ayatana (moderno), depois AppIndicator3
# ---------------------------------------------------------------------------

INDICATOR_BACKEND = None
try:
    gi.require_version('AyatanaAppIndicator3', '0.1')
    from gi.repository import AyatanaAppIndicator3 as AppIndicator3
    INDICATOR_BACKEND = "ayatana"
except (ValueError, ImportError):
    try:
        gi.require_version('AppIndicator3', '0.1')
        from gi.repository import AppIndicator3
        INDICATOR_BACKEND = "legacy"
    except (ValueError, ImportError):
        AppIndicator3 = None
        INDICATOR_BACKEND = None

MAX_HISTORY_HARD_CAP = 200
HISTORY = []  # [{"type": "text"|"link"|"image", "content": str|Pixbuf, "sensitive": bool}]

PID_FILE = os.path.expanduser("~/.local/share/clipmaster/clipmaster.pid")

LINK_RE = re.compile(r'^https?://\S+$', re.IGNORECASE)

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

# ---------------------------------------------------------------------------
# Configuração persistente (~/.config/clipmaster/config.json)
# ---------------------------------------------------------------------------

CONFIG_DIR = os.path.expanduser("~/.config/clipmaster")
CONFIG_FILE = os.path.join(CONFIG_DIR, "config.json")

ACCENT_PRESETS = [
    ("Violeta", "#8B5CF6"),
    ("Ciano", "#06B6D4"),
    ("Verde", "#22D3AE"),
    ("Rosa", "#EC4899"),
    ("Laranja", "#E95420"),
]

DEFAULT_CONFIG = {
    "theme": "dark",              # "dark" | "light"
    "accent": "#8B5CF6",
    "display_mode": "tray" if INDICATOR_BACKEND else "window",  # "tray" | "window"
    "max_history": 50,
    "mask_new_items": False,
}


def load_config():
    cfg = dict(DEFAULT_CONFIG)
    try:
        with open(CONFIG_FILE) as f:
            saved = json.load(f)
        if isinstance(saved, dict):
            cfg.update({k: v for k, v in saved.items() if k in DEFAULT_CONFIG})
    except (FileNotFoundError, json.JSONDecodeError):
        pass
    return cfg


def save_config(cfg):
    os.makedirs(CONFIG_DIR, exist_ok=True)
    with open(CONFIG_FILE, "w") as f:
        json.dump(cfg, f, indent=2)


CONFIG = load_config()


# ---------------------------------------------------------------------------
# Ícones
# ---------------------------------------------------------------------------

def _first_existing(paths):
    for p in paths:
        if p and os.path.isfile(p):
            return p
    return None


def resolve_icon_path(filename):
    """Procura primeiro nos diretórios de ícones instalados, depois no repositório (modo dev)."""
    candidates = [
        os.path.expanduser(f"~/.local/share/icons/hicolor/scalable/apps/{filename}"),
        os.path.expanduser(f"~/.local/share/icons/hicolor/symbolic/apps/{filename}"),
        os.path.join(SCRIPT_DIR, "..", "assets", "icons", filename),
    ]
    return _first_existing(candidates)


ICON_FULLCOLOR = resolve_icon_path("clipmaster.svg")
ICON_SYMBOLIC = resolve_icon_path("clipmaster-symbolic.svg")


def register_icon_theme_path():
    icon_theme = Gtk.IconTheme.get_default()
    for icon_path in (ICON_FULLCOLOR, ICON_SYMBOLIC):
        if icon_path:
            icon_theme.append_search_path(os.path.dirname(icon_path))


# ---------------------------------------------------------------------------
# Estilo (CSS moderno, tema e cor de destaque configuráveis)
# ---------------------------------------------------------------------------

_style_provider = None


def hex_to_rgba(hex_color, alpha=1.0):
    hex_color = hex_color.lstrip("#")
    r, g, b = (int(hex_color[i:i + 2], 16) for i in (0, 2, 4))
    return f"rgba({r},{g},{b},{alpha})"


def build_css(theme, accent):
    dark = theme != "light"
    bg = "#1B1B24" if dark else "#F5F5F7"
    bg_alt = "#22222E" if dark else "#FFFFFF"
    fg = "#EDEDF2" if dark else "#1B1B24"
    fg_muted = "#9A9AA8" if dark else "#6B6B78"
    border = "#2E2E3B" if dark else "#E1E1E8"
    row_hover = hex_to_rgba(accent, 0.14)
    row_selected = hex_to_rgba(accent, 0.24)

    return f"""
    window.cm-root {{
        background-color: {bg};
        color: {fg};
    }}

    headerbar.cm-header {{
        background: {bg_alt};
        border-bottom: 1px solid {border};
        box-shadow: none;
        min-height: 42px;
        padding: 0 6px;
    }}

    headerbar.cm-header label.cm-title {{
        font-weight: 700;
        font-size: 1.05em;
        color: {fg};
    }}

    headerbar.cm-header label.cm-subtitle {{
        font-size: 0.78em;
        color: {fg_muted};
    }}

    button.cm-icon-btn {{
        background: transparent;
        border: none;
        border-radius: 8px;
        padding: 4px;
        color: {fg_muted};
    }}
    button.cm-icon-btn:hover {{
        background-color: {row_hover};
        color: {accent};
    }}

    entry.cm-search {{
        background-color: {bg_alt};
        border: 1px solid {border};
        border-radius: 10px;
        padding: 8px 10px;
        color: {fg};
        margin: 8px 10px 4px 10px;
    }}
    entry.cm-search:focus {{
        border-color: {accent};
    }}

    .cm-filter-btn {{
        background-color: transparent;
        background-image: none;
        border: 1px solid {border};
        border-radius: 999px;
        padding: 4px 4px;
        margin: 2px 3px;
        color: {fg_muted};
        font-size: 0.85em;
    }}
    .cm-filter-btn:checked, .cm-filter-btn:active {{
        background-color: {accent};
        background-image: none;
        border-color: {accent};
        color: #FFFFFF;
    }}
    .cm-filter-btn:hover {{
        border-color: {accent};
    }}

    list.cm-list {{
        background-color: {bg};
    }}

    list.cm-list row {{
        border-radius: 10px;
        margin: 2px 8px;
        padding: 2px;
        transition: background-color 120ms ease-in-out;
    }}
    list.cm-list row:hover {{
        background-color: {row_hover};
    }}
    list.cm-list row:selected {{
        background-color: {row_selected};
    }}

    label.cm-item-text {{
        color: {fg};
    }}
    label.cm-item-meta {{
        color: {fg_muted};
        font-size: 0.82em;
    }}

    togglebutton.cm-lock-btn {{
        background: transparent;
        border: none;
        border-radius: 8px;
    }}
    togglebutton.cm-lock-btn:hover {{
        background-color: {row_hover};
    }}

    box.cm-footer {{
        border-top: 1px solid {border};
        background-color: {bg_alt};
        padding: 6px 10px;
    }}
    label.cm-footer-hint {{
        color: {fg_muted};
        font-size: 0.78em;
    }}

    button.cm-clear-btn {{
        background-color: transparent;
        border: 1px solid {border};
        border-radius: 8px;
        color: {fg_muted};
        padding: 4px 10px;
    }}
    button.cm-clear-btn:hover {{
        border-color: #E45858;
        color: #E45858;
    }}

    scrollbar slider {{
        background-color: {border};
        border-radius: 6px;
        min-width: 6px;
    }}
    scrollbar slider:hover {{
        background-color: {accent};
    }}
    """


def apply_style(theme, accent):
    global _style_provider
    screen = Gdk.Screen.get_default()
    if _style_provider is not None:
        Gtk.StyleContext.remove_provider_for_screen(screen, _style_provider)

    _style_provider = Gtk.CssProvider()
    _style_provider.load_from_data(build_css(theme, accent).encode("utf-8"))
    Gtk.StyleContext.add_provider_for_screen(
        screen, _style_provider, Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION
    )
    Gtk.Settings.get_default().set_property(
        "gtk-application-prefer-dark-theme", theme != "light"
    )


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
# Diálogo de Configurações
# ---------------------------------------------------------------------------

class SettingsDialog(Gtk.Dialog):
    def __init__(self, parent, on_apply):
        super().__init__(title="Configurações do ClipMaster", transient_for=parent, flags=0)
        self.on_apply = on_apply
        self.set_default_size(460, -1)
        self.add_buttons("Cancelar", Gtk.ResponseType.CANCEL, "Salvar", Gtk.ResponseType.OK)

        content = self.get_content_area()
        content.set_border_width(16)
        content.set_spacing(14)

        # Tema
        content.pack_start(self._section_label("Aparência"), False, False, 0)
        theme_box = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=8)
        self.theme_combo = Gtk.ComboBoxText()
        self.theme_combo.append("dark", "Escuro")
        self.theme_combo.append("light", "Claro")
        self.theme_combo.set_active_id(CONFIG["theme"])
        theme_box.pack_start(Gtk.Label(label="Tema"), False, False, 0)
        theme_box.pack_end(self.theme_combo, False, False, 0)
        content.pack_start(theme_box, False, False, 0)

        # Cor de destaque
        accent_box = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=6)
        accent_box.pack_start(Gtk.Label(label="Cor de destaque"), False, False, 0)
        swatches = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=4)
        self._selected_accent = CONFIG["accent"]
        self._swatch_buttons = []
        for name, hexcolor in ACCENT_PRESETS:
            btn = Gtk.Button()
            btn.set_size_request(24, 24)
            btn.set_tooltip_text(name)
            ctx = btn.get_style_context()
            provider = Gtk.CssProvider()
            provider.load_from_data(
                f"button {{ background-color: {hexcolor}; border-radius: 999px; "
                f"border: 2px solid {'#FFFFFF' if hexcolor == CONFIG['accent'] else 'transparent'}; }}".encode()
            )
            ctx.add_provider(provider, Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION)
            btn.connect("clicked", self._on_accent_clicked, hexcolor, provider)
            self._swatch_buttons.append((btn, provider, hexcolor))
            swatches.pack_start(btn, False, False, 0)
        accent_box.pack_end(swatches, False, False, 0)
        content.pack_start(accent_box, False, False, 0)

        content.pack_start(Gtk.Separator(orientation=Gtk.Orientation.HORIZONTAL), False, False, 0)

        # Exibição
        content.pack_start(self._section_label("Exibição"), False, False, 0)
        display_box = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=8)
        display_box.pack_start(Gtk.Label(label="Modo"), False, False, 0)
        self.display_combo = Gtk.ComboBoxText()
        self.display_combo.append("window", "Janela padrão (aparece na taskbar)")
        if INDICATOR_BACKEND:
            self.display_combo.append("tray", "Bandeja do sistema (ícone no topo)")
        self.display_combo.set_active_id(
            CONFIG["display_mode"] if (CONFIG["display_mode"] != "tray" or INDICATOR_BACKEND) else "window"
        )
        display_box.pack_end(self.display_combo, False, False, 0)
        content.pack_start(display_box, False, False, 0)

        if not INDICATOR_BACKEND:
            hint = Gtk.Label(
                label="Bandeja do sistema indisponível. Instale o pacote "
                      "'gir1.2-ayatanaappindicator3-0.1' para habilitar."
            )
            hint.set_line_wrap(True)
            hint.set_xalign(0)
            hint.set_opacity(0.65)
            content.pack_start(hint, False, False, 0)

        content.pack_start(Gtk.Separator(orientation=Gtk.Orientation.HORIZONTAL), False, False, 0)

        # Histórico
        content.pack_start(self._section_label("Histórico"), False, False, 0)
        max_box = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=8)
        max_box.pack_start(Gtk.Label(label="Itens máximos"), False, False, 0)
        self.max_spin = Gtk.SpinButton.new_with_range(10, MAX_HISTORY_HARD_CAP, 10)
        self.max_spin.set_value(CONFIG["max_history"])
        max_box.pack_end(self.max_spin, False, False, 0)
        content.pack_start(max_box, False, False, 0)

        self.mask_check = Gtk.CheckButton(label="Ocultar automaticamente novos itens copiados")
        self.mask_check.set_active(CONFIG["mask_new_items"])
        content.pack_start(self.mask_check, False, False, 0)

        self.show_all()

    def _section_label(self, text):
        lbl = Gtk.Label(label=text)
        lbl.set_xalign(0)
        lbl.set_markup(f"<b>{GLib.markup_escape_text(text)}</b>")
        return lbl

    def _on_accent_clicked(self, btn, hexcolor, _provider):
        self._selected_accent = hexcolor
        for b, provider, hc in self._swatch_buttons:
            border = "#FFFFFF" if hc == hexcolor else "transparent"
            new_provider = Gtk.CssProvider()
            new_provider.load_from_data(
                f"button {{ background-color: {hc}; border-radius: 999px; "
                f"border: 2px solid {border}; }}".encode()
            )
            ctx = b.get_style_context()
            ctx.add_provider(new_provider, Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION)

    def run_and_apply(self):
        response = self.run()
        if response == Gtk.ResponseType.OK:
            CONFIG["theme"] = self.theme_combo.get_active_id() or "dark"
            CONFIG["accent"] = self._selected_accent
            CONFIG["display_mode"] = self.display_combo.get_active_id() or "window"
            CONFIG["max_history"] = int(self.max_spin.get_value())
            CONFIG["mask_new_items"] = self.mask_check.get_active()
            save_config(CONFIG)
            self.on_apply(CONFIG)
        self.destroy()


# ---------------------------------------------------------------------------
# Janela principal
# ---------------------------------------------------------------------------

class ClipboardWindow(Gtk.Window):
    def __init__(self):
        super().__init__(title="ClipMaster — Histórico de Cópia (Super+C)")
        self.set_default_size(480, 600)
        self.set_position(Gtk.WindowPosition.CENTER)
        self.set_keep_above(True)
        self.get_style_context().add_class("cm-root")
        self._filter_updating = False
        self.indicator = None

        if ICON_FULLCOLOR:
            try:
                self.set_icon_from_file(ICON_FULLCOLOR)
            except GLib.Error:
                pass

        self._build_headerbar()

        vbox = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=0)
        self.add(vbox)

        # Busca
        self.search_entry = Gtk.Entry()
        self.search_entry.set_placeholder_text("Pesquisar no histórico...")
        self.search_entry.get_style_context().add_class("cm-search")
        self.search_entry.connect("changed", lambda _: self.refresh_list())
        vbox.pack_start(self.search_entry, False, False, 0)

        # Barra de filtros
        filter_bar = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=0)
        filter_bar.set_margin_start(6)
        filter_bar.set_margin_end(6)
        self.filter_buttons = {}
        prev = None
        for label, fid in [("Todos", "all"), ("Texto", "text"), ("Links", "link"), ("Imagens", "image")]:
            btn = Gtk.RadioButton.new_with_label_from_widget(prev, label)
            btn.set_mode(False)
            btn.get_style_context().add_class("cm-filter-btn")
            btn.connect("toggled", self._on_filter_toggled, fid)
            filter_bar.pack_start(btn, True, True, 0)
            self.filter_buttons[fid] = btn
            prev = btn
        vbox.pack_start(filter_bar, False, False, 4)

        # Lista
        scrolled = Gtk.ScrolledWindow()
        scrolled.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC)
        vbox.pack_start(scrolled, True, True, 0)

        self.listbox = Gtk.ListBox()
        self.listbox.get_style_context().add_class("cm-list")
        self.listbox.set_selection_mode(Gtk.SelectionMode.SINGLE)
        self.listbox.connect("row-activated", self._on_row_activated)
        scrolled.add(self.listbox)

        # Rodapé
        footer = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=6)
        footer.get_style_context().add_class("cm-footer")
        lbl = Gtk.Label(label="Enter para copiar  ·  Esc para fechar")
        lbl.get_style_context().add_class("cm-footer-hint")
        lbl.set_xalign(0)
        footer.pack_start(lbl, True, True, 0)
        btn_clear = Gtk.Button(label="Limpar")
        btn_clear.get_style_context().add_class("cm-clear-btn")
        btn_clear.connect("clicked", lambda _: self._clear_all())
        footer.pack_end(btn_clear, False, False, 0)
        vbox.pack_start(footer, False, False, 0)

        self.connect("key-press-event", self._on_key_press)
        self.connect("delete-event", self._on_delete_event)

    def _build_headerbar(self):
        header = Gtk.HeaderBar()
        header.set_show_close_button(True)
        header.get_style_context().add_class("cm-header")

        title_box = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=8)
        if ICON_FULLCOLOR:
            try:
                pixbuf = GdkPixbuf.Pixbuf.new_from_file_at_size(ICON_FULLCOLOR, 22, 22)
                title_box.pack_start(Gtk.Image.new_from_pixbuf(pixbuf), False, False, 0)
            except GLib.Error:
                pass
        text_box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=0)
        title_lbl = Gtk.Label(label="ClipMaster")
        title_lbl.get_style_context().add_class("cm-title")
        title_lbl.set_xalign(0)
        subtitle_lbl = Gtk.Label(label="Super + C")
        subtitle_lbl.get_style_context().add_class("cm-subtitle")
        subtitle_lbl.set_xalign(0)
        text_box.pack_start(title_lbl, False, False, 0)
        text_box.pack_start(subtitle_lbl, False, False, 0)
        title_box.pack_start(text_box, False, False, 0)
        header.set_custom_title(title_box)

        settings_btn = Gtk.Button(label="⚙")
        settings_btn.get_style_context().add_class("cm-icon-btn")
        settings_btn.set_tooltip_text("Configurações")
        settings_btn.connect("clicked", lambda _: self.open_settings())
        header.pack_end(settings_btn)

        self.set_titlebar(header)

    def open_settings(self):
        dialog = SettingsDialog(self, on_apply=self._on_settings_applied)
        dialog.run_and_apply()

    def _on_settings_applied(self, cfg):
        apply_style(cfg["theme"], cfg["accent"])
        set_indicator_enabled(self, cfg["display_mode"] == "tray")
        self.refresh_list()

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
        box.set_margin_top(6)
        box.set_margin_bottom(6)
        box.set_margin_start(10)
        box.set_margin_end(6)

        itype = item["type"]
        icons = {"text": "\U0001F4C4", "link": "\U0001F517", "image": "\U0001F5BC️"}
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
            lbl.get_style_context().add_class("cm-item-text")
            lbl.set_xalign(0)
            box.pack_start(lbl, True, True, 0)
        else:
            if item["sensitive"]:
                preview = "\U0001F512   ••••••••"
            else:
                preview = item["content"].strip().replace("\n", " ")
                if len(preview) > 58:
                    preview = preview[:55] + "…"
            lbl = Gtk.Label(label=preview)
            lbl.get_style_context().add_class("cm-item-text")
            lbl.set_xalign(0)
            box.pack_start(lbl, True, True, 0)

        # Cadeado para marcar como senha/sensível
        lock = Gtk.ToggleButton(label="\U0001F512" if item["sensitive"] else "\U0001F513")
        lock.set_active(item["sensitive"])
        lock.set_relief(Gtk.ReliefStyle.NONE)
        lock.get_style_context().add_class("cm-lock-btn")
        lock.set_tooltip_text("Marcar como senha (oculta o conteúdo)")
        lock.connect("toggled", self._on_lock_toggled, item)
        box.pack_end(lock, False, False, 0)

        row.add(box)
        row.item = item
        return row

    def _on_lock_toggled(self, btn, item):
        item["sensitive"] = btn.get_active()
        btn.set_label("\U0001F512" if item["sensitive"] else "\U0001F513")
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
        _add_item({"type": itype, "content": text, "sensitive": CONFIG["mask_new_items"]}, win)

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
    max_history = CONFIG.get("max_history", 50)
    if len(HISTORY) > max_history:
        del HISTORY[max_history:]

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
# Indicador de bandeja (AppIndicator / Ayatana)
# ---------------------------------------------------------------------------

def set_indicator_enabled(win, enabled):
    if enabled and INDICATOR_BACKEND and win.indicator is None:
        win.indicator = _create_indicator(win)
        win.set_skip_taskbar_hint(True)
        win.set_skip_pager_hint(True)
    elif not enabled and win.indicator is not None:
        win.indicator.set_status(AppIndicator3.IndicatorStatus.PASSIVE)
        win.indicator = None
        win.set_skip_taskbar_hint(False)
        win.set_skip_pager_hint(False)


def _create_indicator(win):
    icon_name = "clipmaster-symbolic" if ICON_SYMBOLIC else "edit-paste-symbolic"
    indicator = AppIndicator3.Indicator.new(
        "clipmaster", icon_name, AppIndicator3.IndicatorCategory.APPLICATION_STATUS
    )
    indicator.set_status(AppIndicator3.IndicatorStatus.ACTIVE)
    indicator.set_title("ClipMaster")

    menu = Gtk.Menu()

    item_toggle = Gtk.MenuItem(label="Mostrar/Ocultar Histórico")
    item_toggle.connect("activate", lambda _: toggle_window(win))
    menu.append(item_toggle)

    menu.append(Gtk.SeparatorMenuItem())

    item_settings = Gtk.MenuItem(label="Configurações")
    item_settings.connect("activate", lambda _: win.open_settings())
    menu.append(item_settings)

    menu.append(Gtk.SeparatorMenuItem())

    item_quit = Gtk.MenuItem(label="Sair")
    item_quit.connect("activate", lambda _: Gtk.main_quit())
    menu.append(item_quit)

    menu.show_all()
    indicator.set_menu(menu)
    return indicator


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

    GLib.set_prgname("clipmaster")
    Gtk.init(sys.argv)
    register_icon_theme_path()
    apply_style(CONFIG["theme"], CONFIG["accent"])

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
        set_indicator_enabled(win, CONFIG["display_mode"] == "tray")
        return False
    GLib.idle_add(init_win)

    setup_clipboard_monitor(win)

    print("✓ ClipMaster iniciado. Pressione Super+C para abrir o histórico.")
    Gtk.main()


if __name__ == "__main__":
    main()
