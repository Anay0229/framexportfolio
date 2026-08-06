/* ---------------------------------------------------------------
   FrameX infinite slider
   Vanilla port of motion-primitives' <InfiniteSlider>. Any element
   marked [data-fx-slider] has its children looped seamlessly.

   Options (data attributes on the container):
     data-speed           px/sec, default 100
     data-speed-on-hover  px/sec while hovered (eases in/out)
     data-gap             px between items, default 16
     data-reverse         present = travel the other way

   Content is cloned until it fills at least twice the viewport of
   the track, then translated with rAF and wrapped by one set width.
   Paused off-screen and disabled under prefers-reduced-motion.
   Survives SWUP page transitions via re-scan.
--------------------------------------------------------------- */
(function () {
    'use strict';

    var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    function build(root) {
        if (root.dataset.fxSliderReady) return;
        root.dataset.fxSliderReady = '1';

        var gap = parseFloat(root.dataset.gap) || 16;
        var baseSpeed = parseFloat(root.dataset.speed) || 100;
        var hoverSpeed = root.dataset.speedOnHover ? parseFloat(root.dataset.speedOnHover) : null;
        var reverse = root.hasAttribute('data-reverse');

        var track = document.createElement('div');
        track.className = 'fx-slider-track';
        track.style.gap = gap + 'px';
        while (root.firstChild) track.appendChild(root.firstChild);
        root.appendChild(track);
        root.classList.add('fx-slider');

        var originals = Array.prototype.slice.call(track.children);
        if (!originals.length) return;

        var setWidth = 0;
        var offset = 0;
        var current = baseSpeed;
        var target = baseSpeed;
        var visible = true;
        var last = 0;
        var frame = null;

        // Clone whole sets until the track covers twice the container,
        // so a wrap is never visible at either edge.
        function fill() {
            Array.prototype.slice.call(track.children).forEach(function (el) {
                if (el.dataset.fxClone) track.removeChild(el);
            });

            setWidth = originals.reduce(function (sum, el) {
                return sum + el.getBoundingClientRect().width + gap;
            }, 0);
            if (!setWidth) return;

            var needed = Math.max(2, Math.ceil((root.clientWidth * 2) / setWidth) + 1);
            for (var i = 1; i < needed; i++) {
                originals.forEach(function (el) {
                    var clone = el.cloneNode(true);
                    clone.dataset.fxClone = '1';
                    clone.setAttribute('aria-hidden', 'true');
                    track.appendChild(clone);
                });
            }
            offset = offset % setWidth;
        }

        function render(now) {
            frame = requestAnimationFrame(render);
            var dt = last ? Math.min((now - last) / 1000, 0.05) : 0;
            last = now;

            // Ease toward the target speed instead of snapping on hover.
            current += (target - current) * Math.min(dt * 6, 1);

            offset += current * dt;
            if (setWidth) offset = ((offset % setWidth) + setWidth) % setWidth;
            var x = reverse ? offset - setWidth : -offset;
            track.style.transform = 'translate3d(' + x + 'px, 0, 0)';
        }

        function start() {
            if (frame || !visible || reducedMotion.matches) return;
            last = 0;
            frame = requestAnimationFrame(render);
        }

        function stop() {
            if (!frame) return;
            cancelAnimationFrame(frame);
            frame = null;
        }

        if (hoverSpeed !== null) {
            root.addEventListener('pointerenter', function () { target = hoverSpeed; });
            root.addEventListener('pointerleave', function () { target = baseSpeed; });
        }

        if (window.IntersectionObserver) {
            new IntersectionObserver(function (entries) {
                visible = entries[0].isIntersecting;
                visible ? start() : stop();
            }).observe(root);
        }

        document.addEventListener('visibilitychange', function () {
            document.hidden ? stop() : start();
        });

        // Images settle after layout — remeasure on load and on resize.
        if (window.ResizeObserver) new ResizeObserver(fill).observe(root);
        else window.addEventListener('resize', fill);

        originals.forEach(function (el) {
            var img = el.tagName === 'IMG' ? el : el.querySelector('img');
            if (img && !img.complete) img.addEventListener('load', fill);
        });

        fill();
        start();

        reducedMotion.addEventListener('change', function () {
            reducedMotion.matches ? stop() : start();
        });
    }

    function scan() {
        document.querySelectorAll('[data-fx-slider]').forEach(build);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', scan);
    } else {
        scan();
    }
    window.addEventListener('load', scan);
    document.addEventListener('swup:contentReplaced', scan);
})();
