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

1. Instala as dependências (`python3-gi`, `gir1.2-gtk-3.0`) e o suporte a bandeja do sistema (`gir1.2-ayatanaappindicator3-0.1`)
2. Instala o `clipmaster.py` em `~/.local/bin/clipmaster` e a logo do app no tema de ícones do usuário
3. Cria o atalho do ClipMaster no menu de aplicativos
4. Configura autostart via XDG para rodar em segundo plano automaticamente
5. Configura o atalho **Super + C** no GNOME

Depois de instalado, pressione `Super + C` para abrir o histórico de cópias.

Se você já tem o repositório clonado localmente, rode `bash scripts/install.sh` de dentro da pasta do projeto — o instalador detecta o clone local e usa os arquivos daqui em vez de baixar do GitHub (útil para testar mudanças antes de publicar).

### Desinstalar

```bash
pkill -x clipmaster
rm -f ~/.local/bin/clipmaster
rm -f ~/.config/autostart/clipmaster.desktop
rm -f ~/.local/share/applications/clipmaster.desktop
rm -f ~/.local/share/icons/hicolor/scalable/apps/clipmaster.svg
rm -f ~/.local/share/icons/hicolor/symbolic/apps/clipmaster-symbolic.svg
rm -rf ~/.config/clipmaster
gsettings set org.gnome.settings-daemon.plugins.media-keys custom-keybindings "[]"
```

---

## 💻 Recursos

- **Ícone próprio:** ClipMaster tem uma logo dedicada (instalada no tema de ícones do usuário), então ele aparece corretamente no menu de aplicativos, no alt-tab e na janela — sem mais ícone genérico do Linux.
- **Texto, Links e Imagens:** Captura e exibe os três tipos de conteúdo com ícones distintos (📄 🔗 🖼️).
- **Filtros por tipo:** Barra com botões para exibir Todos, apenas Texto, apenas Links ou apenas Imagens.
- **Busca:** Pesquise por qualquer termo dentro do histórico em tempo real.
- **Proteção de senhas:** Clique no cadeado 🔓 de qualquer item para mascarar o conteúdo com `••••••••` — o item continua sendo copiado corretamente ao selecionar.
- **Bandeja do sistema ou modo janela:** Escolha se o ClipMaster fica com um ícone fixo na bandeja/topbar (como os indicadores de rede, volume, etc.) ou se aparece como uma janela comum na taskbar. Configurável em tempo real pelo botão ⚙.
- **Aparência personalizável:** Tema claro/escuro e cor de destaque (violeta, ciano, verde, rosa, laranja) ajustáveis pelo diálogo de Configurações — sem precisar editar nada manualmente.
- **Ultraleve:** ~15 MB de RAM e 0% de CPU em repouso.
- **100% local:** Nenhum dado é enviado para a internet.

### 🎨 Personalizando (tema, cor e bandeja/taskbar)

Dentro do histórico (`Super + C`), clique no ícone ⚙ no canto superior direito para abrir as Configurações:

- **Tema:** Escuro ou Claro.
- **Cor de destaque:** escolha entre as 5 cores disponíveis.
- **Modo de exibição:** *Bandeja do sistema* (ícone fixo no topo, como na captura abaixo) ou *Janela padrão* (aparece na taskbar normalmente).
- **Itens máximos no histórico** e **mascaramento automático** de itens recém-copiados.

> O modo bandeja depende do pacote `gir1.2-ayatanaappindicator3-0.1` (instalado automaticamente pelo `install.sh`). Se ele não estiver disponível, o ClipMaster continua funcionando normalmente no modo janela.

---

## 📄 Licença

Distribuído sob a licença MIT. Sinta-se à vontade para utilizar, modificar e distribuir.
