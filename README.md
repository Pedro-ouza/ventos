# Ventos Trade Dashboard

Este projeto está 100% pronto para ser hospedado no **Render** ou no **Cloudflare Pages**. 
Ele foi construído em arquitetura estática (Client-side Rendering nativo) e não requer Node.js, Python ou bancos de dados em nuvem, rodando diretamente no navegador do usuário.

## Como fazer o Deploy

### Opção 1: Cloudflare Pages (Mais fácil e rápido)
1. Crie uma conta no [Cloudflare](https://dash.cloudflare.com/) e acesse a aba **"Workers & Pages"**.
2. Clique em **"Create Application"** > **"Pages"** > **"Connect to Git"**.
3. Selecione este repositório (`Pedro-ouza/ventos`).
4. Clique em **"Save and Deploy"** (não precisa configurar build command).

### Opção 2: Render
1. Acesse o [Render](https://render.com/), clique em **"New +"** e escolha **"Static Site"**.
2. Conecte este repositório do GitHub (`Pedro-ouza/ventos`).
3. Em **Build Command**, deixe em branco.
4. Em **Publish Directory**, deixe `.` (um ponto, indicando a raiz).
5. Clique em **"Create Static Site"**.

## Observações Técnicas
- O arquivo principal foi nomeado `index.html`, o que é o padrão exigido por servidores web para carregar a página inicial.
- Os arquivos CSVs (dados) são carregados sob demanda e decodificados em tempo real via JavaScript.
- Para atualizar os dados no futuro, basta substituir os arquivos `.csv` neste repositório e realizar um novo commit.