/* ---------------------------------------------------------------
   FrameX visual interactions
   - Banner headline line-by-line reveal (synced to preloader exit)
   - Magnetic pull on primary CTAs
   - 3D tilt + cursor spotlight on project cards
   - Animated stats counters (.fx-count[data-count])
   - Staggered scroll reveals for .fx-stagger containers
   - Testimonials Swiper init
   All effects respect prefers-reduced-motion and are skipped on
   touch/coarse-pointer devices where hover makes no sense.
   Survives SWUP page transitions via delegation + re-scan.
--------------------------------------------------------------- */
(function () {
    'use strict';

    var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
    var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    function allowMotion() { return !reducedMotion.matches; }
    function allowHoverFx() { return finePointer.matches && allowMotion(); }

    /* ----------------------------------------------------------
       Banner headline reveal
       H1 lines are wrapped in .fx-line-mask > .fx-line. Lines are
       hidden immediately, then slide up staggered when the
       preloader starts fading (matching the .mil-up timing).
    ---------------------------------------------------------- */
    function bannerReveal(delay) {
        var lines = document.querySelectorAll('.mil-banner .fx-line');
        if (!lines.length || lines[0].dataset.fxRevealed) return;
        lines.forEach(function (l) { l.dataset.fxRevealed = '1'; });
        if (!window.gsap || !allowMotion()) return;

        gsap.set(lines, { yPercent: 110 });
        var start = function () {
            gsap.to(lines, {
                yPercent: 0,
                duration: 1,
                ease: 'power3.out',
                stagger: 0.14,
                delay: delay || 0
            });
        };

        var pre = document.querySelector('.mil-preloader');
        if (!pre || pre.classList.contains('mil-hidden') ||
            getComputedStyle(pre).display === 'none') {
            start();
            return;
        }
        // Wait for the preloader fade-out to begin, then reveal in sync
        var t0 = Date.now();
        (function poll() {
            var faded = pre.classList.contains('mil-hidden') ||
                parseFloat(getComputedStyle(pre).opacity) < 0.99;
            if (faded || Date.now() - t0 > 12000) { start(); return; }
            requestAnimationFrame(poll);
        })();
    }

    /* ----------------------------------------------------------
       Magnetic buttons
    ---------------------------------------------------------- */
    var MAGNET_SELECTOR = '.mil-button, .fx-featured-cta, .fx-footer-cta-btn';

    function bindMagnet(el) {
        if (el.dataset.fxMagnet) return;
        el.dataset.fxMagnet = '1';

        el.addEventListener('mousemove', function (e) {
            if (!allowHoverFx() || !window.gsap) return;
            var r = el.getBoundingClientRect();
            var relX = (e.clientX - r.left) / r.width - 0.5;
            var relY = (e.clientY - r.top) / r.height - 0.5;
            gsap.to(el, {
                x: relX * 26,
                y: relY * 14,
                scale: 1.02,
                duration: 0.35,
                ease: 'power2.out'
            });
        });

        el.addEventListener('mouseleave', function () {
            if (!window.gsap) return;
            gsap.to(el, {
                x: 0, y: 0, scale: 1,
                duration: 0.55,
                ease: 'power3.out',
                clearProps: 'transform'
            });
        });
    }

    /* ----------------------------------------------------------
       Project card tilt + cursor spotlight
       Featured cards tilt as a whole; portfolio grid items tilt
       only their cover frame so captions stay put. The spotlight
       follows the cursor via --fx-mx/--fx-my custom properties.
    ---------------------------------------------------------- */
    var TILT_SELECTOR = '.fx-feat-card, .fx-portfolio-grid .mil-portfolio-item';
    var TILT_MAX = 5; // degrees

    function bindTilt(card) {
        if (card.dataset.fxTilt) return;
        card.dataset.fxTilt = '1';

        var frame = card.querySelector('.fx-feat-media, .mil-cover-frame') || card;
        var tiltEl = card.classList.contains('mil-portfolio-item') ? frame : card;

        card.addEventListener('mousemove', function (e) {
            if (!allowHoverFx() || !window.gsap) return;
            var r = card.getBoundingClientRect();
            var px = (e.clientX - r.left) / r.width;
            var py = (e.clientY - r.top) / r.height;
            gsap.to(tiltEl, {
                rotateY: (px - 0.5) * 2 * TILT_MAX,
                rotateX: (0.5 - py) * 2 * TILT_MAX,
                transformPerspective: 900,
                duration: 0.45,
                ease: 'power2.out'
            });
            frame.style.setProperty('--fx-mx', (px * 100).toFixed(1) + '%');
            frame.style.setProperty('--fx-my', (py * 100).toFixed(1) + '%');
        });

        card.addEventListener('mouseleave', function () {
            if (!window.gsap) return;
            gsap.to(tiltEl, {
                rotateX: 0, rotateY: 0,
                duration: 0.7,
                ease: 'power3.out',
                clearProps: 'transform'
            });
        });
    }

    /* Delegated lazy binding: works for content swapped in by SWUP
       or rebuilt by the portfolio filters without re-scanning. */
    document.addEventListener('mouseover', function (e) {
        if (!finePointer.matches || !e.target || !e.target.closest) return;
        var magnet = e.target.closest(MAGNET_SELECTOR);
        if (magnet) bindMagnet(magnet);
        var card = e.target.closest(TILT_SELECTOR);
        if (card) bindTilt(card);
    });

    /* ----------------------------------------------------------
       Stats counters
    ---------------------------------------------------------- */
    function initCounters() {
        document.querySelectorAll('.fx-count:not([data-fx-bound])').forEach(function (el) {
            el.setAttribute('data-fx-bound', '1');
            var target = parseFloat(el.getAttribute('data-count')) || 0;
            if (!window.gsap || !window.ScrollTrigger || !allowMotion()) {
                el.textContent = target;
                return;
            }
            var proxy = { val: 0 };
            gsap.to(proxy, {
                val: target,
                duration: 1.8,
                ease: 'power2.out',
                scrollTrigger: {
                    trigger: el,
                    start: 'top 92%',
                    once: true
                },
                onUpdate: function () {
                    el.textContent = Math.round(proxy.val);
                }
            });
        });
    }

    /* ----------------------------------------------------------
       Staggered scroll reveals
       Children of .fx-stagger cascade in with the same look as
       the template's .mil-up reveal.
    ---------------------------------------------------------- */
    function initStagger() {
        document.querySelectorAll('.fx-stagger:not([data-fx-bound])').forEach(function (group) {
            group.setAttribute('data-fx-bound', '1');
            var items = Array.prototype.slice.call(group.children);
            if (!items.length || !window.gsap || !window.ScrollTrigger || !allowMotion()) return;
            gsap.fromTo(items, {
                opacity: 0,
                y: 40,
                scale: 0.98
            }, {
                opacity: 1,
                y: 0,
                scale: 1,
                duration: 0.5,
                ease: 'sine',
                stagger: 0.09,
                scrollTrigger: {
                    trigger: group,
                    toggleActions: 'play none none reverse'
                }
            });
        });
    }

    /* ----------------------------------------------------------
       Testimonials slider
    ---------------------------------------------------------- */
    function initTestimonials() {
        var el = document.querySelector('.fx-testi-slider');
        if (!el || el.swiper || !window.Swiper) return;
        new Swiper(el, {
            slidesPerView: 1,
            spaceBetween: 24,
            speed: 700,
            grabCursor: true,
            pagination: {
                el: '.fx-testi-pagination',
                clickable: true
            },
            breakpoints: {
                768: { slidesPerView: 2 },
                1200: { slidesPerView: 3 }
            }
        });
    }

    /* ----------------------------------------------------------
       Housekeeping: kill ScrollTriggers whose trigger element was
       removed by a SWUP page swap.
    ---------------------------------------------------------- */
    function cleanupTriggers() {
        if (!window.ScrollTrigger) return;
        ScrollTrigger.getAll().forEach(function (st) {
            var trg = st.trigger;
            if (trg && trg.nodeType === 1 && !document.body.contains(trg)) st.kill();
        });
    }

    function scan(fromSwup) {
        cleanupTriggers();
        bannerReveal(fromSwup ? 0.5 : 0);
        initCounters();
        initStagger();
        initTestimonials();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { scan(false); });
    } else {
        scan(false);
    }
    document.addEventListener('swup:contentReplaced', function () { scan(true); });
})();
