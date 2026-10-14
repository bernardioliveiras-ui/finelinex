# Fine Line 3D — 2.3.1

Pacote completo da LP, painel, orçamentos, blog com integração Blogger reforçada, diagnóstico do feed e calculadora pública.

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

## Correção 2.3.1 — conexão Blogger

No Admin → Blog, o botão **Testar conexão** verifica o feed sem salvar mudanças. A importação do endereço `fineline3d.blogspot.com` agora admite redirecionamentos seguros e, em caso de falha, tenta também o feed público oficial pelo ID do blog informado nas configurações (`223024082882083312`). Os erros incluem o resultado de cada tentativa. Nenhum outro domínio pode ser usado como destino de redirecionamento. Veja `DIAGNOSTICO-BLOGGER.md`.
