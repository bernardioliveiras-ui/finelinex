# FINELINEX 2.4.0 — Catálogo real da Shopee

**Loja oficial:** <https://shopee.com.br/vini.store_> (FINE LINE 3D)

**O que muda:**
- A landing page usa a loja acima no botão e no rodapé, sem link fictício de Mercado Livre.
- 9 anúncios **reais da loja Fine Line 3D**, conferidos em 14/10/2026 pelo endereço de cada item (ID de vendedor `456103442`).
- Cada anúncio tem título resumido, foto do produto, preço de referência e botão que leva **diretamente ao anúncio** — não à home da Shopee.
- Fotos com `object-fit: contain` sem corte na LP e no Admin; se o CDN externo estiver fora do ar, utiliza a logo como fallback.
- `Projeto Personalizado` continua com solicitação de orçamento, sem link de marketplace.
- Desativa os 5 **exemplos originais** que ainda tinham somente links para o início dos marketplaces. Não apaga registros, não altera pedidos, usuários, blog nem calculadora.
- Se um produto original foi personalizado e recebeu link verdadeiro, ele permanece ativo.

## Atualização do Cloudflare

1. Extraia este ZIP na raiz de `bernardioliveiras-ui/finelinex` (branch `main`), incluindo todas as pastas. Não coloque uma pasta extra envolvendo `src` e `public`.
2. Em **Workers & Pages → finelinex → Settings → Builds**, confirme `npm run build` e `npm run deploy`. O segundo comando executa `wrangler d1 migrations apply DB --remote` e publica o Worker.
3. O arquivo `wrangler.jsonc` mantém o Worker `finelinex`, a vinculação D1 `DB` e o banco existente `fineline-db`.
4. O deploy aplica `migrations/0005_shopee_catalog.sql` **uma única vez** ao banco remoto. Migrações anteriores e seus dados permanecem.
5. Teste `https://fineline3d.com.br/#catalogo` e clique nos botões. Devem abrir anúncios que contêm `-i.456103442.<numero>`.
6. Entre em `/admin/ → Produtos`. Você poderá editar título, texto, preço, foto, posição, estado ativo e links de cada item, além de importar mais produtos.

## Para integrar o restante do catálogo

A Shopee não fornece no site público um feed estável e livre que possa ser usado como integração automática confiável com fotos, preço e estoque. Portanto, **este pacote não faz scraping nem afirma sincronização automática de estoque/preço**. Para ampliar o catálogo com segurança:

1. Abra **Admin → Produtos → Catálogo da Shopee**.
2. Confirme os 9 anúncios atuais no botão *Conferir os 9 anúncios verificados*. Pode reimportá-los sem duplicação.
3. Para produtos novos, baixe `public/assets/modelo-catalogo-shopee.csv` e preencha o CSV com **um anúncio por linha**. Use o endereço do anúncio individual com `-i.456103442.<ID>` ou `/product/456103442/<ID>`. Colunas: `nome`, `link`, `foto`, `preco`, `categoria`, `descricao` (separador `;`).
4. Selecione o CSV, clique em **Pré-visualizar CSV** e depois **Importar anúncios do CSV**. Até 100 anúncios por importação e 250 produtos no catálogo.
5. Reimportar o mesmo ID atualiza o produto, sem gerar duplicata. A posição escolhida no Admin é preservada.
6. Para alterar a posição dos cards, edite o campo **Ordem no catálogo** de cada produto no Admin.
7. Para imagens que não abrirem por causa de bloqueio/hotlink da Shopee, salve uma cópia autorizada da foto na área de imagem do produto pelo Admin (até 700 KB) para que seja armazenada pelo site.

**Proteções:** importação restrita ao Administrador logado, URLs HTTPS apenas do vendedor `456103442`, verificação de formulário de mesma origem, lote atômico no D1, validação de tamanho, preservação dos dados de outros produtos e nenhum link gerado para o Mercado Livre.

## Preços e integração automática futura

Os preços deste pacote foram observados em 14/10/2026. Podem mudar. O site informa a data e orienta o cliente a conferir o anúncio. Para sincronização automática oficial de preços, imagens e estoque da conta Shopee, será necessário obter acesso autorizado à API para vendedores (Open Platform) e configurar os respectivos dados de integração. Não há credenciais da Shopee incluídas no pacote.

## Conferência da origem dos 9 produtos

A loja pública tem a página <https://shopee.com.br/vini.store_>. Os anúncios correspondem ao mesmo vendedor, número `456103442`:

| ID do anúncio | Produto |
|---|---|
| 22794537308 | Machado Dummy 13 |
| 22498646552 | Cortador de biscoito Minecraft |
| 23599428183 | Coletor de pó de furadeira |
| 23698384327 | Kit 24 mãos Dummy 13 |
| 58253121564 | Kit desenho Sprunki |
| 23298344852 | Volante para controle Xbox |
| 23299140507 | Kit 3 mini vasinhos |
| 23599432370 | Limpadores de pente/escova |
| 22494701026 | Espada Buster Dummy 13 |

Se o vendedor alterar títulos, fotos, anúncios ou preços, o cadastro poderá ser atualizado no Admin. O botão da LP vai para o anúncio individual; o link da loja completa permanece visível acima do catálogo.
