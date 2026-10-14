# Validação — FINELINEX 2.4.0 — 14/10/2026

**Base:** pacote FINELINEX 2.3.1 corrigido, preservando Blogger, D1, LP, painel, orçamentos e calculadora.

**Comandos validados localmente:**

- `npm run build`: passou, retornando `Configuração, páginas públicas e arquivos JavaScript validados.`
- `npm test`: 46 testes automatizados passaram, 0 falhas.
- `node --check`: scripts JS novos e modificados passaram.

**Testes adicionais do catálogo Shopee:**

1. Inicialização do catálogo com nove anúncios de mesmo vendedor, fotos externas e links individuais reais.
2. Proteção do Admin: visitante não acessa preview/importação e atendente não modifica o catálogo.
3. Proteção CSRF / origem na API de importação.
4. Importação idempotente, sem duplicação, sem exclusão de produtos personalizados.
5. Atualização por CSV e preservação da posição escolhida manualmente.
6. Rejeição de produtos de outras lojas, links de loja sem ID, URL de imagem maliciosa e domínio Shopee forjado.
7. Edição manual do produto preserva campos de preço, data e origem.
8. Migration `0005_shopee_catalog.sql` inativa exemplos com links genéricos e mantém o serviço `Projeto Personalizado` ativo.

**Limitações externas:**

- As páginas Shopee dos nove anúncios foram consultadas publicamente em 14/10/2026, com IDs `i.456103442.*` e vendedor FINE LINE 3D.
- As fotos são links diretos do CDN Shopee, não cópias hospedadas localmente. Não foi possível obter os arquivos de imagem diretamente neste ambiente para confirmar disponibilidade futura; cada card tem fallback para a logo se a foto falhar.
- Não foi feito deploy ao Cloudflare nem aplicado o SQL ao D1 de produção neste ambiente.
- A integração CSV funciona por importação administrada. NÃO é uma sincronização automática de preço ou estoque e não usa credenciais da Shopee. Integração contínua exige autorização/API oficial.

**Integridade:** não altera nomes do Worker (`finelinex`) ou DB (`fineline-db`), não envia `ADMIN_PASSWORD` e não apaga registros do banco. A migração contém `INSERT OR IGNORE` para os novos anúncios, `UPDATE` apenas dos demos ainda genéricos, e deixa as vendas, usuários, blog e orçamentos intactos.
