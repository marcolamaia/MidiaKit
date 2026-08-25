# Media Kit — Marcos Maia

Media Kit comercial de [@marcolamaia](https://www.instagram.com/marcolamaia/), com métricas
reais do Instagram consumidas via [Windsor.ai](https://windsor.ai), atualização diária
automática e apresentação pensada para marcas e agências.

**Regra que governa o projeto:** nenhuma métrica é inventada. Em produção, ou o número é
real ou a interface mostra "dados não disponíveis". Mocks existem apenas no modo
demonstração e estão marcados como tal no código e na tela.

---

## 1. Instalar

```bash
git clone https://github.com/marcolamaia/MidiaKit.git
cd MidiaKit
npm install
```

Requer **Node 18.18 ou superior**.

## 2. Iniciar o projeto

```bash
cp .env.example .env
npm run dev
```

Abra <http://localhost:5173>. O projeto já sobe em `DEMO_MODE=true`, com dados fictícios,
para você ver o layout completo antes de configurar a integração.

O servidor de desenvolvimento também expõe `/api/metrics` usando **exatamente o mesmo
handler** que roda na Vercel — não existe caminho de código "só para o dev".

Outros comandos:

```bash
npm run build       # gera dist/
npm run preview     # serve o build local (sem a API — use `npm run dev` para dados)
npm run lint:data   # diagnostica a integração Windsor.ai (ver seção 8)
node --test tests/*.test.js   # roda os testes
```

## 3. Configurar o Windsor.ai

1. Crie a conta em <https://onboard.windsor.ai>.
2. Conecte o **Instagram** (seção 5 abaixo).
3. Copie sua **API Key** no painel do Windsor.ai.
4. Preencha o `.env`:

```bash
DEMO_MODE=false
WINDSOR_API_KEY=sua_chave_aqui
WINDSOR_ACCOUNT_ID=17841449774490945   # opcional; só se houver mais de uma conta
```

### Como a integração funciona

O projeto consome a **Connectors API** do Windsor.ai:

```
GET https://connectors.windsor.ai/instagram
    ?api_key=<WINDSOR_API_KEY>
    &fields=date,reach,views,total_interactions,...
    &date_from=2026-07-26&date_to=2026-08-24
```

A resposta chega como `{ "data": [ { … }, … ] }`. O cliente
(`src/services/windsor.js`) aceita também `{ "result": […] }` ou um array puro, para não
quebrar caso a Windsor mude o envelope.

**Detalhe importante de modelagem.** Os campos do conector vivem em tabelas diferentes
(`user_info`, `user_insights_day`, `user_insights_day_total_value`, `media_info`,
`media_insights`, `user_insights_lifetime_*`). Agrupar campos de tabelas distintas por uma
dimensão que não seja `date` faz a API devolver `null` em parte das colunas. Por isso toda
série temporal é pedida **por dia** e qualquer agregação (semanal, total do período) é
feita no nosso código, em `src/services/normalize.js`.

## 4. Inserir credenciais

| Variável | Obrigatória | Para que serve |
|---|---|---|
| `DEMO_MODE` | sim | `true` usa mocks; `false` exige dados reais |
| `WINDSOR_API_KEY` | quando `DEMO_MODE=false` | chave da Connectors API |
| `WINDSOR_ACCOUNT_ID` | não | fixa uma conta específica do Instagram |
| `CACHE_TTL_SECONDS` | não | validade do cache (padrão 21600 = 6 h) |
| `CACHE_DISK` | não | cache em disco `/tmp` (`false` em runtimes somente-leitura) |
| `RATE_LIMIT_PER_MINUTE` | não | teto de requisições por IP em `/api/metrics` |
| `REVALIDATE_TOKEN` | recomendada em produção | protege `?refresh=1` |
| `TIMEZONE` | não | fuso do "último dia fechado" (padrão `America/Sao_Paulo`) |

> A chave **nunca** chega ao navegador. Ela é lida só pela serverless function
> `api/metrics.js`. O `.env` está no `.gitignore`.

## 5. Conectar o Instagram

1. A conta precisa ser **Comercial** ou **Criador de conteúdo** (conta pessoal não expõe
   insights na API da Meta).
2. Ela precisa estar vinculada a uma **Página do Facebook**.
3. No Windsor.ai: **Connectors → Instagram → Connect**, e autorize com o Facebook.
4. Confirme que a conta aparece na lista de contas conectadas.
5. Rode `npm run lint:data` para validar o que ficou disponível.

### O que a API entrega (verificado na conta @marcolamaia)

| Disponível | Observação |
|---|---|
| Seguidores, contas seguidas, nº de publicações | snapshot de hoje; sem histórico |
| Alcance, visualizações, interações, contas engajadas | série **diária** |
| Curtidas, comentários, compartilhamentos, salvamentos, respostas | série diária |
| Novos seguidores por dia | **só os últimos 30 dias** (limite da Meta) |
| Publicações: miniatura, tipo, data, link, views, alcance, curtidas, comentários, compartilhamentos, salvamentos | por publicação |
| Reels: tempo médio assistido, tempo total, taxa de skip | por Reel |
| Audiência: faixa etária, gênero, cidades, países | valores vitalícios |

| Não disponível | Como o projeto trata |
|---|---|
| **Granularidade horária** | A Meta não expõe. O período de 24 h vira comparação entre o último dia fechado e o anterior, com nota explicativa na tela. |
| **Estados como dimensão** | Derivados da cidade (`"Cidade, Estado (state)"`) e agregados por nós. |
| **Impressões, visitas ao perfil, cliques** | Descontinuados pela Meta. Não são consultados. |
| **Stories** | Só existem por 24 h; quase sempre vem vazio. A seção mostra "dados não disponíveis" em vez de sumir. |

Métricas que a API não retorna **nunca** viram estimativa: o componente some ou exibe
"Dados não disponíveis", com a estrutura pronta para receber o dado no futuro.

## 6. Ativar / desativar o modo demonstração

```bash
DEMO_MODE=true    # dados fictícios + faixa de aviso permanente no topo
DEMO_MODE=false   # produção: só dados reais
```

Com `DEMO_MODE=false` e a integração fora do ar, a página mostra
"Métricas temporariamente indisponíveis" — **nunca** um número inventado. O restante do
Media Kit (posicionamento, formatos, cases, contato) continua funcionando normalmente.

Os mocks vivem só em `src/services/demo-data.js`, cada bloco marcado como fictício, e
esse módulo só é carregado quando `DEMO_MODE=true`.

## 7. Configurar contatos, textos, marcas e cases

Tudo que é editável está em **`src/config.js`**. Nenhum desses valores está espalhado
pelo código.

```js
export const creatorConfig = {
  name: 'Marcos Maia',
  username: '@marcolamaia',
  instagram: 'https://www.instagram.com/marcolamaia/',
  email: 'contato@svpubli.com.br',   // veio da bio do Instagram — troque se quiser
  whatsapp: '',                      // '5511999999999' — vazio vira "Em breve"
  location: 'Brasil',
  photo: '/assets/marcos-maia.png',
  siteUrl: 'https://mediakit.marcolamaia.com',
}
```

O que mais dá para editar no mesmo arquivo:

- `copy` — headline, descrição, tags, textos de posicionamento e de contato
- `navigation` — itens do menu
- `partnershipFormats` — os oito formatos de parceria (sem preço, por decisão)
- `brands` — **vazio**. Preencha com as marcas reais; enquanto estiver vazio a seção
  inteira não é renderizada (melhor do que uma fileira de caixas vazias)
- `cases` — **três slots com `filled: false`**. Preencha os dados e troque para
  `filled: true`; enquanto isso o card aparece como espaço reservado, sem número falso
- `periods` — os três períodos do seletor

### Foto do Hero

Coloque o arquivo em **`public/assets/marcos-maia.png`** (aceita `.jpg`/`.webp` — ajuste
o caminho em `creatorConfig.photo`). Recomendado: retrato vertical, ~1200×1500 px.

Sem o arquivo, o Hero cai num monograma elegante em vez de mostrar imagem quebrada — mas
a foto é o elemento mais forte da primeira dobra, então vale colocar.

Coloque também **`public/assets/og-image.png`** (1200×630) para o card de
compartilhamento no WhatsApp, LinkedIn e X.

### Domínio

Ao publicar num domínio diferente, atualize:

1. `creatorConfig.siteUrl` em `src/config.js`
2. As tags `canonical`, `og:url` e `og:image` em `index.html`

## 8. Deploy

### Vercel (recomendado — a serverless function já está configurada)

```bash
npm i -g vercel
vercel link
vercel env add WINDSOR_API_KEY production
vercel env add DEMO_MODE production          # digite: false
vercel env add REVALIDATE_TOKEN production   # um token aleatório
vercel --prod
```

Ou conecte o repositório em <https://vercel.com/new> e cadastre as mesmas variáveis em
**Settings → Environment Variables**. O `vercel.json` já define build, headers de
segurança e cache de assets.

**Antes de publicar**, rode o diagnóstico:

```bash
npm run lint:data
```

Ele consulta a API real e informa, item a item, o que está disponível para a sua conta.

### Forçar atualização fora do ciclo de cache

```bash
curl "https://seu-dominio.com/api/metrics?refresh=1&token=SEU_REVALIDATE_TOKEN"
```

### Outras hospedagens

Qualquer plataforma com funções serverless em Node serve (Netlify, Cloudflare Pages).
Só é preciso rotear `/api/metrics` para `api/metrics.js` — o handler usa a assinatura
padrão `(req, res)` do Node.

---

## Arquitetura

```
/api
  metrics.js              serverless: rate limit, cache HTTP, tratamento de erro

/src
  config.js               ⚙️ TUDO que é editável mora aqui
  main.js                 monta a página e liga estado → interface

  /services
    windsor.js            cliente HTTP do Windsor.ai (só servidor)
    normalize.js          linhas cruas → view-model
    metrics.js            orquestra consulta + normalização + cache
    cache.js              memória → disco → CDN
    demo-data.js          ⚠️ mocks (só com DEMO_MODE=true)
    api.js                cliente do navegador → /api/metrics

  /sections               hero, impacto, performance, engajamento, conteúdos,
                          audiência, posicionamento, formatos, marcas, cases,
                          contato, header, footer
  /components             metric-card, content-card, trend, states, icons,
                          period-selector
  /charts                 area-chart, bar-compare, ranking-bars, donut, scale
  /hooks                  store, reveal, counter
  /utils                  format (pt-BR), dates, dom
  /styles                 tokens, base, components, sections, charts

/tests                    testes sobre uma amostra REAL da Windsor.ai
/scripts/check-windsor.js diagnóstico da integração
```

**Separação de camadas.** Nenhum componente visual fala com a API. O fluxo é sempre
`windsor.js → normalize.js → /api/metrics → api.js → store → seções`.

### Cache

```
Windsor.ai → serverless → memória → disco (/tmp) → CDN (s-maxage) → navegador
```

As métricas do Instagram fecham uma vez por dia, então o TTL padrão é de 6 h: o
fechamento do dia aparece poucas horas depois de existir, sem consultar a Windsor a cada
visita. A borda da CDN absorve a maior parte do tráfego.

Se a Windsor cair, o handler serve a **última leitura real** conhecida, marcada como
desatualizada (o ponto ao lado de "Última sincronização" fica âmbar) — melhor do que uma
tela de erro.

### Decisões técnicas

**Vanilla JS + Vite, sem framework.** A página é estática com um único payload de dados e
troca de período em memória. React ou Next adicionariam runtime e build sem resolver
nenhum problema real aqui. O bundle final tem **~20 KB de JS e ~8 KB de CSS**, gzipados.

**Gráficos em SVG próprio, sem Chart.js/ApexCharts/Recharts.** As quatro visualizações
usadas (área temporal, comparativo, ranking horizontal, donut) cabem em ~6 KB e dão
controle total sobre traço, gradiente, tooltip e comportamento de toque. Uma biblioteca
pronta custaria 50–150 KB gzipados para entregar menos aderência ao design.

**Curva monotônica (Fritsch–Carlson) na linha do tempo.** Suaviza sem criar "barrigas"
que sugeririam valores fora do intervalo real — num material comercial isso importa.

**Semanas incompletas das pontas ficam fora do gráfico de 180 dias.** A janela raramente
começa numa segunda e termina num domingo; plotar uma semana de 1 dia ao lado de semanas
de 7 criaria um mergulho que não existe. Os totais continuam calculados dia a dia, sem
descartar nenhuma data.

**Taxa de engajamento = contas engajadas ÷ alcance.** Mede quem reagiu entre quem de fato
viu o conteúdo. Dividir por seguidores infla o número em perfis com alta distribuição —
não é a conta honesta.

**Fatias "não informado" saem do cálculo demográfico.** O Instagram devolve uma parcela
sem gênero/idade declarados. Ela é excluída para que os percentuais representem quem
declarou, e isso está escrito na própria interface.

### Acessibilidade e performance

- `prefers-reduced-motion` desliga todas as animações, inclusive a contagem dos números
- Navegação por teclado no seletor de períodos (padrão ARIA de `tablist`)
- Skip link, `aria-label` nos gráficos, foco visível
- Imagens com `loading="lazy"` (exceto o retrato do Hero, que é o LCP)
- Fonte carregada sem bloquear a primeira pintura
- Zero rolagem horizontal acidental de 320 px a 1920 px (verificado)
- Miniaturas do CDN da Meta expiram; o card cai num fundo com o texto do post em vez de
  mostrar imagem quebrada

### Segurança

- Credenciais só no servidor, via `.env`; `.env` no `.gitignore`
- Rate limit por IP em `/api/metrics`
- `?refresh=1` protegido por `REVALIDATE_TOKEN`
- Mensagens de erro públicas não expõem detalhe interno (o log fica no servidor)
- Headers `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`,
  `Permissions-Policy` no `vercel.json`

---

## Checklist antes de publicar

- [ ] `DEMO_MODE=false` no ambiente de produção
- [ ] `WINDSOR_API_KEY` cadastrada na Vercel (não no repositório)
- [ ] `npm run lint:data` passou
- [ ] Foto em `public/assets/marcos-maia.png`
- [ ] `og-image.png` em `public/assets/`
- [ ] WhatsApp preenchido em `src/config.js` (ou deixado como "Em breve" de propósito)
- [ ] `brands` preenchido com marcas reais (ou mantido vazio)
- [ ] `cases` preenchidos com números reais (ou mantidos como espaço reservado)
- [ ] `siteUrl` e as tags canonical/OG apontando para o domínio final
