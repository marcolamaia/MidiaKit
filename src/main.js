/**
 * ---------------------------------------------------------------------------
 * PONTO DE ENTRADA
 * ---------------------------------------------------------------------------
 * Monta a página, dispara a busca de métricas e mantém as seções sincronizadas
 * com o estado. As seções estáticas (formatos, cases, posicionamento, contato)
 * aparecem imediatamente; só os blocos de dados passam por skeleton.
 * Se a API falhar, esses blocos mostram o estado de erro e o resto da página
 * continua funcionando normalmente.
 * ---------------------------------------------------------------------------
 */

import './styles/tokens.css'
import './styles/base.css'
import './styles/components.css'
import './styles/sections.css'
import './styles/charts.css'

import { el, qs } from './utils/dom.js'
import { icon } from './components/icons.js'
import { getState, setState, subscribe } from './hooks/store.js'
import { observeReveals } from './hooks/reveal.js'
import { embeddedSnapshot, fetchMetrics } from './services/api.js'
import { DEFAULT_PERIOD } from './config.js'

import { renderHeader } from './sections/header.js'
import { renderHero } from './sections/hero.js'
import { renderImpact } from './sections/impact.js'
import { renderPerformance } from './sections/performance.js'
import { renderEngagement } from './sections/engagement.js'
import { renderContent } from './sections/content.js'
import { renderAudience } from './sections/audience.js'
import { renderWhy } from './sections/why.js'
import { renderFormats } from './sections/formats.js'
import { renderBrands } from './sections/brands.js'
import { renderCases } from './sections/cases.js'
import { renderContact } from './sections/contact.js'
import { renderFooter } from './sections/footer.js'

const app = qs('#app')

setState({ period: DEFAULT_PERIOD })

/* -------------------------------------------------------------------------- */
/* Montagem                                                                   */
/* -------------------------------------------------------------------------- */

const banner = el('div', { className: 'banner-slot' })

// Seções orientadas a dados expõem `update(state)`.
const dataSections = [
  renderImpact(),
  renderPerformance(),
  renderEngagement(),
  renderContent(),
  renderAudience(),
]
const [impact, performance, engagement, content, audience] = dataSections

// O <main> entra primeiro para que os ids das seções já existam quando o
// header montar o scroll-spy. O header é inserido logo depois, como filho
// direto de #app — requisito do `position: sticky`.
app.append(
  banner,
  el('main', { attrs: { id: 'conteudo-principal' } }, [
    renderHero(),
    impact.node,
    performance.node,
    engagement.node,
    content.node,
    audience.node,
    renderWhy(),
    renderFormats(),
    renderBrands(),   // devolve null quando não há marcas configuradas
    renderCases(),
    renderContact(),
  ]),
  renderFooter(),
)

app.insertBefore(renderHeader(), app.querySelector('main'))
observeReveals(document)

/* -------------------------------------------------------------------------- */
/* Estado → interface                                                         */
/* -------------------------------------------------------------------------- */

function showDemoBanner() {
  if (banner.childElementCount) return
  banner.append(
    el('div', { className: 'demo-banner', attrs: { role: 'status' } }, [
      icon('alert'),
      el('span', { text: 'Modo demonstração — os números desta página são fictícios' }),
    ]),
  )
}

function render(state) {
  for (const section of dataSections) section.update(state)
  if (state.status === 'ready' && state.data?.meta?.demo) showDemoBanner()
}

subscribe(render)

/* -------------------------------------------------------------------------- */
/* Carregamento                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Carrega as métricas.
 *
 * Na versão de arquivo único existe um snapshot embutido: ele pinta a página
 * imediatamente, sem rede. Em seguida tentamos `/api/metrics` — se o arquivo
 * estiver hospedado ao lado da serverless function, os dados ao vivo assumem.
 * Se não estiver, a falha é silenciosa: o snapshot já está na tela e não faz
 * sentido mostrar erro por cima de um dado válido.
 */
async function load() {
  const snapshot = embeddedSnapshot()

  if (snapshot) {
    setState({ status: 'ready', data: snapshot, error: null })
  } else {
    setState({ status: 'loading', error: null })
  }

  // Aberto direto do disco (file://), não existe `/api/metrics` para chamar —
  // e a tentativa só produziria um erro de CORS no console de quem abrir o
  // inspetor. O snapshot embutido já é a resposta correta aqui.
  if (snapshot && globalThis.location?.protocol === 'file:') return

  try {
    const data = await fetchMetrics()
    setState({ status: 'ready', data, error: null })
  } catch (error) {
    console.warn('[media-kit] métricas ao vivo indisponíveis:', error.code, error.message)
    // Com snapshot na tela, a página continua correta e completa.
    if (snapshot) return
    // Sem snapshot, a falha fica contida nas seções de dados e o restante do
    // Media Kit segue navegável.
    setState({ status: 'error', error: { code: error.code, message: error.message } })
  }
}

// `retry` viaja no estado para que os botões "Tentar de novo" dentro das
// seções não precisem importar nada daqui.
getState().retry = load

render(getState())
load()

// Quando a aba volta a ficar visível depois de um bom tempo, revalida —
// as métricas são diárias, então só faz sentido acima de meia hora.
let lastLoad = Date.now()
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return
  if (Date.now() - lastLoad < 30 * 60 * 1000) return
  lastLoad = Date.now()
  load()
})
