# Ventos Trade Dashboard

Este projeto está 100% pronto para ser hospedado no **Render** ou no **Cloudflare Pages**. 
Ele foi construído em arquitetura estática (Client-side Rendering nativo) e não requer Node.js, Python ou bancos de dados em nuvem, rodando diretamente no navegador do usuário.

## Como fazer o Deploy

### Opção 1: Cloudflare Pages (Mais fácil e rápido)
1. Crie uma conta no [Cloudflare](https://dash.cloudflare.com/) e acesse a aba **"Workers & Pages"**.
2. Clique em **"Create Application"** > **"Pages"** > **"Upload assets"**.
3. Arraste e solte esta pasta inteira (`ventos-dashboard`) para a área de upload.
4. O Cloudflare vai gerar um link automaticamente (ex: `ventos-dashboard.pages.dev`). Seu painel estará no ar!

### Opção 2: Render
1. Suba esta pasta (`ventos-dashboard`) para um repositório no GitHub.
2. Acesse o [Render](https://render.com/), clique em **"New +"** e escolha **"Static Site"**.
3. Conecte o seu repositório do GitHub.
4. Em **Build Command**, deixe em branco (ou digite espaço).
5. Em **Publish Directory**, deixe `.` (um ponto, indicando a raiz, ou o nome da pasta se estiver dentro de outro repositório).
6. Clique em **"Create Static Site"**.

## Observações Técnicas
- O arquivo principal foi renomeado de `dashboard.html` para `index.html`, o que é o padrão exigido por servidores web para carregar a página inicial.
- Os arquivos CSVs (dados) são carregados sob demanda e decodificados em tempo real via JavaScript.
- Para atualizar os dados no futuro, basta substituir os arquivos `.csv` nesta mesma pasta e realizar um novo deploy.
