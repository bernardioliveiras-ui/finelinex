# FINELINE 3D — Atualização complementar v2.2.0 (blog e calculadora)

**O que este arquivo é:** um módulo de integração que corrige os fluxos do blog e fornece uma calculadora funcional para a área administrativa. **Não é uma cópia completa nem um substituto do `FINELINE-2.1.0-BLOG.zip`.** O ZIP 2.1.0 consta da biblioteca histórica, mas não pôde ser copiado para a sessão de edição. Os arquivos de `main` no GitHub também não continham o Worker/LP/Admin correspondentes ao 2.1.0; por segurança, **nenhuma versão existente foi sobrescrita**.

## Conteúdo entregue

- `src/fineline-blog-api.js`: endpoints para Cloudflare Workers/D1. Público lê apenas publicados; POST/PATCH/DELETE e listagem interna exigem autenticação de administrador no backend.
- `migrations/0099_fineline_blog_patch.sql`: tabela **nova** `fineline_blog_posts`, índices e rascunhos/publicação; não apaga tabelas anteriores.
- `public/assets/fineline-blog-public.js` e `.css`: cards/links do blog aparecem automaticamente na LP a cada visita e atualizam a cada 60 s enquanto a aba está visível.
- `admin/blog.fragment.html` + `public/assets/fineline-blog-admin.js`: editor/admin para criar, editar, rascunhar, publicar, retirar, excluir.
- `admin/calculadora.fragment.html` + `public/assets/fineline-admin-calculadora.js` + `public/assets/fineline-calculadora-core.js`: calculadora no painel, sem dependência externa.
- `CALCULADORA-TESTE.html`: demonstração local da calculadora.
- `tests/fineline.test.mjs`: testes de fluxo completo com SQLite equivalente a D1, autorização e cálculos.

## Integração na LP 2.1 existente

### 1. Banco D1

Copiar `migrations/0099_fineline_blog_patch.sql` para as migrações existentes do projeto, ajustando o prefixo **se já houver número 0099**. Aplicar primeiro no ambiente de testes, depois com as ferramentas de migração já usadas pelo projeto; exemplo se o binding se chama DB:

```bash
npx wrangler d1 migrations apply DB --local
# Depois de conferir backup, esquema e ambiente correto:
npx wrangler d1 migrations apply DB --remote
```

**Importante:** a tabela deste módulo é independente. Se o blog 2.1 já salvou artigos em outra tabela, eles NÃO são migrados automaticamente; precisam ser analisados antes de uma migração de dados.

### 2. Worker existente — montar as rotas ANTES de retornar assets

Copiar `src/fineline-blog-api.js` para `src/` do projeto. Dentro do `fetch` do **Worker existente**, antes das rotas genéricas e `env.ASSETS.fetch(request)`, adicionar:

```js
import { handleFinelineBlogApi } from './fineline-blog-api.js';

// DENTRO de async fetch(request, env, ctx), mantendo o código já existente:
const blogResponse = await handleFinelineBlogApi(request, env, ctx, {
  // SUBSTITUA pela validação de sessão JÁ EXISTENTE no seu backend.
  // Verifique no servidor; NUNCA use query string, variável do navegador
  // ou `true` fixo como autorização.
  isAdmin: async (req, env, ctx) => {
    const session = await obterSessaoValidadaExistente(req, env, ctx);
    return session?.role === 'admin';
  }
});
if (blogResponse) return blogResponse;
```

Sem o adaptador de sessão real, o módulo *bloqueia toda leitura e escrita do Admin*, intencionalmente, em vez de permitir publicação anônima. Ajuste o nome e o formato da sessão de acordo com o código da versão 2.1.0.

**Rotas:** `GET /api/fineline/blog`, `GET /api/fineline/blog/:slug`, `GET|POST /api/fineline/admin/blog`, `PATCH|PUT|DELETE /api/fineline/admin/blog/:id`.

### 3. Blog na landing page

Copiar todos os arquivos `public/assets/fineline-*` para `public/assets` (ou equivalente) do site. Inserir no `<head>` da LP:

```html
<link rel="stylesheet" href="/assets/fineline-blog.css">
```

E na posição em que o blog deve aparecer, dentro do `<body>`:

```html
<section id="fineline-blog" aria-label="Blog Fine Line 3D"></section>
<script src="/assets/fineline-blog-public.js" defer></script>
```

O script consulta o D1 via Worker ao abrir a página; mostra somente `published` e atualiza sem precisar modificar manualmente a LP quando um novo artigo é publicado. A listagem pública usa até 100 artigos; o link de artigo mais antigo faz busca individual por slug.

### 4. Editor em Admin → Blog

Inserir o conteúdo de `admin/blog.fragment.html` **dentro da área já protegida por autenticação**. Adicionar à tela/admin layout:

```html
<link rel="stylesheet" href="/assets/fineline-admin-widgets.css">
<script type="module" src="/assets/fineline-blog-admin.js"></script>
```

As requisições usam cookies de mesma origem (`credentials: same-origin`). Se a aplicação autenticar por outro mecanismo, ajuste as requisições JS ao padrão já implementado sem enfraquecer a autorização do Worker. Exponha o editor somente ao perfil `admin`, não ao perfil de atendimento.

### 5. Calculadora em Admin → Calculadora

Inserir `admin/calculadora.fragment.html` **dentro da tela de Admin autenticada**, não na LP pública. Adicionar uma opção de navegação interna "Calculadora" seguindo os controles de acesso da plataforma. No layout Admin:

```html
<link rel="stylesheet" href="/assets/fineline-admin-widgets.css">
<script type="module" src="/assets/fineline-admin-calculadora.js"></script>
```

Campos: filamento utilizado no lote (g), preço por kg, horas de impressão, potência (W), tarifa (R$/kWh), embalagem, extras, mão de obra, perdas, quantidade produzida e margem desejada. Fórmulas:

- Material = (gramas/1.000) × preço/kg × (1 + perdas%).
- Energia = (W/1.000) × horas × R$/kWh.
- Mão de obra = horas de trabalho × R$/hora.
- Custo total do lote = material + energia + mão de obra + embalagem + extras.
- Custo por peça = custo do lote / quantidade.
- Preço sugerido por peça = custo por peça / (1 − margem sobre a venda).

**Limite de fidelidade:** o link do Manus fornecido anteriormente expunha somente um carregador React/Vite, sem scripts nem fórmulas acessíveis. Portanto, estes cálculos são operacionais e documentados, mas NÃO foram verificados como uma réplica exata dos cálculos do Manus.

## Testar

```bash
npm test
python -m http.server 8787
```

Abrir `http://localhost:8787/CALCULADORA-TESTE.html`. Testar também no ambiente Cloudflare local (`wrangler dev`) antes de publicar, especialmente a autenticação do Admin, configuração do DB, e criar → publicar → ler → retirar do ar.

## O que continua pendente para fechar a LP de produção

1. Aplicar este módulo sobre os arquivos reais da LP/Admin **versão 2.1.0**, que não estavam disponíveis para edição nesta sessão. Não substituir o projeto base por este kit.
2. Vincular o verificador de sessão Admin do Worker existente.
3. Validar visualmente no navegador e fazer o deploy Cloudflare/D1 com backup e controle de versão.

Nenhum deploy foi executado e nenhum dado de produção foi alterado.
