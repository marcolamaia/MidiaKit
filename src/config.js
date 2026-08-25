/**
 * ---------------------------------------------------------------------------
 * CONFIGURAÇÃO CENTRAL DO MEDIA KIT
 * ---------------------------------------------------------------------------
 * Tudo que é editável (textos, links, contatos, marcas, cases, formatos de
 * parceria) mora AQUI. Nenhum desses valores deve ser espalhado pelo código.
 *
 * ⚠️  NUNCA coloque API Key, token ou segredo neste arquivo — ele é enviado
 *     para o navegador. Credenciais ficam no `.env` e só são lidas pela
 *     serverless function em /api/metrics.js.
 * ---------------------------------------------------------------------------
 */

export const creatorConfig = {
  name: 'Marcos Maia',
  shortName: 'MARCOS MAIA',
  username: '@marcolamaia',
  instagram: 'https://www.instagram.com/marcolamaia/',

  // ⚙️ EDITÁVEL — e-mail comercial. O valor abaixo veio da própria bio do
  // Instagram (@marcolamaia) retornada pela API. Troque se preferir outro.
  email: 'contato@svpubli.com.br',

  // ⚙️ EDITÁVEL — WhatsApp comercial no formato internacional, só dígitos.
  // Ex.: '5511999999999'. Deixe '' (vazio) para o botão aparecer como
  // "Em breve" em vez de apontar para um número inventado.
  whatsapp: '',

  // ⚙️ EDITÁVEL
  location: 'Brasil',
  website: 'https://marcolamaia.com',

  // ⚙️ EDITÁVEL — caminho da foto principal do Hero.
  // Coloque o arquivo em `public/assets/marcos-maia.png` (ou .jpg/.webp).
  // Se o arquivo não existir, o Hero cai num monograma elegante — nada quebra.
  photo: '/assets/marcos-maia.png',
  photoAlt: 'Marcos Maia, criador de conteúdo de tecnologia',

  // ⚙️ EDITÁVEL — imagem de compartilhamento (Open Graph / Twitter Card).
  ogImage: '/assets/og-image.png',

  // ⚙️ EDITÁVEL — domínio final onde o Media Kit será publicado (canonical/OG).
  siteUrl: 'https://mediakit.marcolamaia.com',
}

export const copy = {
  hero: {
    eyebrow: 'Criador de conteúdo',
    headline: ['Tecnologia explicada para', 'milhões', 'de pessoas.'],
    description:
      'Transformo tecnologia, IA e inovação em conteúdo simples, prático e direto ao ponto. Do app ao gadget, da teoria à prática.',
    tags: ['Tecnologia', 'IA', 'Reviews', 'Automação', 'Lifestyle Tech'],
    primaryCta: 'Ver métricas',
    secondaryCta: 'Falar sobre parceria',
  },

  // Seção "Por que Marcos Maia" — argumentos concretos, sem frase genérica.
  why: {
    title: 'Por que Marcos Maia',
    subtitle: 'O que uma marca ganha ao entrar num conteúdo meu.',
    pillars: [
      {
        title: 'Assunto técnico vira conteúdo de alto alcance',
        text: 'Pego tema que normalmente só circula em nicho — IA, automação, ferramenta nova — e entrego numa linguagem que a pessoa comum entende e compartilha.',
      },
      {
        title: 'Demonstração prática, não anúncio',
        text: 'O produto aparece funcionando: tela gravada, resultado real, antes e depois. A pessoa vê o que acontece quando usa, não só o que a marca promete.',
      },
      {
        title: 'Roteiro construído para retenção',
        text: 'Gancho nos primeiros segundos, ritmo curto e payoff no fim. O tempo médio de visualização dos Reels está exposto nesta página — dá para conferir.',
      },
      {
        title: 'Integração natural ao formato do perfil',
        text: 'A publi entra dentro do mesmo formato que o público já consome. Não existe quebra de tom entre conteúdo orgânico e conteúdo pago.',
      },
      {
        title: 'Audiência que consome tecnologia',
        text: 'Público que pesquisa, compara e compra: aplicativo, gadget, ferramenta, assinatura. Perfil demográfico completo está na seção de audiência.',
      },
      {
        title: 'Aplicação real do produto',
        text: 'Mostro o caso de uso concreto — o problema que o produto resolve no dia a dia de quem assiste. É isso que gera comentário, salvamento e compartilhamento.',
      },
    ],
  },

  contact: {
    title: 'Vamos criar algo juntos?',
    description:
      'Estou aberto a novas parcerias, projetos e campanhas. Me manda o briefing (ou só a ideia) e eu volto com formato, cronograma e proposta.',
    primaryCta: 'Solicitar proposta',
    secondaryCta: 'Entrar em contato',
    subjectTemplate: 'Proposta de parceria — [nome da marca]',
    whatsappTemplate:
      'Oi Marcos! Vi seu Media Kit e queria falar sobre uma parceria.',
  },
}

/** Navegação do header. `id` precisa bater com o id da <section>. */
export const navigation = [
  { id: 'visao-geral', label: 'Visão geral' },
  { id: 'performance', label: 'Performance' },
  { id: 'audiencia', label: 'Audiência' },
  { id: 'conteudos', label: 'Conteúdos' },
  { id: 'parcerias', label: 'Parcerias' },
  { id: 'contato', label: 'Contato' },
]

/** Formatos de parceria. Sem preço — o Media Kit gera contato, não tabela. */
export const partnershipFormats = [
  {
    icon: 'reels',
    title: 'Reels patrocinado',
    text: 'Conteúdo integrado ao formato natural do perfil, com o produto dentro do roteiro.',
  },
  {
    icon: 'stories',
    title: 'Stories',
    text: 'Sequência de Stories com demonstração, CTA e tráfego direto para a marca.',
  },
  {
    icon: 'review',
    title: 'Review de produto',
    text: 'Análise prática, opinião sincera e apresentação da tecnologia em uso.',
  },
  {
    icon: 'unboxing',
    title: 'Unboxing',
    text: 'Primeiro contato, primeiras impressões e demonstração na prática.',
  },
  {
    icon: 'campaign',
    title: 'Campanha integrada',
    text: 'Combinação de Reels, Stories e feed dentro de uma estratégia única.',
  },
  {
    icon: 'ugc',
    title: 'UGC',
    text: 'Produção de conteúdo para uso nos canais e nas mídias da própria marca.',
  },
  {
    icon: 'event',
    title: 'Cobertura de eventos',
    text: 'Presença, produção no local e divulgação durante e depois do evento.',
  },
  {
    icon: 'custom',
    title: 'Projetos personalizados',
    text: 'Campanhas que precisam de uma abordagem específica, fora do padrão.',
  },
]

/**
 * MARCAS PARCEIRAS
 * ----------------------------------------------------------------------------
 * ⚠️  PLACEHOLDER — nenhuma marca foi confirmada por Marcos.
 * Preencha a lista abaixo com as marcas reais. Formato:
 *
 *   { name: 'Nome da Marca', logo: '/assets/brands/nome.svg', url: 'https://...' }
 *
 * `logo` é opcional: sem logo, o componente renderiza o nome em wordmark.
 * Enquanto o array estiver vazio, a seção inteira NÃO é renderizada
 * (melhor não ter a seção do que ter uma seção vazia ou com marca inventada).
 */
export const brands = [
  // { name: 'Exemplo', logo: '/assets/brands/exemplo.svg', url: 'https://exemplo.com' },
]

/**
 * CASES DE CONTEÚDO
 * ----------------------------------------------------------------------------
 * ⚠️  PLACEHOLDER — três espaços prontos para preencher.
 * Deixe `filled: false` enquanto não tiver os dados: o card aparece como
 * "slot disponível" (visual honesto) em vez de exibir número falso.
 * Ao preencher, mude para `filled: true`.
 */
export const cases = [
  {
    filled: false,
    brand: '',        // Ex.: 'Realme'
    campaign: '',     // Ex.: 'Lançamento realme 14 Pro'
    objective: '',    // Ex.: 'Awareness de lançamento'
    format: '',       // Ex.: '1 Reels + 3 Stories'
    views: null,      // Ex.: 1240000
    reach: null,      // Ex.: 890000
    interactions: null, // Ex.: 74000
    result: '',       // Ex.: 'Maior pico de menções da marca no trimestre'
    link: '',         // Ex.: 'https://www.instagram.com/reel/...'
  },
  { filled: false, brand: '', campaign: '', objective: '', format: '', views: null, reach: null, interactions: null, result: '', link: '' },
  { filled: false, brand: '', campaign: '', objective: '', format: '', views: null, reach: null, interactions: null, result: '', link: '' },
]

/** Períodos de análise oferecidos no seletor. */
export const periods = [
  { id: '24h', label: '24H', longLabel: 'Últimas 24 horas' },
  { id: '30d', label: '30 DIAS', longLabel: 'Últimos 30 dias' },
  { id: '180d', label: '180 DIAS', longLabel: 'Últimos 180 dias' },
]

export const DEFAULT_PERIOD = '30d'
