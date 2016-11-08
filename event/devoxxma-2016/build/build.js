(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
module.exports = function() {
  return function(deck) {
    var addClass = function(el, cls) {
        el.classList.add('bespoke-' + cls);
      },

      removeClass = function(el, cls) {
        el.className = el.className
          .replace(new RegExp('bespoke-' + cls +'(\\s|$)', 'g'), ' ')
          .trim();
      },

      deactivate = function(el, index) {
        var activeSlide = deck.slides[deck.slide()],
          offset = index - deck.slide(),
          offsetClass = offset > 0 ? 'after' : 'before';

        ['before(-\\d+)?', 'after(-\\d+)?', 'active', 'inactive'].map(removeClass.bind(null, el));

        if (el !== activeSlide) {
          ['inactive', offsetClass, offsetClass + '-' + Math.abs(offset)].map(addClass.bind(null, el));
        }
      };

    addClass(deck.parent, 'parent');
    deck.slides.map(function(el) { addClass(el, 'slide'); });

    deck.on('activate', function(e) {
      deck.slides.map(deactivate);
      addClass(e.slide, 'active');
      removeClass(e.slide, 'inactive');
    });
  };
};

},{}],2:[function(require,module,exports){
module.exports = function(opts) {
  return function(deck) {
    opts = opts && (opts.object || opts.name || opts.scope) ? opts : { object: opts };
    var bespoke = opts.object, name = opts.name || 'bespoke', scope = opts.scope || window;
    if (bespoke) scope[name] = bespoke;
    else if (scope[name]) bespoke = scope[name];
    else bespoke = (scope[name] = {});
    (Array.isArray(bespoke.decks) ? bespoke.decks : (bespoke.decks = [])).push(bespoke.deck = deck);
    deck.on('destroy', function() {
      var idx = bespoke.decks.indexOf(deck);
      if (idx >= 0) bespoke.decks.splice(idx, 1);
      delete bespoke.deck;
    });
  };
};

},{}],3:[function(require,module,exports){
module.exports = function() {
  return function(deck) {
    var parseHash = function() {
      var hash = window.location.hash.slice(1),
        slideNumberOrName = parseInt(hash, 10);

      if (hash) {
        if (slideNumberOrName) {
          activateSlide(slideNumberOrName - 1);
        } else {
          deck.slides.forEach(function(slide, i) {
            if (slide.getAttribute('data-bespoke-hash') === hash) {
              activateSlide(i);
            }
          });
        }
      }
    };

    var activateSlide = function(index) {
      var indexToActivate = -1 < index && index < deck.slides.length ? index : 0;
      if (indexToActivate !== deck.slide()) {
        deck.slide(indexToActivate);
      }
    };

    setTimeout(function() {
      parseHash();

      deck.on('activate', function(e) {
        var slideName = e.slide.getAttribute('data-bespoke-hash');
        window.location.hash = slideName || e.index + 1;
      });

      window.addEventListener('hashchange', parseHash);
    }, 0);
  };
};

},{}],4:[function(require,module,exports){
module.exports = function() {
  return function(deck) {
    var VIMEO_RE = /\/\/player\.vimeo\.com\//, YOUTUBE_RE = /\/\/www\.youtube\.com\/embed\//, CMD = 'command', loc = location.protocol === 'file:',
      apply = function(sel, from, fn, mod) { for (var i = -1, r = from.querySelectorAll(sel+(mod||'')), l = r.length; ++i < l; fn(r[i])) {} },
      post = function(obj, msg) { obj.contentWindow.postMessage(JSON.stringify(msg), '*'); },
      play = function(obj) {
        var rew = obj.hasAttribute('data-rewind'), vol = Math.min(Math.max(parseFloat(obj.getAttribute('data-volume')), 0), 10);
        if (obj.play) {
          if (rew && obj.readyState) obj.currentTime = 0;
          if (vol >= 0) obj.volume = vol/10;
          obj.play();
        }
        else if (YOUTUBE_RE.test(obj.src)) {
          if (rew) post(obj, {event:CMD, func:'seekTo', args:[0]});
          if (vol >= 0) post(obj, {event:CMD, func:'setVolume', args:[vol*10]});
          post(obj, {event:CMD, func:'playVideo'});
        }
        else if (VIMEO_RE.test(obj.src)) {
          if (loc) return console.warn('WARNING: Cannot play Vimeo video when deck is loaded via file://.');
          if (rew) post(obj, {method:'seekTo', value:0});
          if (vol >= 0) post(obj, {method:'setVolume', value:vol/10});
          post(obj, {method:'play'});
        }
      },
      pause = function(obj) {
        if (obj.pause) obj.pause();
        else if (YOUTUBE_RE.test(obj.src)) post(obj, {event:CMD, func:'pauseVideo'});
        else if (!loc && VIMEO_RE.test(obj.src)) post(obj, {method:'pause'});
      },
      reload = function(obj, name) { obj[name||'src'] = obj.getAttribute(name||'src'); },
      svg = function(obj) { try { return obj.contentDocument.rootElement; } catch(e) {} },
      toggle = function(obj, cmd) { (svg(obj)||obj).classList[cmd||'add']('active'); },
      activateSvg = function(obj) {
        if (obj.hasAttribute('data-reload')) reload(obj, 'data');
        else if (svg(obj)) toggle(obj);
        else obj.onload = function() { if (deck.slides[deck.slide()].contains(obj)) toggle(obj); };
      },
      deactivateSvg = function(obj) { toggle(obj, 'remove'); },
      eachMedia = apply.bind(null, 'audio,video,iframe'),
      eachSvg = apply.bind(null, 'object[type="image/svg+xml"]'),
      playMedia = function(slide) { eachMedia(slide, play); },
      pauseMedia = function(slide) { eachMedia(slide, pause); },
      activateSvgs = function(slide) { eachSvg(slide, activateSvg); },
      deactivateSvgs = function(slide) { eachSvg(slide, deactivateSvg, ':not([data-reload])'); },
      activate = function(e) {
        if (e.preview) return pauseMedia(e.slide);
        playMedia(e.slide);
        activateSvgs(e.slide);
        apply('img[data-reload][src$=".gif"]', e.slide, reload);
      },
      deactivate = function(e) {
        pauseMedia(e.slide);
        deactivateSvgs(e.slide);
      };
    deck.on('activate', activate);
    deck.on('deactivate', deactivate);
  };
};

},{}],5:[function(require,module,exports){
module.exports = function() {
  return function(deck) {
    var KEY_SP = 32, KEY_PGUP = 33, KEY_PGDN = 34, KEY_END = 35, KEY_HME = 36,
        KEY_LT = 37, KEY_RT = 39, KEY_H = 72, KEY_L = 76, KD = 'keydown',
      modified = function(e, k) {
        return e.ctrlKey || (e.shiftKey && (k === KEY_HME || k === KEY_END)) || e.altKey || e.metaKey;
      },
      onKey = function(e) {
        if (!modified(e, e.which)) {
          switch(e.which) {
            case KEY_SP: return (e.shiftKey ? deck.prev : deck.next)();
            case KEY_RT: case KEY_PGDN: case KEY_L: return deck.next();
            case KEY_LT: case KEY_PGUP: case KEY_H: return deck.prev();
            case KEY_HME: return deck.slide(0);
            case KEY_END: return deck.slide(deck.slides.length - 1);
          }
        }
      };
    deck.on('destroy', function() { document.removeEventListener(KD, onKey); });
    document.addEventListener(KD, onKey);
  };
};

},{}],6:[function(require,module,exports){
module.exports = function(options) {
  return function(deck) {
    var opts = (options || {}), TS = 'touchstart', TM = 'touchmove', ADD = 'addEventListener', RM = 'removeEventListener',
      src = deck.parent, start = null, delta = null, axis = 'page' + (opts.axis === 'y' ? 'Y' : 'X'),
      gap = typeof opts.threshold === 'number' ? opts.threshold : 50 / window.devicePixelRatio,
      onStart = function(e) { start = e.touches.length === 1 ? e.touches[0][axis] : null; },
      onMove = function(e) {
        if (start === null) return; // not ours
        if (start === undefined) return e.preventDefault(); // action already taken
        if (Math.abs(delta = e.touches[0][axis] - start) > gap) {
          (delta > 0 ? deck.prev : deck.next)();
          start = e.preventDefault(); // mark action taken
        }
      };
    deck.on('destroy', function() { src[RM](TS, onStart); src[RM](TM, onMove); });
    src[ADD](TS, onStart); src[ADD](TM, onMove);
  };
};

},{}],7:[function(require,module,exports){
module.exports = function(opts) {
  opts = opts || {};
  var kbd = require('bespoke-nav-kbd')(opts.kbd);
  var touch = require('bespoke-nav-touch')(opts.touch);
  return function(deck) {
    kbd(deck);
    touch(deck);
  };
};

},{"bespoke-nav-kbd":5,"bespoke-nav-touch":6}],8:[function(require,module,exports){
module.exports = function(opts) {
  require('insert-css')('.bespoke-parent.bespoke-overview{pointer-events:auto}' +
    '.bespoke-overview :not(img){pointer-events:none}' +
    '.bespoke-overview .bespoke-slide{opacity:1;visibility:visible;cursor:pointer;pointer-events:auto}' +
    '.bespoke-overview .bespoke-active{outline:6px solid #cfd8dc;outline-offset:-3px;-moz-outline-radius:3px}' +
    '.bespoke-overview .bespoke-bullet{opacity:1;visibility:visible}' +
    '.bespoke-overview-counter{counter-reset:overview}' +
    '.bespoke-overview-counter .bespoke-slide::after{counter-increment:overview;content:counter(overview);position:absolute;right:.75em;bottom:.5em;font-size:1.25rem;line-height:1.25}' +
    '.bespoke-title{visibility:hidden;position:absolute;top:0;left:0;width:100%;pointer-events:auto}' +
    '.bespoke-title h1{margin:0;font-size:1.6em;line-height:1.2;text-align:center}' +
    '.bespoke-overview:not(.bespoke-overview-to) .bespoke-title{visibility:visible}' +
    '.bespoke-overview-to .bespoke-active,.bespoke-overview-from .bespoke-active{z-index:1}', { prepend: true });
  return function(deck) {
    opts = typeof opts === 'object' ? opts : {};
    var KEY_O = 79, KEY_ENT = 13, KEY_UP = 38, KEY_DN = 40,
      RE_CSV = /, */, RE_NONE = /^none(?:, ?none)*$/, RE_TRANS = /^translate\((.+?)px, ?(.+?)px\) scale\((.+?)\)$/, RE_MODE = /(^\?|&)overview(?=$|&)/,
      TRANSITIONEND = !('transition' in document.body.style) && ('webkitTransition' in document.body.style) ? 'webkitTransitionEnd' : 'transitionend',
      VENDOR = ['webkit', 'Moz'],
      columns = typeof opts.columns === 'number' ? parseInt(opts.columns) : 3,
      margin = typeof opts.margin === 'number' ? parseFloat(opts.margin) : 15,
      overviewActive = null,
      afterTransition,
      getStyleProperty = function(element, name) {
        if (!(name in element.style)) {
          var properName = name.charAt(0).toUpperCase() + name.substr(1);
          for (var i = 0, len = VENDOR.length; i < len; i++) {
            if (VENDOR[i] + properName in element.style) return VENDOR[i] + properName;
          }
        }
        return name;
      },
      getTransformScaleFactor = function(element, transformProp) {
        return parseFloat(element.style[transformProp].slice(6, -1));
      },
      getZoomFactor = function(element) {
        if ('zoom' in element.style) return parseFloat(element.style.zoom) || undefined;
      },
      getTransitionProperties = function(element) {
        var result = [],
          style = getComputedStyle(element),
          transitionProperty = style[getStyleProperty(element, 'transitionProperty')];
        if (!transitionProperty || RE_NONE.test(transitionProperty)) return result;
        // NOTE beyond this point, assume computed style returns compliant values
        transitionProperty = transitionProperty.split(RE_CSV);
        var transitionDuration = style[getStyleProperty(element, 'transitionDuration')].split(RE_CSV),
          transitionDelay = style[getStyleProperty(element, 'transitionDelay')].split(RE_CSV);
        transitionProperty.forEach(function(property, i) {
          if (transitionDuration[i] !== '0s' || transitionDelay[i] !== '0s') result.push(property);
        });
        return result;
      },
      flushStyle = function(element, property, from, to) {
        if (property) element.style[property] = from;
        element.offsetHeight; // jshint ignore: line
        if (property) element.style[property] = to;
      },
      onReady = function() {
        deck.on('activate', onReady)(); // unregisters listener
        deck.parent.scrollLeft = deck.parent.scrollTop = 0;
        if (!!opts.autostart || RE_MODE.test(location.search)) setTimeout(openOverview, 100); // timeout allows transitions to prepare
      },
      onSlideClick = function() {
        closeOverview(deck.slides.indexOf(this));
      },
      onNavigate = function(offset, e) {
        var targetIndex = e.index + offset;
        // IMPORTANT must use deck.slide to navigate and return false in order to circumvent bespoke-bullets behavior
        if (targetIndex >= 0 && targetIndex < deck.slides.length) deck.slide(targetIndex, { preview: true });
        return false;
      },
      onActivate = function(e) {
        if (e.scrollIntoView !== false) scrollSlideIntoView(e.slide, e.index, getZoomFactor(e.slide));
      },
      updateLocation = function(state) {
        var s = location.search.replace(RE_MODE, '').replace(/^[^?]/, '?$&');
        if (state) {
          history.replaceState(null, null, location.pathname + (s.length > 0 ? s + '&' : '?') + 'overview' + location.hash);
        }
        else {
          history.replaceState(null, null, location.pathname + s + location.hash);
        }
      },
      scrollSlideIntoView = function(slide, index, zoomFactor) {
        deck.parent.scrollTop = index < columns ? 0 : deck.parent.scrollTop + slide.getBoundingClientRect().top * (zoomFactor || 1);
      },
      removeAfterTransition = function(direction, parentClasses, slide, slideAlt) {
        slide.removeEventListener(TRANSITIONEND, afterTransition, false);
        if (slideAlt && slideAlt !== slide) slideAlt.removeEventListener(TRANSITIONEND, afterTransition, false);
        afterTransition = undefined;
        parentClasses.remove('bespoke-overview-' + direction);
      },
      getOrCreateTitle = function(parent) {
        var first = parent.firstElementChild;
        if (first.classList.contains('bespoke-title')) {
          first.style.width = '';
          return first;
        }
        var header = document.createElement('header');
        header.className = 'bespoke-title';
        header.style[getStyleProperty(header, 'transformOrigin')] = '0 0';
        var h1 = document.createElement('h1');
        h1.appendChild(document.createTextNode(parent.getAttribute('data-title') || document.title));
        header.appendChild(h1);
        flushStyle(parent.insertBefore(header, first));
        return header;
      },
      openOverview = function() {
        var slides = deck.slides,
          parent = deck.parent,
          parentClasses = parent.classList,
          lastSlideIndex = slides.length - 1,
          activeSlideIndex = deck.slide(),
          sampleSlide = activeSlideIndex > 0 ? slides[0] : slides[lastSlideIndex],
          transformProp = getStyleProperty(sampleSlide, 'transform'),
          scaleParent = parent.querySelector('.bespoke-scale-parent'),
          baseScale = 1,
          zoomFactor,
          title,
          numTransitions = 0,
          resize = overviewActive,
          isWebKit = 'webkitAppearance' in parent.style;
        if (scaleParent) {
          baseScale = getTransformScaleFactor(scaleParent, transformProp);
        }
        else if ((zoomFactor = getZoomFactor(sampleSlide))) {
          baseScale = zoomFactor;
        }
        if (afterTransition) removeAfterTransition('from', parentClasses, slides[0], slides[lastSlideIndex]);
        if (!!opts.title) title = getOrCreateTitle(parent);
        if (!resize) {
          deck.slide(activeSlideIndex, { preview: true });
          parentClasses.add('bespoke-overview');
          addEventListener('resize', openOverview, false);
          overviewActive = [deck.on('activate', onActivate), deck.on('prev', onNavigate.bind(null, -1)), deck.on('next', onNavigate.bind(null, 1))];
          if (!!opts.counter) parentClasses.add('bespoke-overview-counter');
          if (!!opts.location) updateLocation(true);
          parentClasses.add('bespoke-overview-to');
          numTransitions = lastSlideIndex > 0 ? getTransitionProperties(sampleSlide).length :
              (getTransitionProperties(sampleSlide).join(' ').indexOf('transform') < 0 ? 0 : 1);
          parent.style.overflowY = 'scroll'; // gives us fine-grained control
          parent.style.scrollBehavior = 'smooth'; // not supported by all browsers
          if (isWebKit) slides.forEach(function(slide) { flushStyle(slide, 'marginBottom', '0%', ''); });
        }
        var deckWidth = parent.clientWidth / baseScale,
          deckHeight = parent.clientHeight / baseScale,
          scrollbarWidth = (scaleParent || parent).offsetWidth - parent.clientWidth,
          scrollbarOffset = scaleParent ? scrollbarWidth / 2 / baseScale : 0,
          slideWidth = sampleSlide.offsetWidth,
          slideHeight = sampleSlide.offsetHeight,
          scale = deckWidth / (columns * slideWidth + (columns + 1) * margin),
          totalScale = baseScale * scale,
          scaledSlideWidth = slideWidth * scale,
          scaledSlideHeight = slideHeight * scale,
          // NOTE x & y offset calculation based on transform origin at center of slide
          slideX = (deckWidth - scaledSlideWidth) / 2,
          slideY = (deckHeight - scaledSlideHeight) / 2,
          scaledMargin = margin * scale,
          scaledTitleHeight = 0,
          row = 0, col = 0;
        if (title) {
          if (opts.scaleTitle !== false) {
            title.style[zoomFactor ? 'zoom' : transformProp] = zoomFactor ? totalScale : 'scale(' + totalScale + ')';
            title.style.width = (parent.clientWidth / totalScale) + 'px';
            scaledTitleHeight = title.offsetHeight * scale;
          }
          else {
            if (scrollbarWidth > 0) title.style.width = parent.clientWidth + 'px';
            scaledTitleHeight = title.offsetHeight / baseScale;
          }
        }
        slides.forEach(function(slide) {
          var x = col * scaledSlideWidth + (col + 1) * scaledMargin - scrollbarOffset - slideX,
            y = row * scaledSlideHeight + (row + 1) * scaledMargin + scaledTitleHeight - slideY;
          // NOTE drop scientific notation for numbers near 0 as it confuses WebKit
          slide.style[transformProp] = 'translate(' + (x.toString().indexOf('e-') < 0 ? x : 0) + 'px, ' +
              (y.toString().indexOf('e-') < 0 ? y : 0) + 'px) scale(' + scale + ')';
          // NOTE add margin to last slide to leave gap below last row; only honored by WebKit
          if (row * columns + col === lastSlideIndex) slide.style.marginBottom = margin + 'px';
          slide.addEventListener('click', onSlideClick, false);
          if (col === (columns - 1)) {
            row += 1;
            col = 0;
          }
          else {
            col += 1;
          }
        });
        if (resize) {
          scrollSlideIntoView(slides[activeSlideIndex], activeSlideIndex, zoomFactor);
        }
        else if (numTransitions > 0) {
          sampleSlide.addEventListener(TRANSITIONEND, (afterTransition = function(e) {
            if (e.target === this && (numTransitions -= 1) === 0) {
              removeAfterTransition('to', parentClasses, this);
              if (isWebKit && parent.scrollHeight > parent.clientHeight) {
                flushStyle(parent, 'overflowY', 'auto', 'scroll'); // awakens scrollbar from zombie state
              }
              scrollSlideIntoView(slides[activeSlideIndex], activeSlideIndex, zoomFactor);
            }
          }), false);
        }
        else {
          slides.forEach(function(slide) { flushStyle(slide); }); // bypass transition, if any
          parentClasses.remove('bespoke-overview-to');
          scrollSlideIntoView(slides[activeSlideIndex], activeSlideIndex, zoomFactor);
        }
      },
      // NOTE the order of operation in this method is critical; heavily impacts behavior & transition smoothness
      closeOverview = function(selection) {
        // IMPORTANT intentionally reselect active slide to reactivate behavior
        deck.slide(typeof selection === 'number' ? selection : deck.slide(), { scrollIntoView: false });
        var slides = deck.slides,
          parent = deck.parent,
          parentClasses = parent.classList,
          lastSlideIndex = slides.length - 1,
          sampleSlide = deck.slide() > 0 ? slides[0] : slides[lastSlideIndex],
          transformProp = getStyleProperty(sampleSlide, 'transform'),
          transitionProp = getStyleProperty(sampleSlide, 'transition'),
          scaleParent = parent.querySelector('.bespoke-scale-parent'),
          baseScale,
          isWebKit = 'webkitAppearance' in parent.style;
        if (scaleParent) {
          baseScale = getTransformScaleFactor(scaleParent, transformProp);
        }
        else if (!(baseScale = getZoomFactor(sampleSlide))) {
          baseScale = 1;
        }
        if (afterTransition) removeAfterTransition('to', parentClasses, slides[0], slides[lastSlideIndex]);
        var yShift = parent.scrollTop / baseScale,
          // xShift accounts for horizontal shift when scrollbar is removed
          xShift = (parent.offsetWidth - (scaleParent || parent).clientWidth) / 2 / baseScale;
        parent.style.scrollBehavior = parent.style.overflowY = '';
        slides.forEach(function(slide) {
          if (isWebKit) flushStyle(slide, 'marginBottom', '0%', '');
          slide.removeEventListener('click', onSlideClick, false);
        });
        if (yShift || xShift) {
          slides.forEach(function(slide) {
            var m = slide.style[transformProp].match(RE_TRANS);
            slide.style[transformProp] = 'translate(' + (parseFloat(m[1]) - xShift) + 'px, ' + (parseFloat(m[2]) - yShift) + 'px) scale(' + m[3] + ')';
            flushStyle(slide, transitionProp, 'none', ''); // bypass transition, if any
          });
        }
        parent.scrollTop = 0;
        parentClasses.remove('bespoke-overview');
        removeEventListener('resize', openOverview, false);
        (overviewActive || []).forEach(function(unbindEvent) { unbindEvent(); });
        overviewActive = null;
        if (!!opts.counter) parentClasses.remove('bespoke-overview-counter');
        if (!!opts.location) updateLocation(false);
        parentClasses.add('bespoke-overview-from');
        var numTransitions = lastSlideIndex > 0 ? getTransitionProperties(sampleSlide).length :
            (getTransitionProperties(sampleSlide).join(' ').indexOf('transform') < 0 ? 0 : 1);
        slides.forEach(function(slide) { slide.style[transformProp] = ''; });
        if (numTransitions > 0) {
          sampleSlide.addEventListener(TRANSITIONEND, (afterTransition = function(e) {
            if (e.target === this && (numTransitions -= 1) === 0) removeAfterTransition('from', parentClasses, this);
          }), false);
        }
        else {
          slides.forEach(function(slide) { flushStyle(slide); }); // bypass transition, if any
          parentClasses.remove('bespoke-overview-from');
        }
      },
      toggleOverview = function() {
        overviewActive ? closeOverview() : openOverview(); // jshint ignore:line
      },
      onKeydown = function(e) {
        if (e.which === KEY_O) {
          if (!e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey) toggleOverview();
        }
        else if (overviewActive) {
          switch (e.which) {
            case KEY_ENT:
              if (!e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey) closeOverview();
              break;
            case KEY_UP:
              return onNavigate(-columns, { index: deck.slide() });
            case KEY_DN:
              return onNavigate(columns, { index: deck.slide() });
          }
        }
      };
    deck.on('activate', onReady);
    deck.on('destroy', function() {
      removeEventListener('resize', openOverview, false);
      document.removeEventListener('keydown', onKeydown, false);
    });
    deck.on('overview', toggleOverview);
    document.addEventListener('keydown', onKeydown, false);
  };
};

},{"insert-css":11}],9:[function(require,module,exports){
module.exports = function(options) {
  return function(deck) {
    var parent = deck.parent,
      firstSlide = deck.slides[0],
      slideHeight = firstSlide.offsetHeight,
      slideWidth = firstSlide.offsetWidth,
      useZoom = options === 'zoom' || ('zoom' in parent.style && options !== 'transform'),

      wrap = function(element) {
        var wrapper = document.createElement('div');
        wrapper.className = 'bespoke-scale-parent';
        element.parentNode.insertBefore(wrapper, element);
        wrapper.appendChild(element);
        return wrapper;
      },

      elements = useZoom ? deck.slides : deck.slides.map(wrap),

      transformProperty = (function(property) {
        var prefixes = 'Moz Webkit O ms'.split(' ');
        return prefixes.reduce(function(currentProperty, prefix) {
            return prefix + property in parent.style ? prefix + property : currentProperty;
          }, property.toLowerCase());
      }('Transform')),

      scale = useZoom ?
        function(ratio, element) {
          element.style.zoom = ratio;
        } :
        function(ratio, element) {
          element.style[transformProperty] = 'scale(' + ratio + ')';
        },

      scaleAll = function() {
        var xScale = parent.offsetWidth / slideWidth,
          yScale = parent.offsetHeight / slideHeight;

        elements.forEach(scale.bind(null, Math.min(xScale, yScale)));
      };

    window.addEventListener('resize', scaleAll);
    scaleAll();
  };

};

},{}],10:[function(require,module,exports){
var from = function(opts, plugins) {
  var parent = (opts.parent || opts).nodeType === 1 ? (opts.parent || opts) : document.querySelector(opts.parent || opts),
    slides = [].filter.call(typeof opts.slides === 'string' ? parent.querySelectorAll(opts.slides) : (opts.slides || parent.children), function(el) { return el.nodeName !== 'SCRIPT'; }),
    activeSlide = slides[0],
    listeners = {},

    activate = function(index, customData) {
      if (!slides[index]) {
        return;
      }

      fire('deactivate', createEventData(activeSlide, customData));
      activeSlide = slides[index];
      fire('activate', createEventData(activeSlide, customData));
    },

    slide = function(index, customData) {
      if (arguments.length) {
        fire('slide', createEventData(slides[index], customData)) && activate(index, customData);
      } else {
        return slides.indexOf(activeSlide);
      }
    },

    step = function(offset, customData) {
      var slideIndex = slides.indexOf(activeSlide) + offset;

      fire(offset > 0 ? 'next' : 'prev', createEventData(activeSlide, customData)) && activate(slideIndex, customData);
    },

    on = function(eventName, callback) {
      (listeners[eventName] || (listeners[eventName] = [])).push(callback);
      return off.bind(null, eventName, callback);
    },

    off = function(eventName, callback) {
      listeners[eventName] = (listeners[eventName] || []).filter(function(listener) { return listener !== callback; });
    },

    fire = function(eventName, eventData) {
      return (listeners[eventName] || [])
        .reduce(function(notCancelled, callback) {
          return notCancelled && callback(eventData) !== false;
        }, true);
    },

    createEventData = function(el, eventData) {
      eventData = eventData || {};
      eventData.index = slides.indexOf(el);
      eventData.slide = el;
      return eventData;
    },

    deck = {
      on: on,
      off: off,
      fire: fire,
      slide: slide,
      next: step.bind(null, 1),
      prev: step.bind(null, -1),
      parent: parent,
      slides: slides
    };

  (plugins || []).forEach(function(plugin) {
    plugin(deck);
  });

  activate(0);

  return deck;
};

module.exports = {
  from: from
};

},{}],11:[function(require,module,exports){
var inserted = {};

module.exports = function (css, options) {
    if (inserted[css]) return;
    inserted[css] = true;
    
    var elem = document.createElement('style');
    elem.setAttribute('type', 'text/css');

    if ('textContent' in elem) {
      elem.textContent = css;
    } else {
      elem.styleSheet.cssText = css;
    }
    
    var head = document.getElementsByTagName('head')[0];
    if (options && options.prepend) {
        head.insertBefore(elem, head.childNodes[0]);
    } else {
        head.appendChild(elem);
    }
};

},{}],12:[function(require,module,exports){
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

},{"bespoke":10,"bespoke-classes":1,"bespoke-extern":2,"bespoke-hash":3,"bespoke-multimedia":4,"bespoke-nav":7,"bespoke-overview":8,"bespoke-scale":9}]},{},[12]);
