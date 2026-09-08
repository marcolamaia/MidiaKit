# Apresentação — Media Kit Marcos Maia 2026

Deck comercial de 12 slides em 16:9, reconstruído a partir do media kit de setembro,
com métricas novas e identidade visual nova (**PRISMA**).

Saem dois arquivos do mesmo código-fonte:

| Arquivo | Para que serve |
|---|---|
| `media-kit-marcos-maia-2026.pdf` | O que vai para a marca. 12 páginas 16:9, ~5 MB. |
| `media-kit-marcos-maia-2026.html` | Arquivo único, tudo embutido. Abre offline, com dois cliques. |
| `preview/slide-NN.jpg` | Conferência rápida sem abrir o PDF. |

## Gerar

```bash
npm run deck          # gera o HTML único, o PDF e os previews
npm run deck:check    # confere se algum slide estoura a área útil
```

O build usa o Chromium do Playwright. Se a máquina já tiver um Chromium instalado
em outro caminho, aponte com `CHROMIUM_PATH=/caminho/do/chrome npm run deck`.

## Estrutura

```
deck.html      os 12 slides, um <section class="slide"> cada
styles.css     o sistema visual inteiro (tokens no :root)
fonts.css      Sora + Inter em base64, para o arquivo abrir sem internet
build.mjs      embute tudo e imprime o PDF
assets/        logo, fotos recortadas, logos das marcas, prints
```

## Colocar os prints reais

Os slides 08 e 09 mostram as capturas de tela dos aplicativos. Enquanto o arquivo
não existe, o slide desenha um espaço reservado com a proporção certa — nada quebra.

Basta salvar os PNG com estes nomes e rodar `npm run deck` de novo:

```
assets/screenshots/ig-01-visao-geral.png     Visão geral — todos os conteúdos, 30 dias
assets/screenshots/ig-02-seguidores.png      Público — seguidores e crescimento
assets/screenshots/ig-03-genero-idade.png    Público — gênero e faixa etária
assets/screenshots/ig-04-paises.png          Público — países e horários
assets/screenshots/ig-05-cidades.png         Público — cidades e horários
assets/screenshots/tt-01.png                 TikTok — visão geral
assets/screenshots/tt-02.png                 TikTok — espectadores
assets/screenshots/tt-03.png                 TikTok — localizações
```

Print de celular em pé, sem cortar nem editar. O slide encaixa pela altura e mantém
a proporção — não precisa redimensionar nada antes.

## Trocar as fotos

`assets/marcos-apontando.png` (capa) e `assets/marcos-sorrindo.png` (sobre mim).
PNG com fundo transparente. As atuais foram extraídas do media kit anterior e têm
resolução baixa (≈600 px de altura); trocar por fotos maiores melhora o PDF.

## O sistema visual

Tudo sai dos tokens no topo do `styles.css`:

```css
--ink    #05050A   preto profundo
--prism  gradiente #FF2D9B → #C049F5 → #6B7BFF → #00E5FF → #6EF7A5 → #B6FF3C
--data   #00E5FF   cor de magnitude nos gráficos (matiz única)
```

Regras que o deck segue nos gráficos:

- **Uma matiz para magnitude.** As barras de faixa etária, países e cidades são
  todas cianas; só a barra de maior valor recebe o gradiente do prisma, para
  funcionar como rótulo visual do destaque.
- **O gradiente é do destaque, não da série.** Nunca todas as barras coloridas.
- **Rótulo direto em toda barra**, sem legenda solta, quando há uma série só.
- **Duas categorias** (gênero, seguidor × não seguidor) usam duas matizes e sempre
  vêm com legenda, porque aí a cor carrega identidade e não magnitude.
- **Texto usa token de texto**, nunca a cor da série.

## Fonte dos números

Nenhum número foi estimado.

- Instagram: prints do próprio aplicativo, janela de 30 dias, capturados em
  **08/09/2026, 09h24**.
- TikTok: TikTok Analytics, capturado em **02/09/2026** (números do media kit
  anterior — trocar quando chegarem os prints novos).

O único valor arredondado é o de interações: o print corta o último dígito
(`2.013.14…`), então o deck mostra **2,01 mi**.
