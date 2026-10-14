# Fine Line 3D 2.3.0 — atualização completa

## O que você receberá

- Calculadora pública em **https://fineline3d.com.br/calculadora**, sem login, acessível pelo menu e pela LP. O cliente pode levar a simulação para o formulário de orçamento.
- Calculadora também disponível no admin; o arquivo JavaScript que antes apontava para o local errado foi corrigido.
- Blog criado pelo admin: salvar rascunho, publicar, editar, retirar e compartilhar. Publicações aparecem imediatamente na LP.
- Integração com Blogger: conecta um endereço `blogspot.com`, traz até 50 artigos do feed, mostra as três publicações mais recentes na LP e permite leitura dentro do seu domínio. Atualiza aproximadamente a cada 15 minutos, com botão “Atualizar agora”.
- Artigos sem título usam a primeira linha do texto. HTML externo não é executado. Se o Blogger ficar indisponível, mantém os últimos artigos sincronizados.
- Criação automática das tabelas do blog caso a atualização antiga tenha sido publicada sem a migração.
- Orçamentos: validação de WhatsApp, proteção contra duplicação ao reenviar, preservação dos dados em falha e limite de espera para não deixar o botão preso em “Enviando”.

## 1. Subir o pacote completo no GitHub

Extraia o ZIP e coloque **todo o conteúdo na raiz** do repositório usado pelo Worker `finelinex` (o pacote anterior indica `bernardioliveiras-ui/finelinex`). `package.json`, `wrangler.jsonc`, `src/`, `public/`, `migrations/` e `scripts/` precisam ficar lado a lado. Não envie somente `public/` e não crie uma pasta extra envolvendo o projeto.

O pacote contém o comando `build`. Se aparecer `Missing script: build`, a Cloudflare está usando outro `package.json`, outro commit ou outra pasta. Confira a origem do build antes de repetir.

## 2. Cloudflare → Workers & Pages → finelinex → Settings → Builds

| Campo | Valor |
|---|---|
| Repositório | O repositório em que você acabou de subir este pacote |
| Production branch | `main` |
| Root directory | `/` (raiz do projeto) |
| Build command | `npm run build` |
| Deploy command | `npm run deploy` |

Salve e publique um novo commit. `npm run deploy` aplica as migrações D1 e publica o Worker. Não use apenas `npx wrangler deploy` como comando de atualização.

O arquivo `wrangler.jsonc` já contém:

- Worker `finelinex`.
- Banco existente `fineline-db`, binding **`DB`**.
- Database ID **`e76b6a03-eb03-4f9a-bb21-703e148e8975`**.
- Assets do site na pasta `public`.
- Cron **`*/15 * * * *`** para a sincronização automática.

**Você não precisa criar outro banco, outro Worker, R2 ou KV.** Reutilize o banco existente. A senha, os clientes, os pedidos e os conteúdos já salvos nele são preservados. As migrações adicionam as tabelas necessárias.

## 3. Conferir banco, domínio e senha

- Em **Bindings**, confirme `DB` apontando para `fineline-db`.
- Em **Domains & Routes**, mantenha `fineline3d.com.br` e `www.fineline3d.com.br` no Worker `finelinex`. A calculadora usa uma página desse mesmo domínio; não precisa criar subdomínio.
- Em **Settings → Variables and Secrets**, preserve o `ADMIN_PASSWORD` já existente. Se for o primeiro acesso de um banco novo, crie um Secret `ADMIN_PASSWORD` com 12 a 128 caracteres. O usuário inicial é `admin`.
- Se já existem usuários, use a senha atual do painel. Trocar `ADMIN_PASSWORD` não redefine a senha de um usuário já cadastrado; essa alteração é feita no próprio admin.
- Em **Settings → Trigger Events / Cron Triggers**, confirme `*/15 * * * *`. O deploy configura isso pelo arquivo; não adicione um segundo agendamento igual. A propagação pode levar alguns minutos.
- Se o deploy apontar falta de autorização no D1, a credencial de build precisa ter acesso de edição ao banco usado pelo Worker. Use uma credencial com acesso a esse recurso, sem publicar o token no código.

## 4. Conectar o Blogger

1. No Blogger, deixe o blog público. Em **Configurações → Feed do site → Permitir feed do blog**, selecione **Completo**. Feed “Curto” só disponibiliza o resumo; feed desativado ou blog privado impede a leitura.
2. Abra **https://fineline3d.com.br/admin/** → **Blog → Conectar meu Blogger**.
3. Cole **https://bernmkt.blogspot.com** (ou o endereço do Blogger que você deseja exibir).
4. Deixe “Mostrar os artigos do Blogger no site” marcado e clique em **Salvar conexão**.
5. Aguarde a confirmação com a quantidade de artigos. Use **Atualizar agora** para verificar novas postagens imediatamente.

Depois basta publicar no Blogger. O Worker busca o feed a cada 15 minutos e também pode atualizar em segundo plano quando a LP é visitada. Não exige que o admin fique aberto. Esse fluxo faz leitura; não publica conteúdo de volta no Blogger.

O campo “Link externo” dentro de um artigo manual continua sendo apenas um botão de referência. A automação fica no formulário **Conectar meu Blogger**.

## 5. Teste após publicar

- Abra `/calculadora` em uma janela anônima: deve funcionar sem login.
- Altere os dados e clique em “Quero produzir minha peça”: a simulação deve chegar ao campo Descrição do orçamento.
- Envie um pedido e confira em **Admin → Orçamentos**. Teste também as etapas Aprovado, Faturado e Entregue.
- Publique um artigo curto no admin: ele deve aparecer na LP e em `/blog`.
- Conecte o Blogger e confirme a quantidade de artigos e a última atualização.

A calculadora usa os custos informados pelo visitante. Não é uma cotação automática da Fine Line nem armazena a simulação até o cliente enviar o formulário. O resultado não inclui custos omitidos. O conteúdo do Blogger é convertido em texto seguro; imagens de capa disponíveis no feed são mantidas, mas vídeos e formatação HTML avançada não são reproduzidos.

## Validação deste pacote

Os resultados estão em `VALIDACAO-2.3.0.md`. A publicação na sua conta Cloudflare ainda precisa ser realizada com os passos acima; nenhum deploy remoto foi executado durante a preparação.

Referências oficiais:
- https://developers.cloudflare.com/workers/ci-cd/builds/configuration/
- https://developers.cloudflare.com/workers/wrangler/commands/d1/
- https://developers.cloudflare.com/workers/wrangler/configuration/#triggers
- https://support.google.com/blogger/answer/97933?hl=pt-BR
