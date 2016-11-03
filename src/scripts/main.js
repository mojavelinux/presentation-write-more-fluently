var bespoke = require('bespoke'),
  //bullets = require('bespoke-bullets'),
  classes = require('bespoke-classes'),
  extern = require('bespoke-extern'),
  hash = require('bespoke-hash'),
  multimedia = require('bespoke-multimedia'),
  nav = require('bespoke-nav'),
  overview = require('bespoke-overview'),
  scale = require('bespoke-scale');

bespoke.from({ parent: 'article.deck', slides: 'section' }, [
  classes(),
  scale(),
  nav(),
  overview(),
  //bullets('.build, .build-items > *:not(.build-items)'),
  hash(),
  multimedia(),
  function (deck) {
    const metas = {}
    Array.from(document.querySelectorAll('head meta')).forEach((meta) => {
        metas[meta.getAttribute('name')] = meta.getAttribute('content')
    })

    const steps = deck.slides.map((slide, slideIdx) => {

      const notes = [].slice.call(slide.querySelectorAll('aside[role="note"] p, aside[role="note"] li'))
        .map((note) => note.textContent)
        .join('\n')

      //if (slide.bullets.length > 0) {
      //  return slide.bullets.map((b, bulletIdx) => {
      //    return {
      //      cursor: String(slideIdx) + '.' + String(bulletIdx),
      //      states: [],
      //      notes,
      //    }
      //  })
      //}

      return {
        cursor: String(slideIdx),
        states: [],
        notes
      }
    })

    const details = {
      title: document.title || '',
      authors: metas.author || '',
      description: metas.description || '',
      vendor: 'bespoke.js',
      steps,
      ratios: ['16/9'],
      themes: ['default']
    }

    window.addEventListener('message', ({ source, data: { command, commandArgs } }) => {

      switch (command) {

        case 'get-slide-deck-details':
          source.postMessage({ event: 'slide-deck-details', eventData: { details } }, '*')
          break;

        case 'go-to-step':
          const { cursor } = commandArgs
          const [slideIdx, subslideIdx] = cursor.split('.')
          deck.slide(Number(slideIdx))
          deck.activateBullet(Number(slideIdx), Number(subslideIdx))
          break;

        default:
          console.debug(`unknown protocol command ${command} with args`, commandArgs)
      }
    })
  },
  extern(bespoke)
]);
