# Apresentação — Media Kit Marcos Maia 2026

Deck comercial de 13 slides em 16:9, reconstruído a partir do media kit de setembro,
com métricas novas e identidade visual **VOLT** (preto e roxo, pegada tech).

Saem quatro coisas do mesmo código-fonte:

| Arquivo | Para que serve |
|---|---|
| `media-kit-marcos-maia-2026-leve.pdf` | **O que vai para a marca.** ~1,3 MB, uma JPEG por página. Abre em qualquer celular e passa em qualquer e-mail. |
| `media-kit-marcos-maia-2026.pdf` | ~2,8 MB, vetorial. Texto selecionável e nitidez total no zoom — bom para impressão. |
| `media-kit-marcos-maia-2026.html` | Arquivo único, tudo embutido. Abre offline e é a versão mais bonita: mantém o grão e os brilhos que saem na impressão. |
| `preview/slide-NN.jpg` | Conferência rápida sem abrir o PDF. |

### Por que existem duas versões de PDF

Blur, `drop-shadow` e sombra grande viram **máscara de transparência** no PDF. O
Chromium rasteriza cada uma por página, o arquivo engorda e leitor de celular
trava tentando desenhar — duas páginas chegaram a carregar 1,4 MB só de máscara.
A regra do `@media print` no `styles.css` derruba as camadas de área grande e
mantém os brilhos pequenos, que custam quase nada: só isso levou o PDF vetorial
de 6 MB para 2,8 MB.

A versão leve vai além: cada página é uma foto. O leitor decodifica uma JPEG e
acabou, sem desenhar nada. É a cópia para mandar por WhatsApp e e-mail. O
`jpeg-pdf.mjs` monta esse PDF sem biblioteca nenhuma — JPEG entra no PDF sem
recompressão, pelo filtro `DCTDecode`.

## Gerar

```bash
npm run deck          # gera o HTML único, o PDF e os previews
npm run deck:check    # confere se algum slide estoura a área útil
```

O build usa o Chromium do Playwright. Se a máquina já tiver um Chromium instalado
em outro caminho, aponte com `CHROMIUM_PATH=/caminho/do/chrome npm run deck`.

## Estrutura

```
deck.html      os 13 slides, um <section class="slide"> cada
styles.css     o sistema visual inteiro (tokens no :root)
fonts.css      Space Grotesk + JetBrains Mono em base64, para abrir sem internet
build.mjs      embute tudo, imprime os dois PDF e tira os previews
jpeg-pdf.mjs   monta o PDF leve a partir das JPEG, sem dependência
assets/        logo, fotos recortadas, logos das marcas, prints
```

## Os slides

```
01  Capa
02  Sobre mim
03  O alcance em números          Instagram, 30 dias, + o TikTok somado
04  Como o alcance acontece       52,5% de não seguidores, formatos
05  Quem assiste                  gênero e faixa etária
06  Onde e quando                 países, cidades, horário de pico
07  O que converte                conteúdos que mais trouxeram seguidor
08  O TikTok em números           origem do tráfego, engajamento, perfil
09  Insights — Instagram          prints do aplicativo
10  Insights — TikTok             prints do aplicativo
11  Parcerias recentes
12  Entrega e investimento
13  Canais oficiais e assessoria
```

## Colocar os prints reais

Os slides 09 e 10 mostram as capturas de tela dos aplicativos. Enquanto o arquivo
não existe, o slide desenha um espaço reservado com a proporção certa — nada quebra.

Salve os PNG com estes nomes e rode `npm run deck` de novo:

```
assets/screenshots/ig-01-visao-geral.png     Visão geral — todos os conteúdos, 30 dias
assets/screenshots/ig-02-seguidores.png      Público — seguidores e crescimento
assets/screenshots/ig-03-genero-idade.png    Público — gênero e faixa etária
assets/screenshots/ig-04-paises.png          Público — países e horários
assets/screenshots/ig-05-cidades.png         Público — cidades e horários
assets/screenshots/tt-01-visao-geral.png     TikTok — visão geral e origem de tráfego
assets/screenshots/tt-02-espectadores.png    TikTok — espectadores e gênero
assets/screenshots/tt-03-idade.png           TikTok — idade e horários ativos
assets/screenshots/tt-04-localizacoes.png    TikTok — localizações
```

Print de celular em pé, sem cortar nem editar. O slide encaixa pela altura e mantém
a proporção — não precisa redimensionar nada antes.

## Trocar as fotos

`assets/marcos-apontando.png` (capa) e `assets/marcos-sorrindo.png` (sobre mim).
PNG com fundo transparente. As atuais foram extraídas do media kit anterior e têm
resolução baixa (≈600 px de altura); trocar por fotos maiores melhora o PDF. Numa
paleta preta e roxa, foto com roupa escura fica melhor do que camiseta branca.

## O sistema visual — VOLT

Tudo sai dos tokens no topo do `styles.css`:

```css
--ink      #050409   preto, com um viés violeta muito leve
--violet   #A855F7   roxo principal
--violet-l #D8B4FE   roxo claro, usado nas unidades e nos destaques
--grad     linear-gradient(112deg, #7C3AED, #A855F7, #D8B4FE)
--r        4px       canto vivo, não arredondado
```

A linguagem é de interface técnica: trilho de índice na borda esquerda, rótulos em
JetBrains Mono, cantoneiras de HUD nos painéis de destaque, grade de pontos no fundo
e brilho roxo como fonte de luz.

Regras que o deck segue nos gráficos:

- **Uma matiz para magnitude.** As barras de faixa etária, países, cidades e origem
  de tráfego são todas roxas; só a barra de maior valor recebe o degradê, para
  funcionar como rótulo visual do destaque.
- **Duas categorias se separam por claridade, não por matiz.** Gênero e
  seguidor × não seguidor usam roxo médio contra lavanda claro, sempre com legenda
  e rótulo direto — a diferença sobrevive a daltonismo e a impressão em cinza.
- **Rótulo direto em toda barra**, sem legenda solta quando há uma série só.
- **Texto usa token de texto**, nunca a cor da série.

## Fonte dos números

Nenhum número foi estimado.

- **Instagram:** prints do próprio aplicativo, janela de 30 dias, capturados em
  **08/09/2026, 09h24**.
- **TikTok:** TikTok Analytics, janela de **9 de julho a 6 de setembro** (60 dias),
  capturado em **08/09/2026, 09h25**.

Dois valores merecem atenção:

- **Interações do Instagram.** O print corta o último dígito (`2.013.14…`), então o
  deck mostra **2,01 mi**.
- **As duas janelas são diferentes.** O Instagram entrega 30 dias e o TikTok, 60. Onde
  os dois aparecem somados (capa e slide 03), o TikTok entra dividido por dois —
  13,1 mi na janela vira 6,55 mi/mês — para ficar na mesma base do Instagram. Daí o
  total de **27,6 mi de visualizações por mês**. O slide 08 mostra o TikTok cru, com
  a janela de 60 dias declarada no topo.
