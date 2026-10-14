# Fine Line 3D — 2.4.0

Pacote completo da LP, painel, orçamentos, blog com Blogger, calculadora pública e **catálogo real de anúncios da loja Shopee Fine Line 3D**.

**Comece por [LEIA-ME-CLOUDFLARE.md](LEIA-ME-CLOUDFLARE.md)**. Leia também [INTEGRACAO-CATALOGO-SHOPEE.md](INTEGRACAO-CATALOGO-SHOPEE.md) para o catálogo real.

- Site: `/`
- Calculadora pública: `/calculadora`
- Blog público: `/blog`
- Painel: `/admin/`

```sh
npm ci
npm test
npm run build
npm run deploy
```

`deploy` aplica as migrações no D1 configurado e publica o Worker. Para desenvolvimento local, aplique `npx wrangler d1 migrations apply DB --local` e use `npm run dev`. Configure uma senha de teste em `.dev.vars`, sem enviar esse arquivo ao GitHub.

O banco e o Worker existentes são preservados. O cron de 15 minutos já está declarado no `wrangler.jsonc`. Arquivos de documentação de versões anteriores são históricos; siga o guia 2.3.0.

## Novo 2.4.0 — Catálogo real Shopee

Catálogo inicial com 9 anúncios reais da loja `https://shopee.com.br/vini.store_`, 1 serviço de projeto sob medida, sem links fictícios para Shopee/Mercado Livre. Foto íntegra (`object-fit: contain`), preço de referência com data e link direto para o item. Importação de novos anúncios pelo CSV do Admin, com reimportação sem duplicidade. A migração 0005 desativa os antigos produtos de demonstração apenas quando continuam usando links genéricos, sem apagar nada. Veja `INTEGRACAO-CATALOGO-SHOPEE.md`.

## Correção 2.3.1 — conexão Blogger

No Admin → Blog, o botão **Testar conexão** verifica o feed sem salvar mudanças. A importação do endereço `fineline3d.blogspot.com` agora admite redirecionamentos seguros e, em caso de falha, tenta também o feed público oficial pelo ID do blog informado nas configurações (`223024082882083312`). Os erros incluem o resultado de cada tentativa. Nenhum outro domínio pode ser usado como destino de redirecionamento. Veja `DIAGNOSTICO-BLOGGER.md`.
