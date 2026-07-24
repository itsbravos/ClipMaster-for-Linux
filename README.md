# ClipMaster Ubuntu 🐧

> Gerenciador de Histórico de Área de Transferência (Clipboard Manager) de ultrabaixo consumo de memória (~12MB RAM) para **Ubuntu Linux** (X11 e Wayland) com suporte ao atalho **Super + C**.

---

## 📌 Visão Geral

O **ClipMaster** traz para o Ubuntu Linux a praticidade da janela de histórico de cópias estilo Windows, ajustado para evitar conflitos de teclas nas distribuições Linux utilizando o atalho **Super + C**.

- ⚡ **Ultraleve:** Desenvolvido com daemon em Python 3 e GTK3 nativo do GNOME (~12 MB de RAM e 0% de CPU em repouso).
- 🚀 **Nativo no Ubuntu:** Compatível com Ubuntu 20.04, 22.04 LTS e 24.04 LTS (X11 & Wayland).
- 🔑 **Atalho Sem Conflitos:** Vinculado nativamente ao atalho `Super + C` (`Tecla Windows + C`).
- 🔒 **Privacidade Total:** Armazenamento 100% local e offline. Máscara automática para senhas e tokens sensíveis.

---

## 🛠️ Instalação Rápida no Ubuntu

Abra o terminal do Ubuntu (`Ctrl` + `Alt` + `T`) e execute o comando abaixo para baixar e rodar o instalador automático:

```bash
curl -fsSL https://raw.githubusercontent.com/itsbravos/ClipMaster-for-Linux/main/scripts/install.sh -o install.sh
bash install.sh
```

O instalador cuida de tudo sozinho:

1. Instala as dependências (`python3-gi`, `gir1.2-gtk-3.0`)
2. Baixa o `clipmaster.py` para `~/.local/bin/clipmaster`
3. Configura autostart via XDG para rodar em segundo plano automaticamente
4. Configura o atalho **Super + C** no GNOME

Depois de instalado, pressione `Super + C` para abrir o histórico de cópias.

### Desinstalar

```bash
pkill -x clipmaster
rm -f ~/.local/bin/clipmaster
rm -f ~/.config/autostart/clipmaster.desktop
gsettings set org.gnome.settings-daemon.plugins.media-keys custom-keybindings "[]"
```

---

## 💻 Recursos

- **Texto, Links e Imagens:** Captura e exibe os três tipos de conteúdo com ícones distintos (📄 🔗 🖼️).
- **Filtros por tipo:** Barra com botões para exibir Todos, apenas Texto, apenas Links ou apenas Imagens.
- **Busca:** Pesquise por qualquer termo dentro do histórico em tempo real.
- **Proteção de senhas:** Clique no cadeado 🔓 de qualquer item para mascarar o conteúdo com `••••••••` — o item continua sendo copiado corretamente ao selecionar.
- **Ultraleve:** ~15 MB de RAM e 0% de CPU em repouso.
- **100% local:** Nenhum dado é enviado para a internet.

---

## 📄 Licença

Distribuído sob a licença MIT. Sinta-se à vontade para utilizar, modificar e distribuir.
