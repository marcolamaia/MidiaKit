/**
 * CONTATO — o fecho comercial.
 *
 * Canais são montados a partir de `creatorConfig`. Nada é inventado: um canal
 * sem valor configurado aparece como "Em breve", desabilitado, em vez de
 * apontar para um telefone ou e-mail que não existe.
 */

import { el } from '../utils/dom.js'
import { icon } from '../components/icons.js'
import { copy, creatorConfig } from '../config.js'

function mailtoUrl() {
  if (!creatorConfig.email) return null
  const subject = encodeURIComponent(copy.contact.subjectTemplate)
  return `mailto:${creatorConfig.email}?subject=${subject}`
}

function whatsappUrl() {
  if (!creatorConfig.whatsapp) return null
  const digits = String(creatorConfig.whatsapp).replace(/\D/g, '')
  if (!digits) return null
  return `https://wa.me/${digits}?text=${encodeURIComponent(copy.contact.whatsappTemplate)}`
}

function channel({ iconName, label, value, href, pending }) {
  const body = [
    el('span', { className: 'channel-icon' }, [icon(iconName)]),
    el('span', { className: 'channel-body' }, [
      el('span', { className: 'channel-label', text: label }),
      el('span', { className: 'channel-value', text: value }),
    ]),
  ]

  if (!href) {
    return el('div', {
      className: 'channel channel--pending',
      attrs: { title: pending || 'Canal ainda não configurado' },
    }, body)
  }

  return el('a', {
    className: 'channel',
    attrs: {
      href,
      ...(href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {}),
    },
  }, [...body, el('span', { className: 'channel-arrow' }, [icon('arrowRight')])])
}

export function renderContact() {
  const mail = mailtoUrl()
  const whats = whatsappUrl()
  // Ordem de preferência para o CTA principal: WhatsApp → e-mail → Instagram.
  const primaryHref = whats || mail || creatorConfig.instagram

  return el('section', { className: 'section contact', attrs: { id: 'contato' } }, [
    el('div', { className: 'container' }, [
      el('div', { className: 'contact-card', attrs: { 'data-reveal': '' } }, [
        el('div', { className: 'contact-glow', attrs: { 'aria-hidden': 'true' } }),

        el('div', { className: 'contact-main' }, [
          el('h2', { className: 'contact-title', text: copy.contact.title }),
          el('p', { className: 'contact-text', text: copy.contact.description }),
          el('div', { className: 'contact-actions' }, [
            el('a', {
              className: 'btn btn--primary',
              attrs: {
                href: primaryHref,
                ...(primaryHref.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {}),
              },
            }, [copy.contact.primaryCta, icon('send')]),
            el('a', {
              className: 'btn btn--secondary',
              attrs: {
                href: creatorConfig.instagram,
                target: '_blank',
                rel: 'noopener noreferrer',
              },
            }, [copy.contact.secondaryCta, icon('instagram')]),
          ]),
        ]),

        el('div', { className: 'contact-channels' }, [
          el('h3', { className: 'contact-channels-title', text: 'Me encontre' }),
          channel({
            iconName: 'instagram',
            label: 'Instagram',
            value: creatorConfig.username,
            href: creatorConfig.instagram,
          }),
          channel({
            iconName: 'whatsapp',
            label: 'WhatsApp',
            value: whats ? 'Conversar agora' : 'Em breve',
            href: whats,
            pending: 'Configure `whatsapp` em src/config.js para ativar este canal.',
          }),
          channel({
            iconName: 'mail',
            label: 'E-mail',
            value: creatorConfig.email || 'Em breve',
            href: mail,
            pending: 'Configure `email` em src/config.js para ativar este canal.',
          }),
        ]),
      ]),
    ]),
  ])
}
