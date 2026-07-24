# ClipMaster Ubuntu 🐧

> Gerenciador de Histórico de Área de Transferência (Clipboard Manager) de ultrabaixo consumo de memória (~12MB RAM) para **Ubuntu Linux** (X11 e Wayland) com suporte ao atalho **Super + C**.

---

## 📌 Visão Geral

O **ClipMaster** traz para o Ubuntu Linux a praticidade da janela de histórico de cópias estilo Windows, ajustado para evitar conflitos de teclas nas distribuições Linux utilizando o atalho **Super + C** (ou **Ctrl + Alt + C**).

- ⚡ **Ultraleve:** Desenvolvido com daemon em Python 3 e GTK3 nativo do GNOME (~12 MB de RAM e 0% de CPU em repouso).
- 🚀 **Nativo no Ubuntu:** Compatível com Ubuntu 20.04, 22.04 LTS e 24.04 LTS (X11 & Wayland).
- 🔑 **Atalho Sem Conflitos:** Vinculado nativamente ao atalho `Super + C` (`Tecla Windows + C`).
- 🔒 **Privacidade Total:** Armazenamento 100% local e offline. Máscara automática para senhas e tokens sensíveis.

---

## 🛠️ Instalação Rápida no Ubuntu

Abra o terminal do Ubuntu (`Ctrl` + `Alt` + `T`) e execute o comando abaixo para instalar as dependências leves e registrar o serviço em segundo plano:

```bash
sudo apt update && sudo apt install -y python3-gi xclip wl-clipboard libkeybinder-3.0-0 gir1.2-keybinder-3.0
```

### 1. Criar o Executável

Crie o arquivo em `~/.local/bin/clipmaster`:

```bash
mkdir -p ~/.local/bin
curl -sSL https://raw.githubusercontent.com/seu-usuario/clipmaster-ubuntu/main/clipmaster.py -o ~/.local/bin/clipmaster
chmod +x ~/.local/bin/clipmaster
```

### 2. Configurar o Atalho Super + C no GNOME

Execute o comando no terminal para associar a janela de histórico à tecla **Super + C**:

```bash
KEY_PATH="/org/gnome/settings-daemon/plugins/media-keys/custom-keybindings/clipmaster/"

gsettings set org.gnome.settings-daemon.plugins.media-keys.custom-keybinding:$KEY_PATH name 'ClipMaster Histórico'
gsettings set org.gnome.settings-daemon.plugins.media-keys.custom-keybinding:$KEY_PATH command "$HOME/.local/bin/clipmaster --toggle"
gsettings set org.gnome.settings-daemon.plugins.media-keys.custom-keybinding:$KEY_PATH binding '<Super>c'
```

---

## 💻 Recursos e Telas

- **Simulador Interativo Web:** Teste no navegador todas as funcionalidades antes de instalar no sistema.
- **Busca e Filtros:** Pesquise por termos, selecione apenas comandos do terminal, links ou códigos.
- **Fixar no Topo:** Mantenha comandos do terminal (`sudo apt update`, `docker run...`) sempre salvos.
- **Backup JSON:** Exporte e importe seu histórico quando trocar de máquina.

---

## 📄 Licença

Distribuído sob a licença MIT. Sinta-se à vontade para utilizar, modificar e distribuir.
