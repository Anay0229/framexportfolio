/* ---------------------------------------------------------------
   FrameX lazy video loader
   Defers video network fetches until the element nears the viewport.
   Markup contract:
     <video data-src="file.mp4" ...>            (single-src videos)
     <video ...><source data-src="file.mp4">    (source-based videos)
   The real src is attached when the video scrolls within 200px of
   the viewport; until then only the poster image is shown.
--------------------------------------------------------------- */
(function () {
    'use strict';

    function attach(video) {
        if (video.dataset.fxLoaded) return;
        video.dataset.fxLoaded = '1';

        var hasSource = false;

        if (video.dataset.src) {
            video.src = video.dataset.src;
            video.removeAttribute('data-src');
            hasSource = true;
        }

        var sources = video.querySelectorAll('source[data-src]');
        sources.forEach(function (s) {
            s.src = s.dataset.src;
            s.removeAttribute('data-src');
            hasSource = true;
        });

        if (!hasSource) return;
        video.load();

        // Honour autoplay videos, and resume ambient (muted/loop, non-hover)
        // videos that other scripts may have tried to play before the src
        // was attached (e.g. the featured-carousel observer).
        var isAmbient = video.muted && video.loop && !video.controls &&
            !video.hasAttribute('onmouseover');
        if (video.autoplay || video.hasAttribute('autoplay') ||
            (isAmbient && isInViewport(video))) {
            var p = video.play();
            if (p && p.catch) p.catch(function () { /* autoplay blocked */ });
        }
    }

    function isInViewport(el) {
        var r = el.getBoundingClientRect();
        return r.bottom > 0 && r.top < (window.innerHeight || document.documentElement.clientHeight) &&
            r.right > 0 && r.left < (window.innerWidth || document.documentElement.clientWidth);
    }

    var observer = null;

    function getObserver() {
        if (observer) return observer;
        observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    attach(entry.target);
                    observer.unobserve(entry.target);
                }
            });
        }, { rootMargin: '200px 0px' });
        return observer;
    }

    function scan() {
        var lazyVideos = [];
        document.querySelectorAll('source[data-src]').forEach(function (s) {
            var v = s.closest('video');
            if (v && lazyVideos.indexOf(v) === -1) lazyVideos.push(v);
        });
        document.querySelectorAll('video[data-src]').forEach(function (v) {
            if (lazyVideos.indexOf(v) === -1) lazyVideos.push(v);
        });

        if (!('IntersectionObserver' in window)) {
            lazyVideos.forEach(attach);
            return;
        }

        var io = getObserver();
        lazyVideos.forEach(function (v) {
            if (!v.dataset.fxLoaded) io.observe(v);
        });
    }

    // Allow other scripts (e.g. filter rebuilds) to request a re-scan
    window.fxLazyVideoScan = scan;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', scan);
    } else {
        scan();
    }
    // Catch Swiper loop clones created after init
    window.addEventListener('load', scan);
    // Re-scan after SWUP page transitions
    document.addEventListener('swup:contentReplaced', scan);
})();
