# Perninha BarberShop — Freguesia

Site institucional de página única. HTML autossuficiente: CSS e JavaScript
inline, sem framework e sem build. Basta subir os arquivos desta pasta na
raiz do domínio.

## Arquivos

| Arquivo       | O que é                                  |
|---------------|------------------------------------------|
| `index.html`  | o site inteiro                           |
| `hero.jpg`    | foto de fundo do hero (**você adiciona**) |
| `robots.txt`  | liberação para buscadores                |
| `sitemap.xml` | mapa do site                             |

## 1. A foto do hero

Salve a foto nesta pasta com o nome exato **`hero.jpg`**.

O site detecta sozinho: se o arquivo existir, a foto entra como fundo do
primeiro bloco com o véu de leitura já calibrado; se não existir, ele cai
no tratamento gráfico (monograma e textura) sem quebrar nada.

Recomendado: 1600–2200px de largura, JPEG salvo em qualidade 80–85, abaixo
de 400 KB. O ponto de foco é o lado direito da imagem (`object-position:
72%`), então a cena principal deve estar à direita e a área da esquerda
pode ser mais escura — é onde o texto fica.

Para usar outro enquadramento, ajuste `object-position` em `.hero__photo img`.

## 2. Trocar o domínio antes de publicar

O domínio `perninhabarbershop.com.br` é um placeholder. Substitua em:

- `index.html` — `canonical`, `og:url`, `og:image`, `twitter:image` e o
  campo `url` do bloco JSON-LD
- `robots.txt` — linha `Sitemap:`
- `sitemap.xml` — todas as tags `<loc>`

## 3. Fontes

- **Oswald** e **Inter** — Google Fonts, carregadas pelo `<link>` no topo.
- **Road Rage** — Youssef Habchi, 2016. Arquivo local `road-rage.woff2`,
  servido pelo próprio site (não é a Road Rage do Google Fonts, que é de
  outro autor e tem desenho diferente).

### Licença da Road Rage

O arquivo que veio com a fonte diz: **free for personal use only**. Um site
de barbearia é uso comercial, então antes de publicar vale fechar a licença
comercial com o autor: **contact@youssef-habchi.com** (site:
youssef-habchi.com). Enquanto isso não acontece, dá para trocar a segunda
linha do hero por qualquer outra fonte sem mexer no resto do layout.

### Sobre o arquivo da fonte

`road-rage.woff2` tem 62 KB e é um subset só com **A–Z maiúsculo** — que é
o único uso dela no site. O original completo está em
`Road_Rage-original.otf` (334 KB).

Para regerar o subset com outros caracteres:

```
pip install fonttools brotli
pyftsubset Road_Rage-original.otf --flavor=woff2 \
  --output-file=road-rage.woff2 \
  --text="ABCDEFGHIJKLMNOPQRSTUVWXYZ" \
  --layout-features=kern --desubroutinize
```

Se você trocar a fonte da segunda linha, recalibre o `font-size` de
`.hero__title .l2`: ele está ajustado para a palavra BARBERSHOP fechar
exatamente na mesma largura de PERNINHA em qualquer tela.

## 4. Dados que o site usa

Agendamento aponta para o Trinks (`trinks.com/perninhabarbeshop`) e o
WhatsApp para `wa.me/552121484406`. O aviso "aberto agora / fechado" é
calculado em JavaScript no fuso `America/Sao_Paulo` a partir do horário
oficial da unidade — para mudar o horário, edite o objeto `SCHEDULE` no
final do `index.html` e a lista de dias na seção Localização.
