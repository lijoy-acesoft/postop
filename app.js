// Register GSAP plugins first (before Lenis / ScrollTrigger hooks)
gsap.registerPlugin(ScrollTrigger);

// Initialize Lenis for buttery smooth scrolling
const lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    direction: 'vertical',
    gestureDirection: 'vertical',
    smooth: true,
    mouseMultiplier: 1,
    smoothTouch: false,
    touchMultiplier: 2,
    infinite: false,
});

lenis.on('scroll', ScrollTrigger.update);

ScrollTrigger.scrollerProxy(document.documentElement, {
    scrollTop(value) {
        if (arguments.length) {
            lenis.scrollTo(value, { immediate: true });
        }
        return lenis.scroll;
    },
    getBoundingClientRect() {
        return {
            top: 0,
            left: 0,
            width: window.innerWidth,
            height: window.innerHeight,
        };
    },
});

gsap.ticker.add((time) => {
    lenis.raf(time * 1000);
});
gsap.ticker.lagSmoothing(0);

/**
 * Scrub reveal — same behaviour as Built by Acesoft (Foundation).
 * Header + cards animate in tied to scroll progress on `triggerEl`.
 */
function initScrubReveal({ triggerEl, headerEl, cardEls, scrollDistance, start, end }) {
    if (!triggerEl || !headerEl || !cardEls?.length) return null;

    const hidden = { y: 150, opacity: 0, rotationX: 15, scale: 0.9 };
    const shown = { y: 0, opacity: 1, rotationX: 0, scale: 1, stagger: 0.12, ease: 'none' };

    gsap.set(headerEl, { y: 100, opacity: 0 });
    gsap.set(cardEls, hidden);

    const tl = gsap.timeline({
        scrollTrigger: {
            trigger: triggerEl,
            start: start ?? 'top 90%',
            end: end ?? (() => `+=${scrollDistance}`),
            scrub: 1,
            invalidateOnRefresh: true,
        },
    });

    tl.fromTo(headerEl, { y: 100, opacity: 0 }, { y: 0, opacity: 1, ease: 'none' })
      .fromTo(cardEls, hidden, shown, 0);

    return tl;
}

let foundationRevealTl = null;
let pillarsRevealTl = null;

function killScrubReveals() {
    [foundationRevealTl, pillarsRevealTl].forEach((tl) => {
        if (!tl) return;
        tl.scrollTrigger?.kill();
        tl.kill();
    });
    foundationRevealTl = null;
    pillarsRevealTl = null;
}

function setupScrubReveals() {
    killScrubReveals();
    initFoundationReveal();
    initPillarsReveal();
    ScrollTrigger.refresh();
}

let industriesRevealTl = null;

function killIndustriesReveal() {
    if (industriesRevealTl) {
        industriesRevealTl.scrollTrigger?.kill();
        industriesRevealTl.kill();
        industriesRevealTl = null;
    }
}

function initIndustriesReveal() {
    const section = document.querySelector('.industries');
    if (!section) return;

    const header = section.querySelector('.gs-industries-header');
    const cards = section.querySelectorAll('.gs-industry-card');
    const visual = section.querySelector('.gs-industry-visual');
    const orbitNodes = section.querySelectorAll('.gs-orbit-node[data-ecosystem-index]');
    const ecosystemChip = section.querySelector('.gs-ecosystem-chip');
    const footerStats = section.querySelectorAll('.gs-industry-stat');
    const orbitLines = section.querySelectorAll('.orbit-line');
    const connectors = section.querySelectorAll('.orbit-connector');

    if (!header || !cards.length) return;

    gsap.set(header, { y: 70, opacity: 0 });
    gsap.set(cards, { x: -90, opacity: 0 });
    gsap.set(visual, { x: 60, opacity: 0, scale: 0.92 });
    gsap.set(orbitNodes, { opacity: 0, filter: 'blur(10px)' });
    if (ecosystemChip) gsap.set(ecosystemChip, { opacity: 0, y: 20 });
    gsap.set(footerStats, { y: 50, opacity: 0 });

    if (orbitLines.length) {
        orbitLines.forEach((line) => {
            const len = line.getTotalLength?.() ?? 600;
            gsap.set(line, { strokeDasharray: len, strokeDashoffset: len });
        });
    }

    connectors.forEach((line) => {
        const len = line.getTotalLength?.() ?? 200;
        gsap.set(line, { strokeDasharray: len, strokeDashoffset: len, opacity: 0.15 });
    });

    industriesRevealTl = gsap.timeline({
        scrollTrigger: {
            trigger: section,
            start: 'top 85%',
            end: 'center 50%',
            scrub: 1,
            invalidateOnRefresh: true,
        },
    });

    industriesRevealTl
        .to(header, { y: 0, opacity: 1, ease: 'none' })
        .to(cards, { x: 0, opacity: 1, stagger: 0.1, ease: 'none' }, 0.08)
        .to(visual, { x: 0, opacity: 1, scale: 1, ease: 'none' }, 0.18);

    if (orbitLines.length) {
        industriesRevealTl.to(orbitLines, { strokeDashoffset: 0, ease: 'none', duration: 0.35 }, 0.2);
    }

    industriesRevealTl
        .to(connectors, { strokeDashoffset: 0, opacity: 0.25, stagger: 0.05, ease: 'none' }, 0.24)
        .to(orbitNodes, { opacity: 1, filter: 'blur(0px)', stagger: 0.08, ease: 'none' }, 0.3);

    if (ecosystemChip) {
        industriesRevealTl.to(ecosystemChip, { opacity: 1, y: 0, ease: 'none' }, 0.38);
    }

    industriesRevealTl.to(footerStats, { y: 0, opacity: 1, stagger: 0.1, ease: 'none' }, 0.45);
}

let industriesInteractionInited = false;
let industriesAutoCycleCall = null;
let industriesOrbitSpin = null;
let industriesHubPulse = null;

function initIndustriesInteractions() {
    if (industriesInteractionInited) return;

    const section = document.querySelector('.industries');
    if (!section) return;

    const cards = section.querySelectorAll('.gs-industry-card[data-ecosystem-index]');
    const nodes = section.querySelectorAll('.orbit-node[data-ecosystem-index]');
    const connectors = section.querySelectorAll('.orbit-connector');
    const hub = section.querySelector('#orbit-hub');
    const hubPulse = section.querySelector('.orbit-hub-pulse');
    const orbitLines = section.querySelector('.orbit-lines');
    const orbitScene = section.querySelector('#orbit-scene');
    const ecosystemMedia = section.querySelector('.gs-ecosystem-media');

    if (!cards.length || !hub) return;
    industriesInteractionInited = true;

    let activeIndex = -1;
    let isPaused = false;
    let cycleIndex = 0;
    let sectionInView = false;

    // Continuous orbit ring rotation (GSAP)
    if (orbitLines) {
        industriesOrbitSpin = gsap.to(orbitLines, {
            rotation: 360,
            duration: 52,
            repeat: -1,
            ease: 'none',
            transformOrigin: '50% 50%',
        });
    }

    // Hub pulse ring
    if (hubPulse) {
        industriesHubPulse = gsap.to(hubPulse, {
            scale: 1.35,
            opacity: 0.55,
            duration: 2.2,
            repeat: -1,
            yoyo: true,
            ease: 'sine.inOut',
            transformOrigin: '50% 50%',
        });
    }

    // Parallax on the orbit scene while scrolling through section
    if (orbitScene) {
        gsap.to(orbitScene, {
            y: -24,
            rotation: 6,
            ease: 'none',
            scrollTrigger: {
                trigger: section,
                start: 'top bottom',
                end: 'bottom top',
                scrub: 1,
            },
        });
    }

    if (ecosystemMedia) {
        gsap.to(ecosystemMedia, {
            y: -16,
            ease: 'none',
            scrollTrigger: {
                trigger: section,
                start: 'top bottom',
                end: 'bottom top',
                scrub: 1,
            },
        });
    }

    function setConnectorHighlight(index) {
        connectors.forEach((line, i) => {
            gsap.to(line, {
                opacity: i === index ? 0.95 : 0.15,
                duration: 0.35,
                ease: 'power2.out',
            });
        });
    }

    function resetConnectors() {
        gsap.to(connectors, {
            opacity: 0.22,
            duration: 0.35,
        });
    }

    function activate(index) {
        if (index < 0 || index >= cards.length) return;
        activeIndex = index;

        cards.forEach((card, i) => card.classList.toggle('is-ecosystem-active', i === index));
        nodes.forEach((node, i) => node.classList.toggle('is-orbit-active', i === index));
        hub.classList.toggle('is-hub-active', true);

        setConnectorHighlight(index);

        const icon = cards[index].querySelector('.ecosystem-card-icon');
        if (icon) {
            gsap.fromTo(
                icon,
                { scale: 0.85 },
                { scale: 1, duration: 0.4, ease: 'back.out(2.5)' }
            );
        }

        if (ecosystemMedia) {
            gsap.to(ecosystemMedia, {
                scale: 1.02,
                duration: 0.45,
                ease: 'power2.out',
            });
        }
    }

    function deactivate() {
        activeIndex = -1;
        cards.forEach((c) => c.classList.remove('is-ecosystem-active'));
        nodes.forEach((n) => n.classList.remove('is-orbit-active'));
        hub.classList.remove('is-hub-active');
        resetConnectors();
        if (ecosystemMedia) {
            gsap.to(ecosystemMedia, { scale: 1, duration: 0.4, ease: 'power2.out' });
        }
    }

    function bindPair(sourceEl, index) {
        sourceEl.addEventListener('mouseenter', () => {
            pauseAutoCycle();
            activate(index);
        });
        sourceEl.addEventListener('mouseleave', () => {
            deactivate();
            resumeAutoCycle();
        });
        sourceEl.addEventListener('focusin', () => {
            pauseAutoCycle();
            activate(index);
        });
        sourceEl.addEventListener('focusout', (e) => {
            if (section.contains(e.relatedTarget)) return;
            deactivate();
            resumeAutoCycle();
        });
    }

    cards.forEach((card, i) => bindPair(card, i));
    nodes.forEach((node, i) => bindPair(node, i));

    // Subtle magnetic tilt on cards
    cards.forEach((card) => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width - 0.5;
            const y = (e.clientY - rect.top) / rect.height - 0.5;
            gsap.to(card, {
                x: x * 8,
                y: y * 4,
                duration: 0.35,
                ease: 'power2.out',
                overwrite: 'auto',
            });
        });
        card.addEventListener('mouseleave', () => {
            gsap.to(card, { x: 0, y: 0, duration: 0.5, ease: 'elastic.out(1, 0.6)' });
        });
    });

    function runCycleStep() {
        if (!isPaused) activate(cycleIndex);
        cycleIndex = (cycleIndex + 1) % cards.length;
    }

    function scheduleAutoCycle() {
        industriesAutoCycleCall?.kill();
        industriesAutoCycleCall = gsap.delayedCall(3.2, () => {
            runCycleStep();
            scheduleAutoCycle();
        });
    }

    function pauseAutoCycle() {
        isPaused = true;
        industriesAutoCycleCall?.kill();
    }

    function resumeAutoCycle() {
        isPaused = false;
        if (sectionInView) {
            scheduleAutoCycle();
        }
    }

    function stopAutoCycle() {
        pauseAutoCycle();
        deactivate();
        cycleIndex = 0;
    }

    ScrollTrigger.create({
        trigger: section,
        start: 'top 65%',
        end: 'bottom 35%',
        onEnter: () => {
            sectionInView = true;
            scheduleAutoCycle();
            runCycleStep();
        },
        onEnterBack: () => {
            sectionInView = true;
            scheduleAutoCycle();
            runCycleStep();
        },
        onLeave: () => {
            sectionInView = false;
            stopAutoCycle();
        },
        onLeaveBack: () => {
            sectionInView = false;
            stopAutoCycle();
        },
    });
}

function setupAllScrollReveals() {
    setupScrubReveals();
    killIndustriesReveal();
    initIndustriesReveal();
}

function initFoundationReveal() {
    const section = document.querySelector('.foundation');
    if (!section) return;
    foundationRevealTl = initScrubReveal({
        triggerEl: section,
        headerEl: section.querySelector('.gs-foundation-reveal'),
        cardEls: section.querySelectorAll('.gs-foundation-card'),
        start: 'top 90%',
        end: 'center 60%',
    });
}

function initPillarsReveal() {
    const section = document.querySelector('.pillars');
    if (!section) return;

    const header = section.querySelector('.gs-pillars-reveal');
    const cards = section.querySelectorAll('.gs-pillars-card');

    if (!header || !cards.length) return;

    // Identical trigger window to Foundation — whole section scrubs header + cards
    pillarsRevealTl = initScrubReveal({
        triggerEl: section,
        headerEl: header,
        cardEls: cards,
        start: 'top 90%',
        end: 'center 60%',
    });
}

// Run animations once DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
    
    // --- 1. Ambient Particles in Hero ---
    const particlesContainer = document.getElementById('hero-particles');
    for (let i = 0; i < 50; i++) {
        let p = document.createElement('div');
        p.className = 'particle';
        p.style.left = Math.random() * 100 + 'vw';
        p.style.top = Math.random() * 100 + 'vh';
        particlesContainer.appendChild(p);
        
        // Infinite float animation
        gsap.to(p, {
            y: `-=${Math.random() * 300 + 100}`,
            x: `+=${Math.random() * 50 - 25}`,
            opacity: 0,
            duration: Math.random() * 5 + 3,
            repeat: -1,
            delay: Math.random() * 5,
            ease: "none"
        });
    }

    // --- 1.5 Initial Load Reveal ---
    const initialLoadTl = gsap.timeline({ defaults: { ease: "power3.out" } });
    
    // Set initial states explicitly to avoid flashes
    gsap.set([".nav-logo", ".nav-links li", ".gs-hero-reveal", ".gs-hero-media"], { opacity: 0 });

    // Instantly start revealing the Hero content, logo, and links at the same time
    initialLoadTl.to(".nav-logo", { y: 0, opacity: 1, duration: 0.8 }, 0)
                 .to(".nav-links li", { y: 0, opacity: 1, duration: 0.8, stagger: 0.05 }, 0.1)
                 .fromTo(".gs-hero-reveal", 
                     { y: 30, opacity: 0 },
                     { y: 0, opacity: 1, duration: 1, stagger: 0.08 }, 0.1)
                 .fromTo(".gs-hero-media", 
                     { scale: 0.95, opacity: 0, y: 20 },
                     { scale: 1, opacity: 1, y: 0, duration: 1.2, 
                       onComplete: () => {
                           // Start infinite float after entrance
                           gsap.to(".gs-hero-media .section-photo", {
                               y: -15,
                               repeat: -1,
                               yoyo: true,
                               ease: "sine.inOut",
                               duration: 2.5
                           });
                       }
                     }, 0.2);

    // --- 2. Generic Reveal Animations ---
    gsap.utils.toArray('.gs-reveal').forEach(elem => {
        gsap.from(elem, {
            y: -20,
            opacity: 0,
            duration: 1,
            ease: "power3.out",
            stagger: 0.1
        });
    });

    gsap.utils.toArray('.gs-fade-up').forEach(elem => {
        gsap.fromTo(elem, 
            { y: 50, opacity: 0 },
            {
                scrollTrigger: {
                    trigger: elem,
                    start: "top 85%",
                },
                y: 0,
                opacity: 1,
                duration: 1,
                ease: "power3.out"
            }
        );
    });

    // Stagger blocks (e.g. metrics, platform stats)
    gsap.utils.toArray('.metrics-grid, .platform-stats').forEach(container => {
        const items = container.querySelectorAll('.gs-stagger');
        if(items.length > 0) {
            gsap.fromTo(items, 
                { y: 60, opacity: 0 },
                {
                    scrollTrigger: {
                        trigger: container,
                        start: "top 80%",
                    },
                    y: 0,
                    opacity: 1,
                    duration: 1,
                    stagger: 0.15,
                    ease: "back.out(1.4)"
                }
            );
        }
    });

    // Number Counters (e.g. platform stats)
    gsap.utils.toArray('.gs-count').forEach(counter => {
        const targetVal = parseFloat(counter.getAttribute('data-val'));
        ScrollTrigger.create({
            trigger: counter,
            start: "top 90%",
            once: true,
            onEnter: () => {
                let obj = { val: 0 };
                gsap.to(obj, {
                    val: targetVal,
                    duration: 2.5,
                    ease: "power3.out",
                    onUpdate: () => {
                        counter.innerHTML = Math.floor(obj.val).toLocaleString();
                    }
                });
            }
        });
    });

    // --- 3. Hero Section Parallax & Fade ---
    const heroTl = gsap.timeline({
        scrollTrigger: {
            trigger: ".hero",
            start: "top top",
            end: "bottom top",
            scrub: true // Tightly bound to scrollbar
        }
    });
    
    // Smooth upward parallax and fade for the wrappers to avoid conflicts with load animation
    heroTl.to(".hero-content", { 
        y: -150, 
        opacity: 0 
    }, 0);
    heroTl.to(".hero-media", { 
        y: -80, 
        opacity: 0 
    }, 0);
    
    // Extra multi-layered parallax for the new background shapes and particles
    heroTl.to(".shape-1", { y: -200, rotation: 45 }, 0);
    heroTl.to(".shape-2", { y: -100, rotation: -40, x: 50 }, 0);
    heroTl.to(".shape-3", { y: -250, rotation: 90 }, 0);
    heroTl.to(".particles-container", { y: -150 }, 0);
    heroTl.to(".hero-bg", { y: 100 }, 0);
    
    // Custom data-speed parallax implementation for elements with data-speed
    gsap.utils.toArray('[data-speed]').forEach(elem => {
        const speed = parseFloat(elem.getAttribute('data-speed'));
        const yMovement = (1 - speed) * 300; // calculate pixel movement based on speed ratio
        
        gsap.to(elem, {
            y: yMovement,
            ease: "none",
            scrollTrigger: {
                trigger: elem.closest('.section') || elem,
                start: "top bottom",
                end: "bottom top",
                scrub: true
            }
        });
    });

    // --- 3.5 Foundation & Pillars scrub reveals (shared helper) ---
    setupAllScrollReveals();
    initIndustriesInteractions();
                    
    // Animate the 60% counter independently when the card is reached
    ScrollTrigger.create({
        trigger: ".speed-card",
        start: "top 80%",
        onEnter: () => {
            gsap.fromTo(".gs-counter", 
                { innerHTML: 0 }, 
                { innerHTML: 60, duration: 2.5, snap: { innerHTML: 1 }, ease: "power4.out" }
            );
        }
    });

    // --- 4. Responsive MatchMedia for Heavy ScrollTriggers ---
    let mm = gsap.matchMedia();

    mm.add("(min-width: 769px)", () => {
        
        // A. Horizontal Scroll (Why Hospitals)
        const scrollZone = document.querySelector('.benefits-scroll-zone');
        const scrollWrapper = document.querySelector('.horizontal-scroll-wrapper');
        
        if (scrollZone && scrollWrapper) {
            const getScrollAmount = () => -(scrollWrapper.scrollWidth - window.innerWidth + 100);
            
            const tween = gsap.to(scrollWrapper, {
                x: getScrollAmount,
                ease: "none"
            });
            
            ScrollTrigger.create({
                trigger: scrollZone,
                start: "center center",
                end: () => `+=${scrollWrapper.scrollWidth - window.innerWidth}`,
                pin: true,
                animation: tween,
                scrub: 1,
                invalidateOnRefresh: true
            });
        }

        // B. Key Benefits Scroll Spy & Pinning
        const benefitSections = document.querySelectorAll('.key-benefits');
        
        benefitSections.forEach(section => {
            const layout = section.querySelector('.key-benefits-layout');
            const items = section.querySelectorAll('.benefit-item');
            const media = section.querySelector('.key-benefits-media');
            const visuals = section.querySelectorAll('.benefit-visual');
            
            if (layout && items.length > 0 && media) {
                
                // We will use native CSS position: sticky for much smoother pinning
                // instead of GSAP pin which causes jumping on reverse scroll.

                // Function to strictly enforce one active item
                const activateItem = (index) => {
                    if (index < 0) index = 0;
                    if (index >= items.length) index = items.length - 1;
                    items.forEach((item, i) => {
                        item.classList.toggle('active', i === index);
                    });
                    if (visuals.length) {
                        visuals.forEach((visual, i) => {
                            visual.classList.toggle('active', i === index);
                        });
                    }
                };

                // Initialize first item as active
                activateItem(0);

                // Setup single-line triggers for perfect jumping
                items.forEach((item, i) => {
                    // We skip the first item because it's active by default until item 1 crosses the line
                    if (i === 0) return;
                    
                    ScrollTrigger.create({
                        trigger: item,
                        start: "top 55%", // The exact line on screen where the jump happens
                        onEnter: () => activateItem(i),
                        onLeaveBack: () => activateItem(i - 1)
                    });
                });
            }
        });
    });

    // --- 4.5 Features Layer Swapping ---
    const featureTextBlocks = document.querySelectorAll('.feature-text-block');
    const featureVisuals = document.querySelectorAll('.feature-visual');

    if (featureTextBlocks.length > 0 && featureVisuals.length > 0) {
        const activateFeature = (index) => {
            featureTextBlocks.forEach((b, i) => b.classList.toggle('active', i === index));
            featureVisuals.forEach((v, i) => v.classList.toggle('active', i === index));
        };
        
        activateFeature(0);

        featureTextBlocks.forEach((block, i) => {
            if (i === 0) return;
            ScrollTrigger.create({
                trigger: block,
                start: "top 55%",
                onEnter: () => activateFeature(i),
                onLeaveBack: () => activateFeature(i - 1)
            });
        });
    }

    // --- 5. Prismatic Glow Tracking ---
    document.querySelectorAll('.bento-box, .ecosystem-card').forEach(box => {
        box.addEventListener('mousemove', e => {
            const rect = box.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            box.style.setProperty('--mouse-x', `${x}px`);
            box.style.setProperty('--mouse-y', `${y}px`);
        });
    });

    // --- 5.5 Vertical Timeline Effect ---
    const timelineContainer = document.querySelector('.timeline-container');
    if (timelineContainer) {
        // Trace the glowing line down the spine
        gsap.to('.timeline-progress', {
            height: '100%',
            ease: "none",
            scrollTrigger: {
                trigger: timelineContainer,
                start: "top center",
                end: "bottom center",
                scrub: true
            }
        });

        // Reveal timeline steps
        const timelineSteps = document.querySelectorAll('.timeline-step');
        timelineSteps.forEach(step => {
            const node = step.querySelector('.timeline-node');
            const card = step.querySelector('.timeline-card');
            
            ScrollTrigger.create({
                trigger: step,
                start: "top 60%", // Activate when reaching slightly below center
                onEnter: () => {
                    if (node) node.classList.add('active');
                    if (card) card.classList.add('active');
                },
                onLeaveBack: () => {
                    if (node) node.classList.remove('active');
                    if (card) card.classList.remove('active');
                }
            });
        });
    }

    // --- 6. Privacy Shield Rotation ---
    const shieldSvg = document.getElementById('privacy-shield-bg');
    if (shieldSvg) {
        gsap.to(shieldSvg, {
            rotation: 45,
            scale: 0.8,
            ease: "none",
            scrollTrigger: {
                trigger: ".privacy-promise",
                start: "top bottom",
                end: "bottom top",
                scrub: true
            }
        });
    }

    // --- 6.5 Deep Void Text Scrub Reveal ---
    // Beautiful cinematic word-by-word reveal tied to the scroll position
    document.querySelectorAll('.gs-text-scrub').forEach(el => {
        // Split text into words manually
        const text = el.innerText;
        el.innerHTML = text.split(' ').map(word => `<span class="scrub-word" style="opacity: 0.15; display: inline-block;">${word}</span>`).join(' ');
        
        const chars = el.querySelectorAll('.scrub-word');
        gsap.to(chars, {
            scrollTrigger: {
                trigger: el,
                start: "top 85%",
                end: "top 40%",
                scrub: 1
            },
            opacity: 1,
            color: "#0F172A",
            stagger: 0.1,
            ease: "none"
        });
    });

    // Staggered list items reveal
    gsap.set('.gs-void-item', { y: 30, opacity: 0, scale: 0.98 });
    ScrollTrigger.batch('.gs-void-item', {
        start: "top 85%",
        onEnter: batch => {
            gsap.to(batch, {
                y: 0,
                opacity: 1,
                scale: 1,
                duration: 0.8,
                stagger: 0.1,
                ease: "power2.out",
                overwrite: true
            });
        },
        onLeaveBack: batch => {
            gsap.to(batch, {
                y: 30,
                opacity: 0,
                scale: 0.98,
                duration: 0.4,
                overwrite: true
            });
        }
    });
    
    // Deep Void Eyebrow fade
    gsap.fromTo('.gs-void-fade', 
        { opacity: 0, letterSpacing: '0.1em' },
        {
            scrollTrigger: {
                trigger: '.gs-void-fade',
                start: "top 90%",
                end: "top 50%",
                scrub: 1
            },
            opacity: 1,
            letterSpacing: '0.15em',
            ease: "none"
        }
    );

    // Health Intelligence Floating Parallax Image
    gsap.utils.toArray('.gs-parallax-img').forEach(img => {
        gsap.to(img, {
            yPercent: -20, // Moves up 20% of its own height as you scroll down
            ease: "none",
            scrollTrigger: {
                trigger: img.parentElement, // Triggered by the container
                start: "top bottom",
                end: "bottom top",
                scrub: true
            }
        });
    });

    // --- 7. Footer Reveal Effect ---
    // Make the content wrapper layer above the footer
    gsap.set('.footer', { yPercent: -50, opacity: 0 });
    gsap.to('.footer', {
        yPercent: 0,
        opacity: 1,
        ease: "none",
        scrollTrigger: {
            trigger: ".footer",
            start: "top bottom",
            end: "bottom bottom",
            scrub: true
        }
    });

});

// Rebuild scrub reveals after fonts/layout settle (fixes zero-height measure on first pass)
window.addEventListener('load', () => {
    setupAllScrollReveals();
});

window.addEventListener('resize', () => {
    ScrollTrigger.refresh();
});
