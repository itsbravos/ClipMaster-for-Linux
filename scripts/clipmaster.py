#!/usr/bin/env python3
"""
ClipMaster Ubuntu - Daemon de Histórico de Área de Transferência
Consumo de RAM: ~15MB | Nível de CPU: 0% em repouso
Atalho Padrão: Super + C (personalizável na aba de Configurações)
Funciona em Ubuntu 20.04, 22.04, 24.04 (Wayland & X11)
"""

import sys
import os
import re
import json
import shutil
import signal
import subprocess
import time
from datetime import date
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
    ("Azul", "#3F9DFD"),
    ("Violeta", "#B9A3F5"),
    ("Verde", "#5EC281"),
    ("Vermelho", "#EF7267"),
    ("Amarelo", "#FBCD4E"),
]

# Atalhos pré-definidos (formato de acelerador do GTK/GNOME: <Super>c, <Control><Alt>v, ...)
SHORTCUT_PRESETS = [
    ("Super + C", "<Super>c"),
    ("Super + V", "<Super>v"),
    ("Ctrl + Alt + V", "<Control><Alt>v"),
    ("Ctrl + Shift + V", "<Control><Shift>v"),
    ("Super + Shift + C", "<Super><Shift>c"),
]
DEFAULT_SHORTCUT = "<Super>c"

DEFAULT_CONFIG = {
    "theme": "dark",              # "dark" | "light"
    "accent": "#3F9DFD",
    "display_mode": "tray" if INDICATOR_BACKEND else "window",  # "tray" | "window"
    "max_history": 50,
    "mask_new_items": False,
    "shortcut": DEFAULT_SHORTCUT,  # acelerador GTK usado como atalho global
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


# ---------------------------------------------------------------------------
# Persistência do histórico (~/.local/share/clipmaster/history.json)
# Só texto/link são salvos — imagens (Pixbuf) não têm representação JSON
# simples sem custo extra de base64, e são o conteúdo mais efêmero mesmo.
# ---------------------------------------------------------------------------

HISTORY_DIR = os.path.dirname(PID_FILE)
HISTORY_FILE = os.path.join(HISTORY_DIR, "history.json")


def load_history():
    try:
        with open(HISTORY_FILE, encoding="utf-8") as f:
            data = json.load(f)
        if not isinstance(data, list):
            return []
        result = []
        for entry in data:
            if not isinstance(entry, dict):
                continue
            itype = entry.get("type")
            content = entry.get("content")
            if itype not in ("text", "link") or not isinstance(content, str):
                continue
            result.append({"type": itype, "content": content, "sensitive": bool(entry.get("sensitive"))})
        return result
    except (FileNotFoundError, json.JSONDecodeError):
        return []


def save_history():
    try:
        os.makedirs(HISTORY_DIR, exist_ok=True)
        data = [
            {"type": i["type"], "content": i["content"], "sensitive": i["sensitive"]}
            for i in HISTORY if i["type"] in ("text", "link")
        ]
        with open(HISTORY_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
    except OSError:
        pass


CONFIG = load_config()
HISTORY[:] = load_history()


# ---------------------------------------------------------------------------
# Atalho global (registrado como custom keybinding do GNOME)
# ---------------------------------------------------------------------------

GSETTINGS_SCHEMA = "org.gnome.settings-daemon.plugins.media-keys.custom-keybinding"
GSETTINGS_KEY_PATH = "/org/gnome/settings-daemon/plugins/media-keys/custom-keybindings/clipmaster/"


def accel_label(accel):
    """Converte um acelerador GTK (ex: '<Super>c') em um rótulo legível (ex: 'Super+C')."""
    try:
        keyval, mods = Gtk.accelerator_parse(accel)
        if keyval == 0:
            return accel
        return Gtk.accelerator_get_label(keyval, mods)
    except Exception:
        return accel


def apply_shortcut(accel):
    """Registra `accel` como o atalho global do ClipMaster via gsettings (GNOME)."""
    if not shutil.which("gsettings"):
        return False
    binding_cmd = f"{os.path.expanduser('~/.local/bin/clipmaster')} --toggle"
    try:
        schema_path = f"{GSETTINGS_SCHEMA}:{GSETTINGS_KEY_PATH}"
        checks = [
            subprocess.run(["gsettings", "set", schema_path, "name", "ClipMaster Histórico de Cópia"],
                            capture_output=True),
            subprocess.run(["gsettings", "set", schema_path, "command", binding_cmd],
                            capture_output=True),
            subprocess.run(["gsettings", "set", schema_path, "binding", accel],
                            capture_output=True),
        ]
        if any(c.returncode != 0 for c in checks):
            return False

        result = subprocess.run(
            ["gsettings", "get", "org.gnome.settings-daemon.plugins.media-keys", "custom-keybindings"],
            capture_output=True, text=True
        )
        current = result.stdout.strip()
        if GSETTINGS_KEY_PATH not in current:
            if current in ("@as []", "[]", ""):
                new_bindings = f"['{GSETTINGS_KEY_PATH}']"
            else:
                new_bindings = current[:-1] + f", '{GSETTINGS_KEY_PATH}']"
            subprocess.run(
                ["gsettings", "set", "org.gnome.settings-daemon.plugins.media-keys",
                 "custom-keybindings", new_bindings],
                capture_output=True
            )
        return True
    except Exception:
        return False


def _parse_gsettings_array(s):
    """Converte a saída de `gsettings get ... custom-keybindings` (ex:
    "['/path/']" ou "@as []") numa lista Python de strings."""
    s = s.strip()
    if s in ("@as []", "[]", ""):
        return []
    if s.startswith("["):
        s = s[1:]
    if s.endswith("]"):
        s = s[:-1]
    return [p.strip().strip("'\"") for p in s.split(",") if p.strip()]


def remove_shortcut_keybinding():
    """Remove só o keybinding do ClipMaster da lista de atalhos custom do
    GNOME, preservando os outros atalhos personalizados que o usuário já
    tinha (diferente do `gsettings set ... "[]"` documentado no README, que
    zerava todos os atalhos customizados do usuário)."""
    if not shutil.which("gsettings"):
        return False
    try:
        result = subprocess.run(
            ["gsettings", "get", "org.gnome.settings-daemon.plugins.media-keys", "custom-keybindings"],
            capture_output=True, text=True
        )
        remaining = [p for p in _parse_gsettings_array(result.stdout) if p != GSETTINGS_KEY_PATH]
        new_value = "[" + ", ".join(f"'{p}'" for p in remaining) + "]" if remaining else "@as []"
        subprocess.run(
            ["gsettings", "set", "org.gnome.settings-daemon.plugins.media-keys",
             "custom-keybindings", new_value],
            capture_output=True
        )
        subprocess.run(
            ["gsettings", "reset-recursively", f"{GSETTINGS_SCHEMA}:{GSETTINGS_KEY_PATH}"],
            capture_output=True
        )
        return True
    except Exception:
        return False


# ---------------------------------------------------------------------------
# Desinstalação (aba Sobre)
# ---------------------------------------------------------------------------

INSTALL_CURL_CMD = (
    "curl -fsSL https://raw.githubusercontent.com/itsbravos/"
    "ClipMaster-for-Linux/main/scripts/install.sh -o install.sh && bash install.sh"
)


def perform_uninstall():
    """Remove tudo que o install.sh criou. Apaga o binário por último — é
    seguro apagar o próprio script em execução no Linux (unlink só remove a
    entrada do diretório; o Python já carregou o bytecode em memória e não
    relê o arquivo durante a execução) — feito por último só para que, se
    algum passo anterior falhar, o "está instalado" só suma depois que o
    resto já foi de fato limpo."""
    errors = []

    def _try_remove(path):
        try:
            if os.path.isfile(path) or os.path.islink(path):
                os.remove(path)
        except OSError as e:
            errors.append(f"{path}: {e}")

    if not remove_shortcut_keybinding():
        errors.append("Não foi possível remover o atalho de teclado do GNOME (gsettings).")

    _try_remove(os.path.expanduser("~/.local/share/applications/clipmaster.desktop"))
    _try_remove(os.path.expanduser("~/.config/autostart/clipmaster.desktop"))
    _try_remove(os.path.expanduser("~/.local/share/icons/hicolor/scalable/apps/clipmaster.svg"))
    _try_remove(os.path.expanduser("~/.local/share/icons/hicolor/symbolic/apps/clipmaster-symbolic.svg"))

    try:
        shutil.rmtree(CONFIG_DIR, ignore_errors=True)
    except OSError as e:
        errors.append(f"{CONFIG_DIR}: {e}")

    try:
        shutil.rmtree(HISTORY_DIR, ignore_errors=True)
    except OSError as e:
        errors.append(f"{HISTORY_DIR}: {e}")

    _try_remove(os.path.expanduser("~/.local/bin/clipmaster"))

    return (len(errors) == 0, errors)


# ---------------------------------------------------------------------------
# Métricas reais de RAM/CPU (aba Estatísticas)
# ---------------------------------------------------------------------------

CLK_TCK = os.sysconf("SC_CLK_TCK")


def read_proc_rss_mb():
    try:
        with open("/proc/self/status") as f:
            for line in f:
                if line.startswith("VmRSS:"):
                    return int(line.split()[1]) / 1024.0
    except OSError:
        pass
    return 0.0


def read_proc_cpu_ticks():
    try:
        with open("/proc/self/stat") as f:
            content = f.read()
        # O campo "comm" (2º campo) pode ter espaços/parênteses — separa
        # depois do último ")" em vez de um split ingênuo na linha toda.
        fields = content.rsplit(")", 1)[-1].split()
        utime, stime = int(fields[11]), int(fields[12])  # utime=campo14, stime=campo15 (1-indexado)
        return utime + stime
    except (OSError, IndexError, ValueError):
        return 0


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
    # Paleta "neobrutalista" (mesma referência visual do app web: bordas
    # grossas pretas/cream, sombra offset tipo cartoon, creme/azul/amarelo
    # no claro e navy no escuro). O `accent` do usuário tinge apenas os
    # elementos interativos (busca em foco, item selecionado, scrollbar).
    dark = theme != "light"
    if dark:
        bg = "#191B24"          # night
        bg_soft = "#22242F"     # night-soft
        card = "#23252F"        # night-card
        ink = "#F3EFE3"         # paper (texto/borda no escuro)
        item_bg = "rgba(35,37,47,0.65)"
        border_strong = "rgba(243,239,227,0.85)"
        border_soft = "rgba(243,239,227,0.25)"
        muted = "rgba(243,239,227,0.6)"
        shadow = "rgba(0,0,0,0.55)"
    else:
        bg = "#FDF6E8"          # cream
        bg_soft = "#F6ECD6"     # cream-soft
        card = "#FFFAF0"        # cream-card
        ink = "#1B1A17"
        item_bg = "rgba(255,250,240,0.65)"
        border_strong = "rgba(27,26,23,0.92)"
        border_soft = "rgba(27,26,23,0.25)"
        muted = "rgba(27,26,23,0.6)"
        shadow = "rgba(27,26,23,0.9)"

    yellow = "#FBCD4E"
    red = "#EF7267"
    on_accent = "#1B1A17"  # texto sempre escuro sobre badges/pills coloridos
    row_hover = hex_to_rgba(accent, 0.14)

    sh1 = f"2px 2px 0 0 {shadow}"
    sh2 = f"3px 3px 0 0 {shadow}"

    # Bloco do comando de instalação — segue o tema (antes ficava sempre
    # escuro tipo terminal, até no claro, o que destoava do resto da página).
    install_bg = card
    install_text = "#7AD39C" if dark else "#2F7D4F"

    return f"""
    window.cm-root, dialog {{
        background-color: {bg};
        color: {ink};
        font-family: "Ubuntu", sans-serif;
    }}

    headerbar.cm-header {{
        background: {bg_soft};
        border-bottom: 3px solid {border_strong};
        box-shadow: none;
        min-height: 46px;
        padding: 0 8px;
    }}

    headerbar.cm-header label.cm-title {{
        font-weight: 800;
        font-size: 1.15em;
        letter-spacing: 0.01em;
        color: {ink};
    }}

    headerbar.cm-header label.cm-subtitle {{
        font-size: 0.76em;
        font-weight: 700;
        color: {accent};
    }}

    /* Botões nativos de janela (fechar/minimizar/maximizar) na mesma
       linguagem visual: quadrados com borda grossa em vez do padrão do SO. */
    headerbar.cm-header button.titlebutton {{
        background: {card};
        border: 2px solid {border_strong};
        border-radius: 8px;
        min-width: 20px;
        min-height: 20px;
        margin: 2px;
        box-shadow: {sh1};
        color: {ink};
    }}
    headerbar.cm-header button.titlebutton:hover {{
        background: {yellow};
    }}
    headerbar.cm-header button.titlebutton.close:hover {{
        background: {red};
    }}

    /* Barra de abas (nível de navegação principal — Histórico/Sobre/
       Config./Stats — visualmente distinta dos pills de filtro de conteúdo). */
    box.cm-tabbar {{
        background: {bg_soft};
        border-bottom: 3px solid {border_strong};
        padding: 6px 8px;
    }}
    .cm-tab-btn {{
        background-color: transparent;
        background-image: none;
        border: 2px solid transparent;
        border-radius: 10px;
        padding: 6px 8px;
        margin: 0 2px;
        color: {muted};
        font-weight: 800;
        font-size: 0.82em;
    }}
    .cm-tab-btn:checked, .cm-tab-btn:active {{
        background-color: {accent};
        background-image: none;
        border-color: {border_strong};
        color: {on_accent};
        box-shadow: {sh1};
    }}
    .cm-tab-btn:hover {{
        border-color: {accent};
        color: {ink};
    }}

    button.cm-icon-btn {{
        background: {card};
        border: 2px solid {border_strong};
        border-radius: 8px;
        padding: 3px 5px;
        color: {ink};
        box-shadow: {sh1};
    }}
    button.cm-icon-btn:hover {{
        background-color: {yellow};
        color: {on_accent};
        box-shadow: {sh2};
    }}

    button.cm-swatch {{
        box-shadow: {sh1};
    }}
    button.cm-swatch:hover {{
        box-shadow: {sh2};
    }}

    entry.cm-search {{
        background-color: {card};
        border: 3px solid {border_strong};
        border-radius: 12px;
        padding: 8px 12px;
        color: {ink};
        font-weight: 600;
        margin: 10px 10px 6px 10px;
        box-shadow: {sh2};
    }}
    entry.cm-search:focus {{
        border-color: {accent};
    }}

    .cm-filter-btn {{
        background-color: {card};
        background-image: none;
        border: 2px solid {border_strong};
        border-radius: 999px;
        padding: 5px 4px;
        margin: 3px 4px;
        color: {ink};
        font-size: 0.83em;
        font-weight: 800;
        box-shadow: {sh1};
    }}
    .cm-filter-btn:checked, .cm-filter-btn:active {{
        background-color: {accent};
        background-image: none;
        border-color: {border_strong};
        color: {on_accent};
    }}
    .cm-filter-btn:hover {{
        border-color: {accent};
        box-shadow: {sh2};
    }}

    list.cm-list {{
        background-color: {bg};
    }}

    list.cm-list row {{
        border-radius: 12px;
        margin: 4px 8px;
        padding: 2px;
        border: 2px solid {border_strong};
        background-color: {item_bg};
        box-shadow: {sh1};
        transition: all 120ms ease-in-out;
    }}
    list.cm-list row:hover {{
        border-color: {accent};
        background-color: {row_hover};
        box-shadow: {sh2};
    }}
    list.cm-list row:selected {{
        background-color: {card};
        border: 3px solid {border_strong};
        box-shadow: {sh2};
    }}

    label.cm-item-text {{
        color: {ink};
        font-weight: 700;
    }}
    label.cm-item-meta {{
        color: {muted};
        font-size: 0.82em;
    }}

    togglebutton.cm-lock-btn {{
        background: transparent;
        border: none;
        border-radius: 8px;
    }}
    togglebutton.cm-lock-btn:hover {{
        background-color: {yellow};
    }}

    box.cm-footer {{
        border-top: 3px solid {border_strong};
        background-color: {card};
        padding: 8px 12px;
    }}
    label.cm-footer-hint {{
        color: {muted};
        font-size: 0.78em;
        font-weight: 700;
    }}

    button.cm-clear-btn {{
        background-color: {card};
        border: 2px solid {border_strong};
        border-radius: 8px;
        color: {ink};
        font-weight: 800;
        padding: 5px 12px;
        box-shadow: {sh1};
    }}
    button.cm-clear-btn:hover {{
        border-color: {red};
        color: {red};
        box-shadow: {sh2};
    }}

    button.cm-btn-primary {{
        background-color: {accent};
        border: 2px solid {border_strong};
        border-radius: 10px;
        color: {on_accent};
        font-weight: 800;
        padding: 6px 16px;
        box-shadow: {sh1};
    }}
    button.cm-btn-primary:hover {{
        box-shadow: {sh2};
    }}
    button.cm-btn-secondary {{
        background-color: {card};
        border: 2px solid {border_strong};
        border-radius: 10px;
        color: {ink};
        font-weight: 700;
        padding: 6px 16px;
        box-shadow: {sh1};
    }}
    button.cm-btn-secondary:hover {{
        background-color: {yellow};
        box-shadow: {sh2};
    }}
    button.cm-btn-danger {{
        background-color: {red};
        border: 2px solid {border_strong};
        border-radius: 10px;
        color: {on_accent};
        font-weight: 800;
        padding: 6px 16px;
        box-shadow: {sh1};
    }}
    button.cm-btn-danger:hover {{
        background-color: #D85C50;
        box-shadow: {sh2};
    }}

    /* Combobox, spin button e checkbox das Configurações — mesma
       linguagem de borda grossa + preenchimento sólido, com hover. */
    combobox.cm-input button {{
        background-color: {card};
        border: 2px solid {border_strong};
        border-radius: 8px;
        box-shadow: {sh1};
        color: {ink};
        font-weight: 700;
    }}
    combobox.cm-input button:hover {{
        background-color: {yellow};
        box-shadow: {sh2};
    }}

    spinbutton.cm-input {{
        background-color: {card};
        border: 2px solid {border_strong};
        border-radius: 8px;
        box-shadow: {sh1};
        color: {ink};
    }}
    spinbutton.cm-input button {{
        background: transparent;
        color: {ink};
    }}
    spinbutton.cm-input button:hover {{
        background-color: {yellow};
    }}

    checkbutton.cm-check check {{
        border: 2px solid {border_strong};
        border-radius: 5px;
        background-color: {card};
        min-width: 16px;
        min-height: 16px;
    }}
    checkbutton.cm-check check:checked {{
        background-color: {accent};
    }}
    checkbutton.cm-check:hover check {{
        border-color: {accent};
        box-shadow: {sh1};
    }}

    /* Cards de destaque (Baixo Consumo/X11/Segurança) na aba Histórico */
    box.cm-feature-card {{
        background-color: {card};
        border: 2px solid {border_soft};
        border-radius: 10px;
        padding: 6px 8px;
    }}
    label.cm-feature-title {{
        font-weight: 800;
        font-size: 0.78em;
        color: {ink};
    }}
    label.cm-feature-desc {{
        font-size: 0.72em;
        color: {muted};
    }}

    /* Blocos de métrica na aba Estatísticas */
    box.cm-stat-tile {{
        background-color: {card};
        border: 2px solid {border_strong};
        border-radius: 12px;
        padding: 10px 12px;
        box-shadow: {sh1};
    }}
    label.cm-stat-value {{
        font-weight: 900;
        font-size: 1.4em;
        color: {ink};
    }}
    label.cm-stat-label {{
        font-size: 0.72em;
        color: {muted};
        font-weight: 700;
    }}
    progressbar.cm-bar trough {{
        background-color: {bg_soft};
        border: 2px solid {border_soft};
        border-radius: 999px;
        min-height: 10px;
    }}
    progressbar.cm-bar progress {{
        background-color: {accent};
        border-radius: 999px;
    }}

    /* Bloco do comando de instalação, na aba Sobre — acompanha o tema */
    box.cm-install-box {{
        background-color: {install_bg};
        border: 3px solid {border_strong};
        border-radius: 12px;
        padding: 10px 12px;
    }}
    label.cm-install-text {{
        color: {install_text};
        font-family: monospace;
        font-size: 0.8em;
        font-weight: 700;
    }}

    /* Card genérico que agrupa cada seção (Sobre, Configurações, Stats) —
       mesmo padrão do "card-neo" do site: borda grossa + sombra offset. */
    box.cm-card {{
        background-color: {card};
        border: 3px solid {border_strong};
        border-radius: 14px;
        box-shadow: {sh2};
        padding: 12px 14px;
    }}

    scrollbar slider {{
        background-color: {border_strong};
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
# Janela principal — Histórico / Sobre / Configurações / Estatísticas
# ---------------------------------------------------------------------------

TABS = [
    ("history", "📋 Histórico"),
    ("about", "ℹ️ Sobre"),
    ("settings", "⚙️ Config."),
    ("stats", "📊 Stats"),
]


class ClipboardWindow(Gtk.Window):
    def __init__(self):
        super().__init__(title="ClipMaster — Histórico de Cópia (Super+C)")
        self.set_default_size(560, 680)
        self.set_position(Gtk.WindowPosition.CENTER)
        self.set_keep_above(True)
        self.get_style_context().add_class("cm-root")
        self._filter_updating = False
        self.indicator = None
        self._capturing_shortcut = False
        self._cpu_timer_id = None
        self._preset_ids = {accel for _, accel in SHORTCUT_PRESETS}

        if ICON_FULLCOLOR:
            try:
                self.set_icon_from_file(ICON_FULLCOLOR)
            except GLib.Error:
                pass

        self._build_headerbar()

        main_vbox = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=0)
        self.add(main_vbox)

        self.stack = Gtk.Stack()
        self.stack.set_transition_type(Gtk.StackTransitionType.CROSSFADE)
        self.stack.set_transition_duration(100)
        self.stack.set_vexpand(True)

        self.stack.add_titled(self._build_history_page(), "history", "Histórico")
        self.stack.add_titled(self._build_about_page(), "about", "Sobre")
        self.stack.add_titled(self._build_settings_page(), "settings", "Configurações")
        self.stack.add_titled(self._build_stats_page(), "stats", "Estatísticas")

        main_vbox.pack_start(self._build_tabbar(), False, False, 0)
        main_vbox.pack_start(self.stack, True, True, 0)

        self.stack.connect("notify::visible-child-name", self._on_stack_page_changed)
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
        self.subtitle_lbl = Gtk.Label(label=accel_label(CONFIG["shortcut"]))
        self.subtitle_lbl.get_style_context().add_class("cm-subtitle")
        self.subtitle_lbl.set_xalign(0)
        text_box.pack_start(title_lbl, False, False, 0)
        text_box.pack_start(self.subtitle_lbl, False, False, 0)
        title_box.pack_start(text_box, False, False, 0)
        header.set_custom_title(title_box)

        settings_btn = Gtk.Button(label="⚙️")
        settings_btn.get_style_context().add_class("cm-icon-btn")
        settings_btn.set_tooltip_text("Configurações")
        settings_btn.connect("clicked", lambda _: self.show_tab("settings"))
        header.pack_end(settings_btn)

        self.set_titlebar(header)

    # --- Abas ---

    def _build_tabbar(self):
        bar = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=0)
        bar.get_style_context().add_class("cm-tabbar")
        self.tab_buttons = {}
        prev = None
        for tid, label in TABS:
            btn = Gtk.RadioButton.new_with_label_from_widget(prev, label)
            btn.set_mode(False)
            btn.get_style_context().add_class("cm-tab-btn")
            btn.connect("toggled", self._on_tab_toggled, tid)
            bar.pack_start(btn, True, True, 0)
            self.tab_buttons[tid] = btn
            prev = btn
        self.tab_buttons["history"].set_active(True)
        return bar

    def _on_tab_toggled(self, btn, tid):
        if btn.get_active():
            self.stack.set_visible_child_name(tid)

    def show_tab(self, name):
        """Ativa uma aba e garante que a janela esteja visível — usado pelo
        botão de engrenagem e pelo menu da bandeja (diferente do toggle do
        Super+C, aqui nunca esconde a janela se ela já estiver aberta)."""
        if name in self.tab_buttons:
            self.tab_buttons[name].set_active(True)
        self.show_all()
        self.present()

    def _on_stack_page_changed(self, stack, _pspec):
        name = stack.get_visible_child_name()
        if name == "stats":
            self._refresh_stats_static()
            self._start_cpu_sampling()
        else:
            self._stop_cpu_sampling()

    def _section_label(self, text):
        lbl = Gtk.Label(label=text)
        lbl.set_xalign(0)
        lbl.set_markup(f"<b>{GLib.markup_escape_text(text)}</b>")
        return lbl

    def _card_box(self, spacing=8):
        """Card com borda grossa + sombra offset — agrupa cada seção das
        abas Sobre/Configurações/Estatísticas em vez de texto solto na tela."""
        box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=spacing)
        box.get_style_context().add_class("cm-card")
        return box

    # --- Aba: Histórico ---

    def _build_history_page(self):
        page = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=0)

        self.search_entry = Gtk.Entry()
        self.search_entry.set_placeholder_text("Pesquisar no histórico...")
        self.search_entry.get_style_context().add_class("cm-search")
        self.search_entry.connect("changed", lambda _: self.refresh_list())
        page.pack_start(self.search_entry, False, False, 0)

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
        page.pack_start(filter_bar, False, False, 4)

        manual_row = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=6)
        manual_row.set_margin_start(6)
        manual_row.set_margin_end(6)
        manual_row.set_margin_top(2)
        manual_row.set_margin_bottom(2)
        self.manual_entry = Gtk.Entry()
        self.manual_entry.set_placeholder_text("Adicionar item manualmente...")
        self.manual_entry.get_style_context().add_class("cm-search")
        self.manual_entry.connect("activate", self._on_manual_add)
        manual_btn = Gtk.Button(label="+")
        manual_btn.get_style_context().add_class("cm-icon-btn")
        manual_btn.set_tooltip_text("Adicionar à área de transferência e ao histórico")
        manual_btn.connect("clicked", self._on_manual_add)
        manual_row.pack_start(self.manual_entry, True, True, 0)
        manual_row.pack_start(manual_btn, False, False, 0)
        page.pack_start(manual_row, False, False, 0)

        scrolled = Gtk.ScrolledWindow()
        scrolled.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC)
        page.pack_start(scrolled, True, True, 0)

        self.listbox = Gtk.ListBox()
        self.listbox.get_style_context().add_class("cm-list")
        self.listbox.set_selection_mode(Gtk.SelectionMode.SINGLE)
        self.listbox.connect("row-activated", self._on_row_activated)
        scrolled.add(self.listbox)

        feat_row = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=6, homogeneous=True)
        feat_row.set_margin_start(6)
        feat_row.set_margin_end(6)
        feat_row.set_margin_top(4)
        for icon, ftitle, fdesc in [
            ("⚡", "Baixo Consumo", "~15MB RAM · 0% CPU parado"),
            ("🖥", "X11 & Wayland", "GNOME 20.04–24.04 LTS"),
            ("🔒", "Segurança", "100% local, sem nuvem"),
        ]:
            card = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=1)
            card.get_style_context().add_class("cm-feature-card")
            t = Gtk.Label(label=f"{icon} {ftitle}")
            t.get_style_context().add_class("cm-feature-title")
            t.set_xalign(0)
            d = Gtk.Label(label=fdesc)
            d.get_style_context().add_class("cm-feature-desc")
            d.set_xalign(0)
            d.set_line_wrap(True)
            card.pack_start(t, False, False, 0)
            card.pack_start(d, False, False, 0)
            feat_row.pack_start(card, True, True, 0)
        page.pack_start(feat_row, False, False, 6)

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
        page.pack_start(footer, False, False, 0)

        return page

    def _on_manual_add(self, *_args):
        text = self.manual_entry.get_text().strip()
        if not text:
            return
        itype = "link" if LINK_RE.match(text) else "text"
        _add_item({"type": itype, "content": text, "sensitive": False}, self)
        self.manual_entry.set_text("")

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
        save_history()
        self.refresh_list()

    def _on_row_activated(self, listbox, row):
        if row and hasattr(row, "item"):
            restore_clipboard(row.item)
            self.hide()

    def _clear_all(self):
        HISTORY.clear()
        save_history()
        self.refresh_list()

    # --- Aba: Configurações ---

    def _build_settings_page(self):
        outer = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=14)
        outer.set_margin_start(14)
        outer.set_margin_end(14)
        outer.set_margin_top(14)
        outer.set_margin_bottom(14)

        header_card = self._card_box()
        header_row = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=8)
        title = Gtk.Label()
        title.set_markup("<b>Configurações do ClipMaster</b>")
        title.set_xalign(0)
        self.settings_saved_lbl = Gtk.Label(label="✓ Salvo!")
        self.settings_saved_lbl.set_no_show_all(True)
        self.settings_saved_lbl.set_visible(False)
        reset_btn = Gtk.Button(label="Restaurar Padrões")
        reset_btn.get_style_context().add_class("cm-btn-secondary")
        reset_btn.connect("clicked", self._on_reset_defaults_clicked)
        header_row.pack_start(title, True, True, 0)
        header_row.pack_start(self.settings_saved_lbl, False, False, 0)
        header_row.pack_start(reset_btn, False, False, 0)
        header_card.pack_start(header_row, False, False, 0)
        outer.pack_start(header_card, False, False, 0)

        # Aparência (tema + cor de destaque)
        appearance_card = self._card_box()
        appearance_card.pack_start(self._section_label("Aparência"), False, False, 0)

        theme_box = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=8)
        self.theme_combo = Gtk.ComboBoxText()
        self.theme_combo.get_style_context().add_class("cm-input")
        self.theme_combo.append("dark", "Escuro")
        self.theme_combo.append("light", "Claro")
        self.theme_combo.set_active_id(CONFIG["theme"])
        self.theme_combo.connect("changed", self._on_theme_changed)
        theme_box.pack_start(Gtk.Label(label="Tema"), False, False, 0)
        theme_box.pack_end(self.theme_combo, False, False, 0)
        appearance_card.pack_start(theme_box, False, False, 0)

        accent_box = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=6)
        accent_box.pack_start(Gtk.Label(label="Cor de destaque"), False, False, 0)
        swatches = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=4)
        self._selected_accent = CONFIG["accent"]
        self._swatch_buttons = []
        for name, hexcolor in ACCENT_PRESETS:
            sbtn = Gtk.Button()
            sbtn.set_size_request(24, 24)
            sbtn.set_tooltip_text(name)
            sctx = sbtn.get_style_context()
            provider = Gtk.CssProvider()
            sctx.add_provider(provider, Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION)
            sctx.add_class("cm-swatch")
            sbtn.connect("clicked", self._on_accent_clicked, hexcolor, provider)
            self._swatch_buttons.append((sbtn, provider, hexcolor))
            swatches.pack_start(sbtn, False, False, 0)
        accent_box.pack_end(swatches, False, False, 0)
        appearance_card.pack_start(accent_box, False, False, 0)
        self._refresh_swatch_borders()
        outer.pack_start(appearance_card, False, False, 0)

        # Exibição
        display_card = self._card_box()
        display_card.pack_start(self._section_label("Exibição"), False, False, 0)
        display_box = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=8)
        display_box.pack_start(Gtk.Label(label="Modo"), False, False, 0)
        self.display_combo = Gtk.ComboBoxText()
        self.display_combo.get_style_context().add_class("cm-input")
        self.display_combo.append("window", "Janela padrão (aparece na taskbar)")
        if INDICATOR_BACKEND:
            self.display_combo.append("tray", "Bandeja do sistema (ícone no topo)")
        self.display_combo.set_active_id(
            CONFIG["display_mode"] if (CONFIG["display_mode"] != "tray" or INDICATOR_BACKEND) else "window"
        )
        self.display_combo.connect("changed", self._on_display_mode_changed)
        display_box.pack_end(self.display_combo, False, False, 0)
        display_card.pack_start(display_box, False, False, 0)

        if not INDICATOR_BACKEND:
            hint = Gtk.Label(
                label="Bandeja do sistema indisponível. Instale o pacote "
                      "'gir1.2-ayatanaappindicator3-0.1' para habilitar."
            )
            hint.set_line_wrap(True)
            hint.set_xalign(0)
            hint.set_opacity(0.65)
            display_card.pack_start(hint, False, False, 0)
        outer.pack_start(display_card, False, False, 0)

        # Histórico
        history_card = self._card_box()
        history_card.pack_start(self._section_label("Histórico"), False, False, 0)
        max_box = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=8)
        max_box.pack_start(Gtk.Label(label="Itens máximos"), False, False, 0)
        self.max_spin = Gtk.SpinButton.new_with_range(10, MAX_HISTORY_HARD_CAP, 10)
        self.max_spin.get_style_context().add_class("cm-input")
        self.max_spin.set_value(CONFIG["max_history"])
        self.max_spin.connect("value-changed", self._on_max_history_changed)
        max_box.pack_end(self.max_spin, False, False, 0)
        history_card.pack_start(max_box, False, False, 0)

        self.mask_check = Gtk.CheckButton(label="Ocultar automaticamente novos itens copiados")
        self.mask_check.get_style_context().add_class("cm-check")
        self.mask_check.set_active(CONFIG["mask_new_items"])
        self.mask_check.connect("toggled", self._on_mask_toggled)
        history_card.pack_start(self.mask_check, False, False, 0)
        outer.pack_start(history_card, False, False, 0)

        # Atalho de teclado
        shortcut_card = self._card_box()
        shortcut_card.pack_start(self._section_label("Atalho de Teclado"), False, False, 0)

        preset_box = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=8)
        preset_box.pack_start(Gtk.Label(label="Predefinidos"), False, False, 0)
        self.shortcut_combo = Gtk.ComboBoxText()
        self.shortcut_combo.get_style_context().add_class("cm-input")
        for label, accel in SHORTCUT_PRESETS:
            self.shortcut_combo.append(accel, label)
        self.shortcut_combo.append("custom", "Personalizado…")
        self.shortcut_combo.set_active_id(
            CONFIG["shortcut"] if CONFIG["shortcut"] in self._preset_ids else "custom"
        )
        self.shortcut_combo.connect("changed", self._on_shortcut_preset_changed)
        preset_box.pack_end(self.shortcut_combo, False, False, 0)
        shortcut_card.pack_start(preset_box, False, False, 0)

        record_box = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=8)
        record_box.pack_start(Gtk.Label(label="Atual"), False, False, 0)
        self.shortcut_btn = Gtk.Button(label=accel_label(CONFIG["shortcut"]))
        self.shortcut_btn.get_style_context().add_class("cm-btn-secondary")
        self.shortcut_btn.set_tooltip_text("Clique e pressione a nova combinação (ex: Ctrl+Alt+V)")
        self.shortcut_btn.connect("clicked", self._on_record_shortcut_clicked)
        record_box.pack_end(self.shortcut_btn, False, False, 0)
        shortcut_card.pack_start(record_box, False, False, 0)

        self.shortcut_hint = Gtk.Label(
            label="Use pelo menos uma tecla modificadora (Ctrl, Alt, Super ou Shift) + uma tecla."
        )
        self.shortcut_hint.set_line_wrap(True)
        self.shortcut_hint.set_xalign(0)
        self.shortcut_hint.set_opacity(0.65)
        shortcut_card.pack_start(self.shortcut_hint, False, False, 0)

        if not shutil.which("gsettings"):
            gs_hint = Gtk.Label(
                label="'gsettings' não encontrado — o atalho será salvo, mas você precisará "
                      "registrá-lo manualmente nas Configurações de Teclado do sistema."
            )
            gs_hint.set_line_wrap(True)
            gs_hint.set_xalign(0)
            gs_hint.set_opacity(0.65)
            shortcut_card.pack_start(gs_hint, False, False, 0)
        outer.pack_start(shortcut_card, False, False, 0)

        # Backup & Exportação
        backup_card = self._card_box()
        backup_card.pack_start(self._section_label("Backup & Exportação de Histórico"), False, False, 0)
        backup_desc = Gtk.Label(
            label="Exporte seu histórico em JSON para restaurar depois ou migrar de computador. "
                  "Imagens não são incluídas na exportação."
        )
        backup_desc.set_line_wrap(True)
        backup_desc.set_xalign(0)
        backup_desc.get_style_context().add_class("cm-item-meta")
        backup_card.pack_start(backup_desc, False, False, 0)

        backup_row = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=8)
        export_btn = Gtk.Button(label="Exportar JSON")
        export_btn.get_style_context().add_class("cm-btn-primary")
        export_btn.connect("clicked", self._on_export_history_clicked)
        import_btn = Gtk.Button(label="Importar JSON")
        import_btn.get_style_context().add_class("cm-btn-secondary")
        import_btn.connect("clicked", self._on_import_history_clicked)
        backup_row.pack_start(export_btn, False, False, 0)
        backup_row.pack_start(import_btn, False, False, 0)
        backup_card.pack_start(backup_row, False, False, 0)
        outer.pack_start(backup_card, False, False, 0)

        scroller = Gtk.ScrolledWindow()
        scroller.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC)
        scroller.add(outer)
        return scroller

    def _refresh_swatch_borders(self):
        sel_border = "#1B1A17" if CONFIG["theme"] == "light" else "#F3EFE3"
        for b, provider, hc in self._swatch_buttons:
            border = sel_border if hc == CONFIG["accent"] else "transparent"
            provider.load_from_data(
                f"button {{ background-color: {hc}; border-radius: 999px; "
                f"border: 3px solid {border}; }}".encode()
            )

    def _apply_appearance(self):
        apply_style(CONFIG["theme"], CONFIG["accent"])
        self.refresh_list()

    def _flash_saved(self):
        self.settings_saved_lbl.set_visible(True)
        GLib.timeout_add(2000, self._hide_saved_flag)

    def _hide_saved_flag(self):
        self.settings_saved_lbl.set_visible(False)
        return False

    def _show_error(self, msg):
        d = Gtk.MessageDialog(
            transient_for=self, flags=0, message_type=Gtk.MessageType.ERROR,
            buttons=Gtk.ButtonsType.OK, text=msg
        )
        d.run()
        d.destroy()

    def _on_theme_changed(self, combo):
        CONFIG["theme"] = combo.get_active_id() or "dark"
        save_config(CONFIG)
        self._refresh_swatch_borders()
        self._apply_appearance()
        self._flash_saved()

    def _on_accent_clicked(self, btn, hexcolor, _provider):
        self._selected_accent = hexcolor
        CONFIG["accent"] = hexcolor
        save_config(CONFIG)
        self._refresh_swatch_borders()
        self._apply_appearance()
        self._flash_saved()

    def _on_display_mode_changed(self, combo):
        CONFIG["display_mode"] = combo.get_active_id() or "window"
        save_config(CONFIG)
        set_indicator_enabled(self, CONFIG["display_mode"] == "tray")
        self._flash_saved()

    def _on_max_history_changed(self, spin):
        CONFIG["max_history"] = int(spin.get_value())
        save_config(CONFIG)
        if len(HISTORY) > CONFIG["max_history"]:
            del HISTORY[CONFIG["max_history"]:]
            save_history()
        self.refresh_list()
        self._flash_saved()

    def _on_mask_toggled(self, check):
        CONFIG["mask_new_items"] = check.get_active()
        save_config(CONFIG)
        self._flash_saved()

    def _apply_shortcut_value(self, accel):
        self.shortcut_btn.set_label(accel_label(accel))
        CONFIG["shortcut"] = accel
        save_config(CONFIG)
        ok = apply_shortcut(accel)
        self.subtitle_lbl.set_label(accel_label(accel))
        self._flash_saved()
        if not ok:
            self._show_gsettings_warning()

    def _show_gsettings_warning(self):
        warn = Gtk.MessageDialog(
            transient_for=self, flags=0, message_type=Gtk.MessageType.WARNING,
            buttons=Gtk.ButtonsType.OK,
            text="Não foi possível registrar o atalho automaticamente.",
        )
        warn.format_secondary_text(
            "O atalho foi salvo, mas você precisará configurá-lo manualmente nas "
            "Configurações de Teclado do sistema (fora do GNOME)."
        )
        warn.run()
        warn.destroy()

    def _on_shortcut_preset_changed(self, combo):
        active_id = combo.get_active_id()
        if active_id and active_id != "custom":
            self._apply_shortcut_value(active_id)

    def _on_record_shortcut_clicked(self, btn):
        self._capturing_shortcut = True
        btn.set_label("Pressione a combinação… (Esc cancela)")

    def _handle_shortcut_capture(self, event):
        if event.keyval == Gdk.KEY_Escape:
            self._capturing_shortcut = False
            self.shortcut_btn.set_label(accel_label(CONFIG["shortcut"]))
            return True

        if event.is_modifier:
            return True

        mod_mask = Gtk.accelerator_get_default_mod_mask()
        state = event.state & mod_mask

        if state == 0:
            self.shortcut_hint.set_markup(
                "<span foreground='#E45858'>Combine com Ctrl, Alt, Super ou Shift.</span>"
            )
            return True

        if not Gtk.accelerator_valid(event.keyval, state):
            return True

        accel = Gtk.accelerator_name(event.keyval, state)
        is_preset = accel in self._preset_ids
        self.shortcut_combo.set_active_id(accel if is_preset else "custom")
        self.shortcut_hint.set_markup(
            "Use pelo menos uma tecla modificadora (Ctrl, Alt, Super ou Shift) + uma tecla."
        )
        self._capturing_shortcut = False
        if not is_preset:
            # Se for um preset, set_active_id acima já disparou
            # _on_shortcut_preset_changed, que já aplicou — evita aplicar 2x.
            self._apply_shortcut_value(accel)
        return True

    def _on_reset_defaults_clicked(self, btn):
        CONFIG.clear()
        CONFIG.update(dict(DEFAULT_CONFIG))
        save_config(CONFIG)
        apply_shortcut(CONFIG["shortcut"])
        self._apply_appearance()
        set_indicator_enabled(self, CONFIG["display_mode"] == "tray")
        self.theme_combo.set_active_id(CONFIG["theme"])
        self._selected_accent = CONFIG["accent"]
        self._refresh_swatch_borders()
        self.display_combo.set_active_id(CONFIG["display_mode"])
        self.max_spin.set_value(CONFIG["max_history"])
        self.mask_check.set_active(CONFIG["mask_new_items"])
        self.shortcut_combo.set_active_id(CONFIG["shortcut"])
        self.shortcut_btn.set_label(accel_label(CONFIG["shortcut"]))
        self.subtitle_lbl.set_label(accel_label(CONFIG["shortcut"]))
        self._flash_saved()

    def _on_export_history_clicked(self, btn):
        dialog = Gtk.FileChooserNative.new(
            "Exportar Histórico", self, Gtk.FileChooserAction.SAVE, "Salvar", "Cancelar"
        )
        dialog.set_current_name(f"clipmaster-history-{date.today():%Y%m%d}.json")
        dialog.set_do_overwrite_confirmation(True)
        response = dialog.run()
        if response == Gtk.ResponseType.ACCEPT:
            path = dialog.get_filename()
            data = [
                {"type": i["type"], "content": i["content"], "sensitive": i["sensitive"]}
                for i in HISTORY if i["type"] in ("text", "link")
            ]
            try:
                with open(path, "w", encoding="utf-8") as f:
                    json.dump(data, f, indent=2, ensure_ascii=False)
                self._flash_saved()
            except OSError as e:
                self._show_error(f"Não foi possível salvar: {e}")
        dialog.destroy()

    def _on_import_history_clicked(self, btn):
        dialog = Gtk.FileChooserNative.new(
            "Importar Histórico", self, Gtk.FileChooserAction.OPEN, "Abrir", "Cancelar"
        )
        filt = Gtk.FileFilter()
        filt.set_name("JSON")
        filt.add_pattern("*.json")
        dialog.add_filter(filt)
        response = dialog.run()
        if response == Gtk.ResponseType.ACCEPT:
            path = dialog.get_filename()
            try:
                with open(path, encoding="utf-8") as f:
                    data = json.load(f)
                if not isinstance(data, list):
                    raise ValueError("o arquivo não contém uma lista")
                for entry in reversed(data):
                    if not isinstance(entry, dict):
                        continue
                    itype = entry.get("type")
                    content = entry.get("content")
                    if itype not in ("text", "link") or not isinstance(content, str) or not content.strip():
                        continue
                    _add_item(
                        {"type": itype, "content": content, "sensitive": bool(entry.get("sensitive"))},
                        self,
                    )
                self.refresh_list()
                self._flash_saved()
            except (OSError, json.JSONDecodeError, ValueError) as e:
                self._show_error(f"Arquivo inválido: {e}")
        dialog.destroy()

    # --- Aba: Estatísticas ---

    def _build_stats_page(self):
        outer = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=14)
        outer.set_margin_start(14)
        outer.set_margin_end(14)
        outer.set_margin_top(14)
        outer.set_margin_bottom(14)

        title = Gtk.Label()
        title.set_markup("<b>Consumo de Recursos do Sistema</b>")
        title.set_xalign(0)
        outer.pack_start(title, False, False, 0)

        grid = Gtk.Grid(column_spacing=10, row_spacing=10, column_homogeneous=True)
        self.stat_ram_lbl = Gtk.Label(label="—")
        self.stat_cpu_lbl = Gtk.Label(label="0.0 %")
        self.stat_items_lbl = Gtk.Label(label=str(len(HISTORY)))
        self.stat_shortcut_lbl = Gtk.Label(label=accel_label(CONFIG["shortcut"]))
        tiles = [
            ("Uso de RAM", self.stat_ram_lbl),
            ("CPU (só nesta aba)", self.stat_cpu_lbl),
            ("Itens no histórico", self.stat_items_lbl),
            ("Atalho ativo", self.stat_shortcut_lbl),
        ]
        for idx, (label_text, value_lbl) in enumerate(tiles):
            tile = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=2)
            tile.get_style_context().add_class("cm-stat-tile")
            lab = Gtk.Label(label=label_text)
            lab.get_style_context().add_class("cm-stat-label")
            lab.set_xalign(0)
            value_lbl.get_style_context().add_class("cm-stat-value")
            value_lbl.set_xalign(0)
            tile.pack_start(lab, False, False, 0)
            tile.pack_start(value_lbl, False, False, 0)
            grid.attach(tile, idx % 2, idx // 2, 1, 1)
        outer.pack_start(grid, False, False, 0)

        cmp_card = self._card_box(spacing=10)
        cmp_title = Gtk.Label()
        cmp_title.set_markup("<b>Comparativo de RAM no Linux (MB)</b>")
        cmp_title.set_xalign(0)
        cmp_card.pack_start(cmp_title, False, False, 0)

        comparisons = [
            ("ClipMaster (este app)", 0.08, "~12 MB", "#5EC281"),
            ("CopyQ (Qt C++)", 0.18, "~28 MB", "#3F9DFD"),
            ("GPaste (Vala/GNOME)", 0.22, "~35 MB", "#B9A3F5"),
            ("Gerenciadores Electron", 0.90, "~180 MB+", "#EF7267"),
        ]
        for name, frac, value_text, color in comparisons:
            row = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=2)
            head = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL)
            name_lbl = Gtk.Label(label=name)
            name_lbl.set_xalign(0)
            val_lbl = Gtk.Label(label=value_text)
            val_lbl.set_xalign(1)
            head.pack_start(name_lbl, True, True, 0)
            head.pack_start(val_lbl, False, False, 0)
            bar = Gtk.ProgressBar()
            bar.get_style_context().add_class("cm-bar")
            bar.set_fraction(frac)
            bar_provider = Gtk.CssProvider()
            bar_provider.load_from_data(f"progressbar progress {{ background-color: {color}; }}".encode())
            bar.get_style_context().add_provider(bar_provider, Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION)
            row.pack_start(head, False, False, 0)
            row.pack_start(bar, False, False, 0)
            cmp_card.pack_start(row, False, False, 0)
        outer.pack_start(cmp_card, False, False, 0)

        type_card = self._card_box(spacing=10)
        type_title = Gtk.Label()
        type_title.set_markup("<b>Distribuição por Tipo de Conteúdo</b>")
        type_title.set_xalign(0)
        type_card.pack_start(type_title, False, False, 0)

        type_grid = Gtk.Grid(column_spacing=10, row_spacing=10, column_homogeneous=True)
        self.stat_type_text_lbl = Gtk.Label(label="0")
        self.stat_type_link_lbl = Gtk.Label(label="0")
        self.stat_type_image_lbl = Gtk.Label(label="0")
        type_tiles = [
            ("Texto", self.stat_type_text_lbl),
            ("Links", self.stat_type_link_lbl),
            ("Imagens", self.stat_type_image_lbl),
        ]
        for idx, (label_text, value_lbl) in enumerate(type_tiles):
            tile = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=2)
            tile.get_style_context().add_class("cm-stat-tile")
            lab = Gtk.Label(label=label_text)
            lab.get_style_context().add_class("cm-stat-label")
            lab.set_xalign(0)
            value_lbl.get_style_context().add_class("cm-stat-value")
            value_lbl.set_xalign(0)
            tile.pack_start(lab, False, False, 0)
            tile.pack_start(value_lbl, False, False, 0)
            type_grid.attach(tile, idx, 0, 1, 1)
        type_card.pack_start(type_grid, False, False, 0)
        outer.pack_start(type_card, False, False, 0)

        scroller = Gtk.ScrolledWindow()
        scroller.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC)
        scroller.add(outer)
        return scroller

    def _refresh_stats_static(self):
        self.stat_ram_lbl.set_label(f"{read_proc_rss_mb():.1f} MB")
        self.stat_items_lbl.set_label(str(len(HISTORY)))
        self.stat_shortcut_lbl.set_label(accel_label(CONFIG["shortcut"]))
        counts = {"text": 0, "link": 0, "image": 0}
        for item in HISTORY:
            counts[item["type"]] = counts.get(item["type"], 0) + 1
        self.stat_type_text_lbl.set_label(str(counts["text"]))
        self.stat_type_link_lbl.set_label(str(counts["link"]))
        self.stat_type_image_lbl.set_label(str(counts["image"]))

    def _start_cpu_sampling(self):
        self._last_cpu_ticks = read_proc_cpu_ticks()
        self._last_cpu_time = time.monotonic()
        if self._cpu_timer_id is None:
            self._cpu_timer_id = GLib.timeout_add(500, self._sample_cpu)

    def _sample_cpu(self):
        ticks_now = read_proc_cpu_ticks()
        t_now = time.monotonic()
        elapsed = t_now - self._last_cpu_time
        if elapsed > 0 and CLK_TCK > 0:
            pct = max(0.0, 100.0 * (ticks_now - self._last_cpu_ticks) / CLK_TCK / elapsed)
        else:
            pct = 0.0
        self.stat_cpu_lbl.set_label(f"{pct:.1f} %")
        self._last_cpu_ticks = ticks_now
        self._last_cpu_time = t_now
        return True

    def _stop_cpu_sampling(self):
        if self._cpu_timer_id is not None:
            GLib.source_remove(self._cpu_timer_id)
            self._cpu_timer_id = None

    # --- Aba: Sobre ---

    def _build_about_page(self):
        outer = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=14)
        outer.set_margin_start(14)
        outer.set_margin_end(14)
        outer.set_margin_top(14)
        outer.set_margin_bottom(14)

        bin_path = os.path.expanduser("~/.local/bin/clipmaster")

        info_card = self._card_box()
        info_card.pack_start(self._section_label("Sobre esta instalação"), False, False, 0)
        info_grid = Gtk.Grid(column_spacing=10, row_spacing=4)
        display_mode_label = "Bandeja do sistema" if CONFIG["display_mode"] == "tray" else "Janela padrão"
        if CONFIG["display_mode"] == "tray" and not INDICATOR_BACKEND:
            display_mode_label += " (indisponível, usando janela)"
        rows = [
            ("Caminho:", bin_path),
            ("PID do processo:", str(os.getpid())),
            ("Atalho ativo:", accel_label(CONFIG["shortcut"])),
            ("Modo de exibição:", display_mode_label),
            ("RAM atual:", f"{read_proc_rss_mb():.1f} MB"),
        ]
        for i, (k, v) in enumerate(rows):
            klabel = Gtk.Label(label=k)
            klabel.set_xalign(0)
            klabel.get_style_context().add_class("cm-item-meta")
            vlabel = Gtk.Label(label=v)
            vlabel.set_xalign(0)
            vlabel.set_selectable(True)
            info_grid.attach(klabel, 0, i, 1, 1)
            info_grid.attach(vlabel, 1, i, 1, 1)
        info_card.pack_start(info_grid, False, False, 0)
        outer.pack_start(info_card, False, False, 0)

        cmd_card = self._card_box()
        cmd_card.pack_start(self._section_label("Comando de instalação"), False, False, 0)
        cmd_desc = Gtk.Label(label="Útil para reinstalar ou compartilhar com outra máquina.")
        cmd_desc.set_xalign(0)
        cmd_desc.get_style_context().add_class("cm-item-meta")
        cmd_card.pack_start(cmd_desc, False, False, 0)

        install_box = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=8)
        install_box.get_style_context().add_class("cm-install-box")
        cmd_lbl = Gtk.Label(label=INSTALL_CURL_CMD)
        cmd_lbl.get_style_context().add_class("cm-install-text")
        cmd_lbl.set_line_wrap(True)
        cmd_lbl.set_xalign(0)
        cmd_lbl.set_selectable(True)
        self.install_copy_btn = Gtk.Button(label="Copiar")
        self.install_copy_btn.get_style_context().add_class("cm-btn-secondary")
        self.install_copy_btn.connect("clicked", self._on_copy_install_cmd_clicked)
        install_box.pack_start(cmd_lbl, True, True, 0)
        install_box.pack_start(self.install_copy_btn, False, False, 0)
        cmd_card.pack_start(install_box, False, False, 0)
        outer.pack_start(cmd_card, False, False, 0)

        manual_card = self._card_box()
        manual_card.pack_start(
            self._section_label("Atalho manual (caso o automático falhe)"), False, False, 0
        )
        manual_steps = Gtk.Label()
        manual_steps.set_markup(
            "1. Abra as <b>Configurações</b> do sistema.\n"
            "2. Vá em <b>Teclado</b> → <b>Atalhos de Teclado</b>.\n"
            "3. Role até o final e clique em <b>Atalhos Personalizados</b>.\n"
            "4. Clique no botão <b>+</b>.\n"
            "5. Nome: <i>ClipMaster Histórico</i> — Comando: "
            f"<tt>{GLib.markup_escape_text(bin_path)} --toggle</tt>\n"
            "6. Clique em <b>Definir atalho</b> e pressione <b>Super + C</b>."
        )
        manual_steps.set_line_wrap(True)
        manual_steps.set_xalign(0)
        manual_card.pack_start(manual_steps, False, False, 0)
        outer.pack_start(manual_card, False, False, 0)

        danger_card = self._card_box()
        danger_card.pack_start(self._section_label("Zona de risco"), False, False, 0)
        danger_desc = Gtk.Label(
            label="Remove o ClipMaster completamente deste computador: processo, atalho, "
                  "ícones, configurações e histórico salvos."
        )
        danger_desc.set_line_wrap(True)
        danger_desc.set_xalign(0)
        danger_desc.get_style_context().add_class("cm-item-meta")
        danger_card.pack_start(danger_desc, False, False, 0)
        uninstall_btn = Gtk.Button(label="Desinstalar ClipMaster")
        uninstall_btn.get_style_context().add_class("cm-btn-danger")
        uninstall_btn.connect("clicked", self._on_uninstall_clicked)
        danger_card.pack_start(uninstall_btn, False, False, 0)
        outer.pack_start(danger_card, False, False, 0)

        scroller = Gtk.ScrolledWindow()
        scroller.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC)
        scroller.add(outer)
        return scroller

    def _on_copy_install_cmd_clicked(self, btn):
        cb = get_clipboard()
        cb.set_text(INSTALL_CURL_CMD, -1)
        cb.store()
        btn.set_label("Copiado!")
        GLib.timeout_add(1500, self._reset_install_copy_label)

    def _reset_install_copy_label(self):
        self.install_copy_btn.set_label("Copiar")
        return False

    def _on_uninstall_clicked(self, btn):
        bin_path = os.path.expanduser("~/.local/bin/clipmaster")
        confirm = Gtk.MessageDialog(
            transient_for=self, flags=0, message_type=Gtk.MessageType.WARNING,
            buttons=Gtk.ButtonsType.NONE, text="Desinstalar o ClipMaster?"
        )
        confirm.format_secondary_text(
            "Isso vai remover:\n"
            f"• {bin_path}\n"
            "• Atalho no menu de aplicativos e na inicialização automática\n"
            "• Ícones instalados\n"
            "• Configurações e histórico salvos\n"
            "• O atalho de teclado registrado no GNOME\n\n"
            "Essa ação não pode ser desfeita, e o ClipMaster será encerrado."
        )
        confirm.add_button("Cancelar", Gtk.ResponseType.CANCEL)
        danger_btn = confirm.add_button("Desinstalar", Gtk.ResponseType.OK)
        danger_btn.get_style_context().add_class("cm-btn-danger")
        response = confirm.run()
        confirm.destroy()
        if response != Gtk.ResponseType.OK:
            return

        ok, errors = perform_uninstall()

        result = Gtk.MessageDialog(
            transient_for=self, flags=0,
            message_type=Gtk.MessageType.INFO if ok else Gtk.MessageType.ERROR,
            buttons=Gtk.ButtonsType.OK,
            text="ClipMaster foi desinstalado." if ok else "Desinstalação parcial.",
        )
        if errors:
            result.format_secondary_text(
                "Alguns itens não puderam ser removidos automaticamente:\n" + "\n".join(errors)
            )
        result.run()
        result.destroy()
        Gtk.main_quit()

    # --- Janela ---

    def _on_delete_event(self, w, e):
        self._stop_cpu_sampling()
        self.hide()
        return True

    def _on_key_press(self, w, event):
        if self._capturing_shortcut:
            return self._handle_shortcut_capture(event)
        if event.keyval == Gdk.KEY_Escape:
            self._stop_cpu_sampling()
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
    save_history()

    if win.is_visible():
        win.refresh_list()


# ---------------------------------------------------------------------------
# Toggle da janela
# ---------------------------------------------------------------------------

def toggle_window(win):
    if win.is_visible():
        win._stop_cpu_sampling()
        win.hide()
    else:
        win.tab_buttons["history"].set_active(True)
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
    item_settings.connect("activate", lambda _: win.show_tab("settings"))
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

    print(f"✓ ClipMaster iniciado. Pressione {accel_label(CONFIG['shortcut'])} para abrir o histórico.")
    Gtk.main()


if __name__ == "__main__":
    main()
