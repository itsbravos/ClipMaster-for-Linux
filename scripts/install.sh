#!/usr/bin/env bash
# Script de Instalação Automática do ClipMaster Ubuntu
# Repositório: https://github.com/itsbravos/ClipMaster-for-Linux

set -e

RAW_BASE="https://raw.githubusercontent.com/itsbravos/ClipMaster-for-Linux/main"

# Se o script estiver rodando de dentro de um clone local do repositório
# (ex.: `bash scripts/install.sh` a partir da pasta do projeto), usa os
# arquivos locais em vez de baixar do GitHub — útil para testar mudanças
# antes de publicar.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(dirname "$SCRIPT_DIR")"
if [[ -f "$REPO_DIR/scripts/clipmaster.py" && -f "$REPO_DIR/assets/icons/clipmaster.svg" ]]; then
  LOCAL_MODE=1
else
  LOCAL_MODE=0
fi

fetch() {
  # fetch <caminho-relativo-no-repo> <destino>
  if [[ "$LOCAL_MODE" == "1" ]]; then
    cp "$REPO_DIR/$1" "$2"
  else
    curl -fsSL "$RAW_BASE/$1" -o "$2"
  fi
}

echo "=========================================="
echo "  Instalador ClipMaster Ubuntu (Super+C)  "
echo "=========================================="

# 1. Instala dependências
echo "[1/6] Instalando dependências de sistema..."
sudo apt update -qq
sudo apt install -y python3-gi gir1.2-gtk-3.0 -qq

# Suporte a ícone na bandeja do sistema (opcional, não trava a instalação se faltar)
sudo apt install -y gir1.2-ayatanaappindicator3-0.1 -qq \
  || sudo apt install -y gir1.2-appindicator3-0.1 -qq \
  || echo "  ! Bandeja do sistema indisponível neste repositório (o app funciona normalmente sem ela)."

# 2. Baixa o daemon
echo "[2/6] Instalando clipmaster em ~/.local/bin/clipmaster..."
mkdir -p ~/.local/bin
fetch "scripts/clipmaster.py" ~/.local/bin/clipmaster
chmod +x ~/.local/bin/clipmaster

# 3. Instala os ícones no tema de ícones do usuário
echo "[3/6] Instalando ícones..."
mkdir -p ~/.local/share/icons/hicolor/scalable/apps
mkdir -p ~/.local/share/icons/hicolor/symbolic/apps
fetch "assets/icons/clipmaster.svg" ~/.local/share/icons/hicolor/scalable/apps/clipmaster.svg
fetch "assets/icons/clipmaster-symbolic.svg" ~/.local/share/icons/hicolor/symbolic/apps/clipmaster-symbolic.svg
gtk-update-icon-cache -f ~/.local/share/icons/hicolor >/dev/null 2>&1 || true

# Remove serviço systemd antigo, se existir (evita conflito com versões anteriores)
if systemctl --user is-active --quiet clipmaster.service 2>/dev/null; then
  systemctl --user disable --now clipmaster.service 2>/dev/null || true
fi
rm -f ~/.config/systemd/user/clipmaster.service

# 4. Cria o atalho no menu de aplicativos (ícone próprio, sem o padrão do Linux)
echo "[4/6] Criando atalho no menu de aplicativos..."
mkdir -p ~/.local/share/applications
cat > ~/.local/share/applications/clipmaster.desktop << EOF
[Desktop Entry]
Type=Application
Name=ClipMaster
Comment=Histórico de Área de Transferência (Super + C)
Exec=$HOME/.local/bin/clipmaster
Icon=clipmaster
Terminal=false
Categories=Utility;
StartupWMClass=clipmaster
EOF
update-desktop-database ~/.local/share/applications >/dev/null 2>&1 || true

# 5. Configura autostart via XDG (herda DISPLAY/WAYLAND_DISPLAY da sessão)
echo "[5/6] Configurando inicialização automática..."
mkdir -p ~/.config/autostart

cat > ~/.config/autostart/clipmaster.desktop << EOF
[Desktop Entry]
Type=Application
Name=ClipMaster
Comment=Clipboard History Manager
Exec=$HOME/.local/bin/clipmaster
Icon=clipmaster
Hidden=false
NoDisplay=true
X-GNOME-Autostart-enabled=true
EOF

# Para o daemon caso já esteja rodando e inicia a nova versão
pkill -f "$HOME/.local/bin/clipmaster" 2>/dev/null || true
sleep 0.5
nohup "$HOME/.local/bin/clipmaster" > /tmp/clipmaster.log 2>&1 &

# 6. Configura atalho Super+C no GNOME
echo "[6/6] Configurando atalho Super+C no GNOME..."
KEY_PATH="/org/gnome/settings-daemon/plugins/media-keys/custom-keybindings/clipmaster/"

gsettings set org.gnome.settings-daemon.plugins.media-keys.custom-keybinding:$KEY_PATH name 'ClipMaster Histórico de Cópia'
gsettings set org.gnome.settings-daemon.plugins.media-keys.custom-keybinding:$KEY_PATH command "$HOME/.local/bin/clipmaster --toggle"
gsettings set org.gnome.settings-daemon.plugins.media-keys.custom-keybinding:$KEY_PATH binding '<Super>c'

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
echo "✨ Concluído! Pressione Super+C para testar."
echo "Clique no ícone ⚙ dentro do histórico para personalizar tema, cor e modo de exibição (bandeja ou taskbar)."
echo "Log em: /tmp/clipmaster.log"
