# Fine Line 3D — site e painel prontos para Cloudflare

Este pacote substitui a landing page anterior e acrescenta um painel em `/admin/`. A página e a API são publicadas juntas em um Cloudflare Worker; os produtos, conteúdos, acessos e orçamentos ficam no banco Cloudflare D1.

## O que está incluído

- Visual azul com a logo transparente e o ícone da aba do navegador.
- Novo texto principal e os botões Solicitar Orçamento / Ver Produtos.
- Mais de 2 mil projetos entregues, 4 anos de atuação e as avaliações reais fornecidas: nota 5,0, 55 avaliações e os dois depoimentos do print. Esses dados podem ser atualizados no painel.
- Produtos, fotos e links do catálogo original preservados; detalhes dos produtos corrigidos.
- Formulário de orçamento com a pergunta sobre arquivo 3D e a opção de desenvolver a modelagem da peça.
- Garantia, embalagem segura, nota fiscal e suporte.
- Um único botão flutuante de WhatsApp, usando o número original `55 11 99897-8969`.
- Painel para produtos, conteúdo, acessos da equipe e pedidos.

O WhatsApp abre uma conversa com uma mensagem pronta. Esta versão não inclui um chatbot nem envio automático de mensagens pelo WhatsApp. Arquivos 3D são combinados e enviados pelo WhatsApp após a solicitação; o formulário não envia anexos.

## 1. Primeira publicação — configuração assistida

É necessário usar a sua conta Cloudflare. O pacote foi testado localmente e não está publicado na sua conta.

No computador, instale o Node.js 22 ou superior. Extraia o ZIP e abra um terminal dentro da pasta que contém `package.json`. Também pode usar um terminal do GitHub Codespaces.

```bash
npm ci
npm run setup
```

O assistente vai:

1. Abrir o login da Cloudflare. Escolha a conta que administra seu domínio.
2. Criar ou localizar o banco `fineline-db` e preencher o ID real em `wrangler.jsonc`.
3. Aplicar a migração que prepara as tabelas, os produtos e os conteúdos iniciais.
4. Publicar o Worker `fineline` e mostrar o endereço `workers.dev`.
5. Pedir que você escolha a senha inicial, de 12 a 128 caracteres, e armazená-la como secret `ADMIN_PASSWORD` na Cloudflare. Ela não vai para o GitHub.

Se sua conta tiver várias contas Cloudflare, o Wrangler poderá pedir o `account_id`. Nesse caso, copie o ID da conta do domínio e adicione `"account_id": "SEU_ID"` em `wrangler.jsonc` antes de repetir a configuração.

Depois de publicado, entre em `https://ENDERECO-DO-WORKER.workers.dev/admin/` com:

- **Usuário:** `admin`
- **Senha:** a que você escolheu no assistente.

A primeira entrada cria o administrador no banco. Depois, a senha é gerenciada pelo painel em **Minha senha**. Mudar o secret `ADMIN_PASSWORD` depois da primeira entrada não muda a senha já cadastrada.

## 2. Subir no seu GitHub

Abra o repositório `bernardioliveiras-ui/fineline` e envie o **conteúdo extraído do ZIP**, com as pastas, para a raiz do repositório. A raiz deve conter `package.json`, `package-lock.json`, `wrangler.jsonc`, `public`, `src`, `migrations`, `scripts` e `README.md`.

Envie o `wrangler.jsonc` atualizado pelo assistente, que já contém o ID real do D1. O arquivo `index.html` antigo da raiz pode ser removido: a nova página está em `public/index.html`.

Não envie `node_modules`, `.dev.vars`, `.env` nem `.wrangler`. O `.gitignore` já exclui esses arquivos.

Na Cloudflare, conecte esse repositório ao Worker **fineline**, em **Workers & Pages → fineline → Settings → Builds**. Se aparecer “Missing git connection”, conecte/autorize o GitHub e permita o acesso ao repositório `bernardioliveiras-ui/fineline`.

| Campo | Valor |
|---|---|
| Production branch | Sua branch principal, normalmente `main` |
| Root directory | Raiz do repositório (`/`) |
| Build command | `npm run build` |
| Deploy command | `npm run deploy` |
| Preview builds | Desativados nesta configuração inicial |
| Protect with Cloudflare Access | Desativado para a LP pública |

O comando de publicação aplica as migrações pendentes e publica o Worker. O token de deploy precisa ter permissões de edição de Workers e de D1 na conta escolhida. Se o token automático não tiver permissão para D1, adicione essa permissão antes de repetir o build.

**Use `npm run deploy` nesta versão.** O comando antigo `npx wrangler deploy --assets .` não serve para este pacote: ele não usa corretamente o Worker, o painel e a pasta pública.

As alterações feitas no painel ficam no D1 e sobrevivem a novas publicações. A migração inicial usa `INSERT OR IGNORE`, preservando o que você já editou.

## 3. Ativar fineline3d.com.br

1. Na zona `fineline3d.com.br` da Cloudflare, copie os **dois nameservers exibidos para a sua conta**.
2. No Registro.br, abra o domínio e altere os servidores DNS para esses dois nameservers. Os nomes são específicos da sua conta; não use os de outra pessoa.
3. Aguarde a zona aparecer como **Active** na Cloudflare.
4. Em **Workers & Pages → fineline → Settings → Domains & Routes**, escolha **Add → Custom Domain** e adicione `fineline3d.com.br`.
5. Adicione também `www.fineline3d.com.br` se quiser que os dois endereços abram o site. Se já houver um registro antigo para esses nomes, use o procedimento de substituição indicado pela Cloudflare.
6. Abra o site pelo domínio e faça um orçamento de teste. Confira a entrada no painel em `https://fineline3d.com.br/admin/`.

O domínio e o HTTPS só estarão ativos depois de concluir essas etapas na sua conta. O site público fica aberto; o painel e seus dados exigem login próprio.

## 4. Usar o painel

**Visão geral:** contagens e últimas solicitações.

**Orçamentos:** busca por cliente, e-mail, WhatsApp ou produto e filtro por etapa. Abra uma solicitação para ver os dados, o prazo e se o cliente já tem o arquivo 3D. Edite a etapa e as anotações internas.

Fluxo sugerido:

`Novo orçamento → Em atendimento → Orçamento enviado → Aprovado → Faturado → Entregue`

Também existe a etapa Cancelado. As áreas **Pedidos aprovados**, **Faturados** e **Entregues** mostram somente os pedidos na etapa correspondente. As etapas são atualizadas manualmente e podem ser corrigidas quando necessário.

O painel mostra as 500 solicitações mais recentes. “Faturado” é uma etapa de acompanhamento; a emissão da nota fiscal é feita no seu sistema fiscal.

**Produtos:** cadastrar, editar, escolher foto e links de compra, definir ordem ou ocultar um item. Imagens por URL HTTPS ou foto PNG/JPG/WebP de até 700 KB.

**Conteúdo do site:** título, descrição, texto do orçamento, números de experiência, WhatsApp, nota/total do Google e até oito avaliações reais. Salvar publica o conteúdo no site. A integração com o Google é um retrato dos dados fornecidos, sem sincronização automática.

**Acessos:** criar nome, usuário e senha inicial; ativar/desativar contas ou redefinir uma senha. Administrador gerencia tudo. Atendimento acompanha e atualiza solicitações, sem alterar conteúdo, produtos ou acessos.

**Minha senha:** disponível para ambos os perfis. A senha deve ter de 12 a 128 caracteres.

## 5. E-mail de orçamento (opcional)

Os orçamentos são sempre gravados no painel. Para também receber notificações por e-mail com a sua conta Web3Forms:

```bash
npx wrangler secret put WEB3FORMS_ACCESS_KEY
```

Informe a chave da sua conta Web3Forms no terminal. O destinatário é o e-mail configurado nessa conta. Uma falha na notificação não perde o orçamento gravado no banco. Não coloque chaves no HTML nem no GitHub.

## Configuração manual, se preferir

```bash
npm ci
npx wrangler login
npx wrangler d1 create fineline-db --update-config=false
```

Copie o ID retornado em `wrangler.jsonc → d1_databases[0].database_id`, substituindo o UUID zerado. Se o banco já existe, consulte o ID com `npx wrangler d1 list --json`.

```bash
npm run build
npm run deploy
npx wrangler secret put ADMIN_PASSWORD
```

Escolha uma senha de 12 a 128 caracteres. Depois siga as etapas do GitHub e do domínio acima.

## Desenvolvimento e testes

```bash
npm ci
npm test
npx wrangler d1 migrations apply DB --local
```

Copie `.dev.vars.example` para `.dev.vars` e defina uma senha local de pelo menos 12 caracteres. Depois:

```bash
npm run dev
```

O banco local e o banco publicado são independentes. Para validar o empacotamento sem publicar:

```bash
npx wrangler deploy --dry-run
```

A API exige a origem do próprio site para alterações, valida os envios, limita tentativas e usa cookies HttpOnly para as sessões. Senhas ficam com hash e salt; o painel nunca retorna hashes. Os orçamentos não são dados públicos.

Documentação oficial: [Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/), [D1 e migrações](https://developers.cloudflare.com/d1/reference/migrations/), [Custom Domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/).
