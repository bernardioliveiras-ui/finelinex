# FINELINEX 2.2.0 — Pacote completo para GitHub/Cloudflare

**Repositório correto:** https://github.com/bernardioliveiras-ui/finelinex  
**Worker:** `finelinex` (campo `name` em `wrangler.jsonc`)  
**Domínio do site:** `fineline3d.com.br` (mantido do projeto original)  
**Banco existente:** `fineline-db` (ID mantido, sem recriação)  

## O que está no ZIP

Landing page responsiva, logo, seis fotos originais, catálogo, orçamento online, login e painel de gestão, controle de usuários, banco D1, blog público e editor de artigos, calculadora de custos de impressão 3D para administradores, scripts e testes.

**Não é apenas um patch:** todos os arquivos da versão 2.1.0 foram usados como base e a calculadora foi integrada ao Admin.

## Publicação

1. Faça cópia/backup do repositório e exportação de segurança do banco D1 antes de publicar.
2. Extraia todo o ZIP na **raiz** do repositório `bernardioliveiras-ui/finelinex` (onde já está `wrangler.jsonc`), sem criar pasta adicional; confirme diff dos arquivos antes de substituir no GitHub.
3. Execute `npm ci`, `npm test` e `npm run build`.
4. Na Cloudflare, use os comandos **Build `npm run build`** e **Deploy `npm run deploy`**. Este último aplica as migrações SQL pendentes ao D1 **antes** do deploy do Worker.
5. Verifique `/`, `/admin/`, `/blog`, e a seção Blog da landing page, e teste um artigo do Admin. A calculadora está em **Admin → Calculadora** (perfil ADMIN).

Não execute `npm run setup` em conta já configurada. Não recrie banco, usuários ou secrets. Não use apenas `wrangler deploy` na primeira atualização do blog; isso não executa as migrações D1.

### Possível erro ao publicar artigo

Se a edição retornar erro no banco, verifique na Cloudflare se a migration `0003_blog.sql` foi aplicada ao mesmo banco `fineline-db` vinculado ao Worker. O comando `npm run deploy` realiza `wrangler d1 migrations apply DB --remote && wrangler deploy`. Não aplique manualmente `0099_fineline_blog_patch.sql` do kit anterior: essa migração criaria uma estrutura paralela desnecessária.

### A calculadora

O formulário calcula o lote: (filamento em g / 1000 × preço kg × (1 + perdas%)), energia (W / 1000 × horas × tarifa), mão de obra, embalagem e extras. Divide pelo número de unidades e fornece preço sugerido usando margem **sobre venda**: custo_unitário / (1 − margem%). É uma estimativa de custos com parâmetros editáveis, sem cotação externa ou persistência.

## O que foi preservado

Imagens originais, textos, formulário de orçamentos, funções administrativas, login, restrições do usuário ATENDIMENTO, migrações iniciais e `database_id` foram mantidos. O pacote não contém registros reais; o conteúdo do D1 fica onde está. Não altera tokens, senhas nem URLs do WhatsApp existentes.

## Testes

`npm test` cobre os fluxos anteriores e o cálculo. Nenhuma publicação remota foi executada neste preparo. O link de domínio precisa continuar apontado ao Worker correto no painel da Cloudflare; renomear o projeto não transfere rotas automaticamente.
