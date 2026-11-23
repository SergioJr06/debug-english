# Debug English — AI Feedback (MVP 0.2)

Este protótipo implementa uma **correção real, individual, de uma resposta por vez**: proposta de reescrita, erros explicados em português, pontos positivos, relevância para entrevista e sugestão de nova tentativa.

**Status:** os arquivos estão preparados no GitHub; o serviço **ainda não está implantado**. Nenhuma IA real foi executada e a qualidade das correções ainda precisa ser validada.

## Custo

Plano Cloudflare **Workers Free** + **Workers AI** + **Turnstile**. A Cloudflare anuncia 10.000 Neurons/dia gratuitos para Workers AI. No plano Free, o uso além desse limite é bloqueado. Não ative o plano Paid para estes testes.

Fontes oficiais:
- https://developers.cloudflare.com/workers-ai/platform/pricing/
- https://developers.cloudflare.com/workers-ai/get-started/workers-wrangler/
- https://developers.cloudflare.com/turnstile/get-started/
- https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/

## Configurar (quando for testar com IA real)

1. Crie uma conta em https://dash.cloudflare.com/ e mantenha Workers Free.
2. Crie um widget **Turnstile** gratuito permitindo o hostname sergiojr06.github.io (sem o caminho /debug-english/).
3. Guarde a **site key pública** para a página e a **secret key privada** apenas para o Worker.
4. Clone a branch feat/ai-feedback-cloudflare-poc e abra um terminal na pasta worker.
5. Execute:

~~~bash
npx wrangler@latest login
npx wrangler@latest deploy
npx wrangler@latest secret put TURNSTILE_SECRET
~~~

O primeiro deploy ficará bloqueado para correção até adicionar o segredo. No comando secret, insira a secret key privada no terminal quando solicitado. **Nunca cole a secret key no HTML, no GitHub, na URL ou na conversa.**

Ao publicar o Worker, será criada uma URL com formato https://debug-english-feedback.SEU-SUBDOMINIO.workers.dev. Abrir /health deve retornar status ok e configured true.

## Conectar a página

Após aprovação do PR e publicação via GitHub Pages, abra:

https://sergiojr06.github.io/debug-english/correcao.html

Em **Configurar conexão (teste)** informe a URL pública do Worker e a **site key pública** do Turnstile. Nenhum segredo é solicitado no navegador. Essas duas configurações públicas ficam salvas no armazenamento local do navegador.

Copie uma pergunta e uma resposta da entrevista, conclua a verificação e clique em **Analisar minha resposta**.

## Testar qualidade

Teste respostas com erro evidente, respostas corretas e respostas fora de contexto. A correção precisa explicar erros reais sem inventar problemas em respostas corretas. **Um modelo de IA pode errar**; o protótipo não calcula nota de proficiência.

Os testes automáticos usam IA simulada; não comprovam a qualidade da inferência:

~~~bash
cd worker
npm test
~~~

## Limitações e proteção

- Sem banco de dados ou armazenamento de respostas no Worker.
- Pergunta e resposta são processadas pelo fornecedor Cloudflare AI; não envie informações pessoais, sigilosas ou código de clientes.
- Turnstile é validado **no servidor** e é obrigatório. Nunca use chaves de teste em produção.
- Restrição de origem (CORS) e cerca de 3 tentativas por IP/minuto por localidade da Cloudflare. Limite aproximado, **não** proteção completa contra abuso.
- Site estático e Tally não são alterados. A página de IA permanece separada até validação com usuários.
- A única chave privada é TURNSTILE_SECRET, armazenada como secret do Worker. A binding AI não necessita chave no HTML.

**Próximo passo:** provar a qualidade de 10 a 20 correções com usuários reais e só então integrar a correção na entrevista completa.
