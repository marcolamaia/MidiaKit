/**
 * ---------------------------------------------------------------------------
 * ⚠️  DADOS FICTÍCIOS — MODO DEMONSTRAÇÃO APENAS
 * ---------------------------------------------------------------------------
 * TODOS os números deste arquivo são INVENTADOS. Existem só para desenvolver e
 * testar o layout enquanto a Windsor.ai não está configurada.
 *
 * Este módulo só é carregado quando `DEMO_MODE=true`. Com `DEMO_MODE=false`
 * (produção) nada daqui é executado: sem dado real, a interface mostra estado
 * "sem dados" — nunca um número fictício.
 *
 * A resposta imita o FORMATO CRU da Windsor.ai de propósito, para que os mocks
 * passem exatamente pelo mesmo pipeline de normalização que o dado real.
 * ---------------------------------------------------------------------------
 */

import { addDays, dateRange } from '../utils/dates.js'

/** PRNG determinístico (mulberry32) — o mock é sempre igual entre execuções. */
function makeRandom(seed) {
  let t = seed
  return () => {
    t += 0x6d2b79f5
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

/** MOCK: perfil. */
export function demoProfileRows() {
  return [
    {
      username: 'marcolamaia',
      name: 'Marcos Maia',
      followers_count: 1234567,
      follows_count: 512,
      media_count: 640,
      biography: '[DEMO] Bio fictícia usada apenas no modo demonstração.',
      website: 'https://example.com',
      user_id: '0000000000',
    },
  ]
}

/** MOCK: série diária no intervalo pedido. */
export function demoDailyRows(from, to) {
  const random = makeRandom(20260825)
  return dateRange(from, to).map((date, index) => {
    const weekday = new Date(`${date}T00:00:00Z`).getUTCDay()
    const weekendDip = weekday === 0 || weekday === 6 ? 0.82 : 1
    const wave = 1 + Math.sin(index / 6) * 0.22
    const noise = 0.85 + random() * 0.3

    const reach = Math.round(240000 * wave * weekendDip * noise)
    const views = Math.round(reach * (1.5 + random() * 0.4))
    const engaged = Math.round(reach * (0.11 + random() * 0.03))
    const likes = Math.round(engaged * (0.7 + random() * 0.15))
    const comments = Math.round(engaged * (0.03 + random() * 0.02))
    const shares = Math.round(engaged * (0.3 + random() * 0.12))
    const saves = Math.round(engaged * (0.2 + random() * 0.1))

    return {
      date,
      reach,
      views,
      accounts_engaged: engaged,
      total_interactions: likes + comments + shares + saves,
      likes,
      comments,
      shares,
      saves,
      replies: Math.round(random() * 40),
      follower_count: Math.round(1800 + random() * 2600),
    }
  })
}

const DEMO_CAPTIONS = [
  '[DEMO] 5 apps de IA que mudaram meu fluxo de trabalho',
  '[DEMO] Esse acessório mudou meu setup inteiro',
  '[DEMO] Vale a pena o celular topo de linha em 2026?',
  '[DEMO] O drone que me acompanha sozinho',
  '[DEMO] Transformei meu quarto num estúdio',
  '[DEMO] Os 7 melhores produtos tech do ano',
  '[DEMO] Automatizei minha casa inteira por menos do que imaginam',
  '[DEMO] Testei por 30 dias e o resultado surpreendeu',
  '[DEMO] O truque de bateria que ninguém te conta',
  '[DEMO] Comparativo: o que realmente entrega o que promete',
]

/** MOCK: publicações. */
export function demoMediaRows(from, to) {
  const random = makeRandom(777)
  const days = dateRange(from, to)
  const rows = []

  // Publica a cada ~1,5 dia, do mais recente para o mais antigo — densidade
  // parecida com a do perfil real, garantindo conteúdo em todas as janelas.
  for (let offset = 0; offset < days.length; offset += 1) {
    if (offset % 3 === 1) continue
    const i = rows.length
    const date = days[days.length - 1 - offset]
    const isReel = i % 7 !== 3
    const views = Math.round(90000 + random() * 900000)
    const reach = Math.round(views * (0.6 + random() * 0.15))
    const likes = Math.round(reach * (0.04 + random() * 0.04))
    const comments = Math.round(likes * (0.03 + random() * 0.06))
    const shares = Math.round(likes * (0.15 + random() * 0.5))
    const saves = Math.round(likes * (0.1 + random() * 0.5))

    rows.push({
      media_id: `demo-${i}`,
      media_type: isReel ? 'REELS' : 'CAROUSEL_ALBUM',
      media_product_type: isReel ? 'REELS' : 'FEED',
      timestamp: `${date}T18:0${i % 6}:00+0000`,
      media_permalink: 'https://www.instagram.com/marcolamaia/',
      media_thumbnail_url: null, // sem imagem: a UI usa o fallback visual
      media_url: null,
      media_caption: DEMO_CAPTIONS[i % DEMO_CAPTIONS.length],
      media_views: views,
      media_reach: reach,
      media_like_count: likes,
      media_comments_count: comments,
      media_shares: shares,
      media_saved: saves,
      media_engagement: likes + comments + shares + saves,
    })
  }
  return rows
}

/** MOCK: métricas de retenção de Reels. */
export function demoReelRows(mediaRows) {
  const random = makeRandom(31337)
  return mediaRows
    .filter((row) => row.media_product_type === 'REELS')
    .map((row) => ({
      media_id: row.media_id,
      media_reel_avg_watch_time: Math.round(12000 + random() * 22000),
      media_reel_total_watch_time: Math.round(row.media_views * (14000 + random() * 8000)),
      media_reel_total_interactions: row.media_engagement,
      media_reel_skip_rate: Math.round((0.3 + random() * 0.3) * 1000) / 1000,
    }))
}

/** MOCK: demografia. */
export const demoAudience = {
  age: [
    { audience_age_name: '13-17', audience_age_size: 42000 },
    { audience_age_name: '18-24', audience_age_size: 198000 },
    { audience_age_name: '25-34', audience_age_size: 471000 },
    { audience_age_name: '35-44', audience_age_size: 318000 },
    { audience_age_name: '45-54', audience_age_size: 141000 },
    { audience_age_name: '55-64', audience_age_size: 44000 },
    { audience_age_name: '65+', audience_age_size: 14000 },
  ],
  gender: [
    { audience_gender_name: 'M', audience_gender_size: 812000 },
    { audience_gender_name: 'F', audience_gender_size: 291000 },
    { audience_gender_name: 'U', audience_gender_size: 118000 },
  ],
  city: [
    { city: 'São Paulo, São Paulo (state)', audience_city_size: 104000 },
    { city: 'Rio de Janeiro, Rio de Janeiro (state)', audience_city_size: 76000 },
    { city: 'Belo Horizonte, Minas Gerais', audience_city_size: 21000 },
    { city: 'Salvador, Bahia', audience_city_size: 19500 },
    { city: 'Brasília, Federal District', audience_city_size: 18200 },
    { city: 'Curitiba, Paraná', audience_city_size: 13100 },
    { city: 'Fortaleza, Ceará', audience_city_size: 12800 },
    { city: 'Porto Alegre, Rio Grande do Sul', audience_city_size: 11400 },
  ],
  country: [
    { audience_country_name: 'BR', audience_country_size: 1140000 },
    { audience_country_name: 'PT', audience_country_size: 22000 },
    { audience_country_name: 'US', audience_country_size: 9500 },
    { audience_country_name: 'AO', audience_country_size: 8200 },
    { audience_country_name: 'MZ', audience_country_size: 4100 },
    { audience_country_name: 'ES', audience_country_size: 2600 },
  ],
}

/** MOCK: Stories — vazio de propósito, para exercitar o estado "sem dados". */
export function demoStoryRows() {
  return []
}

export { addDays }
