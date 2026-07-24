#!/usr/bin/env bash
# Script de Instalação Automática do ClipMaster Ubuntu
# Repositório: https://github.com/itsbravos/ClipMaster-for-Linux

set -e

echo "=========================================="
echo "  Instalador ClipMaster Ubuntu (Super+C)  "
echo "=========================================="

# 1. Instala dependências nativas leves
echo "[1/4] Instalando dependências de sistema..."
sudo apt update -qq
sudo apt install -y python3-gi python3-pip xclip wl-clipboard libkeybinder-3.0-0 gir1.2-keybinder-3.0 -qq

# 2. Baixa o daemon do repositório
echo "[2/4] Baixando clipmaster.py para ~/.local/bin/clipmaster..."
mkdir -p ~/.local/bin
curl -fsSL https://raw.githubusercontent.com/itsbravos/ClipMaster-for-Linux/main/scripts/clipmaster.py -o ~/.local/bin/clipmaster
chmod +x ~/.local/bin/clipmaster

# 3. Configura serviço de inicialização automática (systemd user service)
echo "[3/4] Configurando serviço em segundo plano (systemd)..."
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
