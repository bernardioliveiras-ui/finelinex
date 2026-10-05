# Validação da entrega — 05/10/2026

- 19 testes automatizados da API passaram, sem falhas.
- As duas migrações foram aplicadas com sucesso no D1 local do Wrangler.
- Fluxo real no navegador com Worker/D1 local: envio de orçamento, login, atualização para Aprovado/Faturado/Entregue, edição de produto e conteúdo, criação do acesso de Atendimento, restrição das áreas administrativas, logout, troca de senha e redefinição pelo administrador.
- Nenhum erro de JavaScript no fluxo completo final.
- LP verificada em desktop e nas larguras 320, 390 e 768 px, sem rolagem lateral. Painel verificado em 320 e 390 px; os pedidos aparecem como cartões com botão Abrir visível no celular.
- Logo transparente e favicon presentes. As seis fotos e os dados originais dos produtos foram preservados.
- Revisão independente concluída; corrigidos conflitos de edição simultânea, preservação da senha escolhida, validação anterior à alteração de acesso e invalidação de login em andamento após redefinição de senha.
- `wrangler deploy --dry-run` concluiu o empacotamento dos 17 arquivos públicos e do Worker, sem publicar.

A publicação na conta Cloudflare, a conexão ao GitHub e a ativação do domínio dependem da configuração descrita no README. Nenhum banco local nem registro de orçamento gerado durante os testes está incluído no ZIP. Os testes automatizados contêm exemplos fictícios e senhas usadas apenas nesses testes, sem configurar o acesso publicado.
