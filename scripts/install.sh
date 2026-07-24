#!/usr/bin/env bash
# Script de Instalação Automática do ClipMaster Ubuntu
# Repositório: https://github.com/itsbravos/ClipMaster-for-Linux

set -e

echo "=========================================="
echo "  Instalador ClipMaster Ubuntu (Super+C)  "
echo "=========================================="

# 1. Instala dependências
echo "[1/4] Instalando dependências de sistema..."
sudo apt update -qq
sudo apt install -y python3-gi gir1.2-gtk-3.0 xclip -qq

# 2. Baixa o daemon
echo "[2/4] Baixando clipmaster para ~/.local/bin/clipmaster..."
mkdir -p ~/.local/bin
curl -fsSL https://raw.githubusercontent.com/itsbravos/ClipMaster-for-Linux/main/scripts/clipmaster.py -o ~/.local/bin/clipmaster
chmod +x ~/.local/bin/clipmaster

# Remove serviço systemd antigo, se existir (evita conflito com versões anteriores)
if systemctl --user is-active --quiet clipmaster.service 2>/dev/null; then
  systemctl --user disable --now clipmaster.service 2>/dev/null || true
fi
rm -f ~/.config/systemd/user/clipmaster.service

# 3. Configura autostart via XDG (herda DISPLAY/WAYLAND_DISPLAY da sessão)
echo "[3/4] Configurando inicialização automática..."
mkdir -p ~/.config/autostart

cat > ~/.config/autostart/clipmaster.desktop << EOF
[Desktop Entry]
Type=Application
Name=ClipMaster
Comment=Clipboard History Manager
Exec=$HOME/.local/bin/clipmaster
Hidden=false
NoDisplay=true
X-GNOME-Autostart-enabled=true
EOF

# Para o daemon caso já esteja rodando e inicia a nova versão
pkill -x clipmaster 2>/dev/null || true
sleep 0.5
nohup "$HOME/.local/bin/clipmaster" > /tmp/clipmaster.log 2>&1 &

# 4. Configura atalho Super+C no GNOME
echo "[4/4] Configurando atalho Super+C no GNOME..."
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
echo "Log em: /tmp/clipmaster.log"
