# Fine Line 3D — 2.3.0

Pacote completo da LP, painel, orçamentos, blog com integração Blogger e calculadora pública.

**Comece por [LEIA-ME-CLOUDFLARE.md](LEIA-ME-CLOUDFLARE.md)** para atualizar o site e conectar seu blog.

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
