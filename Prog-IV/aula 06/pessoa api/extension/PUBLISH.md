# Publicar a extensão no VS Code Marketplace

## Pré-requisitos

- Conta na [Microsoft](https://marketplace.visualstudio.com/manage)
- Node.js 20+
- `vsce` instalado globalmente

```bash
npm install -g @vscode/vsce
```

---

## 1. Criar uma organização e Personal Access Token (PAT)

1. Acesse [dev.azure.com](https://dev.azure.com) e crie uma organização (ou use uma existente).
2. Vá em **User Settings → Personal Access Tokens → New Token**.
3. Configure:
   - **Scopes:** selecione `Marketplace → Manage`
   - **Expiration:** escolha uma validade adequada
4. Copie o token gerado — ele será exibido apenas uma vez.

---

## 2. Criar um publisher no Marketplace

```bash
vsce create-publisher NOME_DO_PUBLISHER
```

Ou crie pelo site em [marketplace.visualstudio.com/manage](https://marketplace.visualstudio.com/manage/publishers).

O campo `publisher` em `package.json` deve bater com esse nome:

```json
"publisher": "NOME_DO_PUBLISHER"
```

---

## 3. Fazer login com o PAT

```bash
vsce login NOME_DO_PUBLISHER
# cole o PAT quando solicitado
```

---

## 4. Verificar e atualizar o package.json

Antes de publicar, confirme que os campos obrigatórios estão preenchidos:

```json
{
  "name": "codetrack",
  "displayName": "CodeTrack",
  "description": "Records and syncs coding activity for CodeTrack.",
  "version": "0.1.0",
  "publisher": "NOME_DO_PUBLISHER",
  "repository": {
    "type": "git",
    "url": "https://github.com/SEU_USUARIO/codetrack"
  },
  "license": "MIT",
  "icon": "icon.png"
}
```

Itens necessários para aprovação no Marketplace:
- `icon.png` de 128×128 px na raiz da extensão
- `README.md` com descrição da extensão
- `CHANGELOG.md` com o histórico de versões
- Campo `repository` preenchido

---

## 5. Compilar

```bash
cd packages/vscode-extension
npm install
npm run compile
```

---

## 6. Empacotar (opcional — testar antes de publicar)

```bash
vsce package
# gera codetrack-0.1.0.vsix
```

Instale localmente para teste final:
```
Ctrl+Shift+P → "Extensions: Install from VSIX..."
```

---

## 7. Publicar

```bash
vsce publish
```

Para incrementar a versão automaticamente:

```bash
vsce publish patch   # 0.1.0 → 0.1.1
vsce publish minor   # 0.1.0 → 0.2.0
vsce publish major   # 0.1.0 → 1.0.0
```

A publicação pode levar alguns minutos para aparecer no Marketplace.

---

## 8. Atualizar versão já publicada

```bash
# editar o código, depois:
vsce publish patch
```

---

## Referências

- [VS Code Extension Publishing Guide](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
- [vsce CLI reference](https://github.com/microsoft/vscode-vsce)
