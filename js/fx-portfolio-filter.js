/* -------------------------------------------
   FrameX — portfolio category filter

   Loaded globally (not inline in the page) because Swup only swaps the
   #swupMain container on navigation and does NOT execute inline <script>s
   inside it. A single delegated click listener on document works for both
   direct loads and Swup transitions, with no re-binding needed.

   - portfolio-1: .fx-portfolio-grid  → fade/scale items in and out
   - portfolio-3: .mil-portfolio-slider → rebuild Swiper with matching slides
------------------------------------------- */
(function () {
    'use strict';

    var ANIM_MS = 350;

    function filterGrid(filter) {
        var items = document.querySelectorAll('.portfolio-grid-item');
        items.forEach(function (item) {
            var show = filter === 'All' || item.getAttribute('data-category') === filter;
            clearTimeout(item._fxTimer);

            if (show) {
                item.classList.remove('fx-hidden');
                void item.offsetWidth; // force reflow so the fade-in transitions
                requestAnimationFrame(function () {
                    item.classList.remove('fx-anim-out');
                });
            } else {
                item.classList.add('fx-anim-out');
                item._fxTimer = setTimeout(function () {
                    item.classList.add('fx-hidden');
                }, ANIM_MS);
            }
        });

        if (window.ScrollTrigger) {
            setTimeout(function () { window.ScrollTrigger.refresh(); }, ANIM_MS + 20);
        }
    }

    function filterSlider(container, filter) {
        var wrapper = container.querySelector('.swiper-wrapper');
        if (!wrapper || typeof window.Swiper === 'undefined') return;

        // Cache the full slide set on the wrapper element itself, so a fresh
        // page (after a Swup swap) always gets a fresh cache.
        if (!wrapper._fxSlideCache) {
            wrapper._fxSlideCache = Array.prototype.map.call(
                wrapper.querySelectorAll('.portfolio-swiper-item'),
                function (s) { return { cat: s.getAttribute('data-category'), html: s.outerHTML }; }
            );
        }

        if (container.swiper) container.swiper.destroy(true, true);

        wrapper.innerHTML = wrapper._fxSlideCache
            .filter(function (s) { return filter === 'All' || s.cat === filter; })
            .map(function (s) { return s.html; })
            .join('');

        if (window.fxLazyVideoScan) window.fxLazyVideoScan();

        // Same config as main.js
        new window.Swiper(container, {
            slidesPerView: 1,
            spaceBetween: 0,
            speed: 800,
            parallax: true,
            mousewheel: { enable: true },
            navigation: {
                nextEl: '.mil-portfolio-next',
                prevEl: '.mil-portfolio-prev',
            },
            pagination: {
                el: '.swiper-portfolio-pagination',
                type: 'fraction',
            },
        });
    }

    document.addEventListener('click', function (e) {
        var btn = e.target.closest ? e.target.closest('.fx-filter-btn') : null;
        if (!btn) return;
        e.preventDefault();

        if (btn.classList.contains('fx-active')) return;

        var bar = btn.closest('.fx-filter-bar') || document;
        bar.querySelectorAll('.fx-filter-btn').forEach(function (b) {
            b.classList.remove('fx-active');
        });
        btn.classList.add('fx-active');

        var filter = btn.getAttribute('data-filter') || 'All';
        var slider = document.querySelector('.mil-portfolio-slider');

        if (document.querySelector('.portfolio-grid-item')) {
            filterGrid(filter);
        } else if (slider) {
            filterSlider(slider, filter);
        }
    });
})();
