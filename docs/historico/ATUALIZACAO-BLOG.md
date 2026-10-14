# FineLine 2.1.0 — Blog

Esta atualização acrescenta um blog à LP existente. A calculadora solicitada ainda não faz parte deste pacote: a referência Manus apresentou “Site Unavailable” e o ZIP original não contém sua implementação. Para reproduzir os campos e cálculos na LP, é necessário o código-fonte/ZIP da calculadora ou um link público acessível. Nenhum redirecionamento para essa referência foi adicionado.

## Publicação

1. Substitua os arquivos do projeto no GitHub pelos deste pacote, mantendo-os na raiz do repositório.
2. Na integração da Cloudflare, use `npm run build` como comando de build e **`npm run deploy`** como comando de publicação. O segundo aplica as migrações D1 antes de publicar o Worker. Usar apenas `npx wrangler deploy` não cria a tabela do blog.
3. Preserve o banco `fineline-db`, o ID já configurado e os secrets existentes. A migração `0003_blog.sql` só acrescenta a tabela de artigos; não apaga usuários, orçamentos ou produtos. O login existente continua o mesmo.
4. Depois do deploy, entre em `/admin/`, abra **Blog** e publique um artigo. Confira o artigo em `/blog` e na seção Blog da página inicial.

Não houve publicação na conta Cloudflare nem alteração do banco remoto durante a preparação deste pacote. As permissões do token de deploy precisam incluir as operações D1 que o projeto já usa.

## Uso pelo administrador

- **Novo artigo:** título, endereço do artigo, resumo, texto, capa opcional e link externo opcional.
- **Salvar rascunho:** guarda as alterações apenas no admin. Se o artigo já está publicado, a versão pública permanece como estava.
- **Publicar artigo:** torna a versão atual visível para todos. A LP mostra os três artigos mais recentes; a página Blog mostra 12 por página.
- **Retirar do site:** oculta o artigo e preserva o rascunho. É possível publicar novamente depois.
- **Conferir prévia:** mostra título, resumo e formatação do texto antes de salvar.
- Separe parágrafos com uma linha em branco. Use `## Subtítulo` ou `### Subtítulo menor` em um bloco separado. HTML inserido é exibido como texto.
- A capa aceita URL HTTPS, caminho `/assets/...` ou envio de PNG, JPG ou WebP de até 700 KB. Se capa e texto juntos excederem o limite de armazenamento, reduza a capa ou utilize uma URL HTTPS. A mensagem de erro preserva os campos digitados.
- Cada artigo possui um endereço fixo, por exemplo `/blog/como-escolher-o-material`, com botão para copiar o link. O endereço não muda depois do primeiro salvamento.
- O link externo opcional abre em outra aba no artigo.
- Edições simultâneas são verificadas por versão. Se outra sessão salvar primeiro, copie seu texto e reabra o artigo para conferir as alterações.

## Acesso dos leads

Os visitantes apenas leem os artigos publicados e acessam os links. Não existe cadastro de leitor, comentário ou edição pública. Rascunhos e ferramentas de publicação são exclusivos de usuários com perfil ADMIN; o perfil ATENDIMENTO continua restrito à gestão de pedidos.

Os artigos têm HTML gerado no servidor, descrição, endereço canônico e participação no `/sitemap.xml`. Isso permite que mecanismos de busca descubram o conteúdo público, sem garantir indexação ou posição no Google.

## Verificação desta atualização

- 25 testes automatizados passaram, incluindo acesso, publicação, rascunhos privados, conflitos de versão, paginação, homepage e limite de armazenamento.
- `npm run build` e `git diff --check` passaram.
- As três migrações foram aplicadas no D1 local, sem acessar o banco remoto.
- O empacotamento `wrangler deploy --dry-run` passou.
- A revisão de código independente não encontrou falhas críticas de autenticação, rotas ou escape de conteúdo. O limite de tamanho identificado foi corrigido e testado.
- O navegador disponível não alcançou o servidor local; a validação visual e o fluxo completo no navegador desta atualização permanecem pendentes. O histórico de testes da versão anterior está em `VALIDACAO.md`.
- Fotos, logo, catálogo e textos originais da LP foram preservados; não há artigos de exemplo publicados no pacote.
