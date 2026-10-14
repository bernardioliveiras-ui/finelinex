# FINELINEX 2.3.1 — Diagnóstico de conexão com Blogger

## Situação verificada

Em 14/10/2026, o painel informou “Não consegui ler o Blogger” usando `https://fineline3d.blogspot.com`. O usuário apresentou as configurações do Blogger indicando Acesso de leitor = Público e Feed do blog / de postagens = Versão completa. No screenshot do Admin a opção “Mostrar os artigos do Blogger no site” estava desmarcada — é preciso marcá-la depois do teste para efetivamente publicar na LP.

A implementação da versão 2.3.0 usava `fetch(..., {redirect:'error'})` e ocultava status e outros diagnósticos. Uma resposta HTTP 3xx do Blogger provocava falha imediata mesmo que o destino fosse legítimo. **Não foi possível acessar o feed real externamente a partir deste ambiente de testes**; o redirecionamento foi identificado como hipótese concreta de falha, não confirmado como único motivo.

## Melhorias desta versão

- **Testar conexão** no Admin → Blog, sem alterar as opções salvas, com contagem e títulos de exemplo.
- Aceita redirecionamentos HTTPS apenas para o próprio Blogger (domínio `.blogspot.com`, `.blogspot.com.br` equivalente) ou endpoint oficial do blog por ID; bloqueia destinos desconhecidos e URLs com credenciais.
- Para `fineline3d.blogspot.com`, testa uma segunda rota pública oficial `https://www.blogger.com/feeds/223024082882083312/posts/default?alt=json&max-results=50` se a rota Blogspot falhar. O ID foi extraído das configurações fornecidas pelo proprietário do blog. A rota por ID faz leitura de publicações, não altera nada no Blogger e não exige API key.
- Diagnósticos de erros HTTP, timeout, respostas inválidas e redirecionamentos indevidos, sem expor a senha ou dados privados.
- Em falha, preserva configuração e artigos já existentes no D1; não altera os clientes ou orçamentos.

## Passo a passo

1. Publique os arquivos completos desta versão em `bernardioliveiras-ui/finelinex` (na raiz, branch `main`). Preserve os arquivos que não estão no pacote apenas se souber que fazem parte de customizações posteriores.
2. Confirme Cloudflare Workers `finelinex`, banco `fineline-db`, binding `DB`, build `npm run build`, deploy `npm run deploy`. Não crie banco novo nem exclua dados.
3. No Blogger confirme **Configurações → Permissões → Acesso de leitor: Público** e **Feed de site → Permitir feed do blog: Versão completa** (já informados pelo usuário).
4. Em `https://fineline3d.com.br/admin/` → Blog, insira `https://fineline3d.blogspot.com`. Clique **Testar conexão**.
5. Se for bem-sucedido, ative a opção **Mostrar os artigos do Blogger no site** e clique **Salvar conexão**.
6. Veja `/blog` e a seção do blog na landing page. Se o teste retornar zero postagens, publique ao menos um artigo no Blogger e teste novamente.

### Se não conectar

Abra em janela anônima:

- https://fineline3d.blogspot.com/
- https://fineline3d.blogspot.com/feeds/posts/default?alt=json
- https://www.blogger.com/feeds/223024082882083312/posts/default?alt=json

A primeira página deve abrir sem login e uma das rotas de feed precisa retornar JSON com o objeto `feed` e, se houver artigos publicados, a propriedade `entry`. Se as três URLs falharem, registre a mensagem exibida. Um HTTP 404 aponta blog/feed inexistente; HTTP 403 aponta bloqueio/permissão; redirecionamento de login aponta acesso ou exigência de consentimento. Se abrirem no navegador mas o Worker indicar falha HTTP, verifique a saída de logs do Cloudflare Worker; o acesso do servidor pode ser bloqueado independentemente do seu navegador.

Não é necessário alterar as configurações de visibilidade e feed do Blogger se elas já estiverem como nas imagens fornecidas.

## Verificação de software

Testes automatizados com respostas controladas do Blogger: conexão normal, fallback por ID após HTTP 403, redirect HTTPS `.com.br`, rejeição de redirecionamento HTTP para endereço local, diagnóstico admin-only e preservação de configuração em falha. Não equivalem a uma confirmação de rede do serviço externo real.
