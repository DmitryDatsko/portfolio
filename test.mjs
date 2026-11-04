import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const script = readFileSync(new URL('script.js', import.meta.url), 'utf8');
for (const [reducedMotion, supported] of [[false, true], [true, true], [false, false]]) {
    const classes = new Set();
    const section = { classList: { add: value => classes.add(value), remove: value => classes.delete(value) } };
    const year = {};
    let callback;
    const observed = new Set();
    class IntersectionObserver {
        constructor(fn) { callback = fn; }
        observe(target) { observed.add(target); }
        unobserve(target) { observed.delete(target); }
    }
    runInNewContext(script, {
        document: { getElementById: () => year, querySelectorAll: () => [section] },
        window: { scrollY: 0, addEventListener() { }, matchMedia: () => ({ matches: reducedMotion }), ...(supported ? { IntersectionObserver } : {}) },
        IntersectionObserver,
    });
    assert.equal(year.textContent, new Date().getFullYear());
    assert.equal(classes.has('is-pending'), supported && !reducedMotion);
    if (supported && !reducedMotion) {
        callback([{ isIntersecting: false, target: section }]);
        assert.ok(classes.has('is-pending'));
        callback([{ isIntersecting: true, target: section }]);
        assert.equal(classes.size, 0);
        assert.equal(observed.size, 0);
    }
}
// Modal state resets between projects, and untrusted URL schemes stay disabled.
const elements = Object.fromEntries(['year', 'dialog-title', 'github-link', 'live-status', 'live-link', 'back-to-top'].map(id => [id, {
    setAttribute(name, value) { this[name] = value; },
    removeAttribute(name) { delete this[name]; },
}]));
let opens = 0;
let closes = 0;
elements['project-dialog'] = {
    showModal() { opens++; }, close() { closes++; },
    addEventListener(type, fn) { this.click = fn; },
    getBoundingClientRect: () => ({ left: 20, right: 300, top: 20, bottom: 300 }),
};
const projects = ['', 'https://example.com', 'javascript:alert(1)', ''].map((url, index) => ({
    dataset: { project: `Project ${index}`, liveUrl: url }, href: `https://github.com/example/project${index}`,
    setAttribute() { }, addEventListener(type, fn) { this.click = fn; },
}));
let scrollHandler;
const browser = { scrollY: 500, addEventListener(type, handler) { if (type === 'scroll') scrollHandler = handler; } };
runInNewContext(script, {
    document: { getElementById: id => elements[id], querySelectorAll: () => projects }, window: browser,
});
assert.equal(elements['back-to-top'].hidden, false, 'Visible when loading a scrolled page');
for (const position of [0, 399, 400, 1000, 0]) {
    browser.scrollY = position;
    scrollHandler();
    assert.equal(elements['back-to-top'].hidden, position < 400);
}
for (const [index, project] of projects.entries()) {
    let prevented = false;
    project.click({ preventDefault() { prevented = true; } });
    assert.ok(prevented);
    assert.equal(elements['dialog-title'].textContent, project.dataset.project);
    assert.equal(elements['github-link'].href, project.href);
    assert.equal(elements['live-link']['aria-disabled'], String(index !== 1));
    assert.equal(elements['live-link'].href, index === 1 ? 'https://example.com' : undefined);
    assert.equal(elements['live-status'].className, index === 1 ? 'online' : 'offline');
    assert.equal(elements['live-status'].textContent, index === 1 ? 'Live site: Published' : 'Live site: Not deployed');
}
projects[0].click({ ctrlKey: true, preventDefault() { assert.fail('Modified click intercepted'); } });
assert.equal(opens, 4);
const modal = elements['project-dialog'];
modal.click({ target: modal, clientX: 50, clientY: 50 });
assert.equal(closes, 0);
modal.click({ target: modal, clientX: 0, clientY: 0 });
assert.equal(closes, 1);

const html = readFileSync(new URL('index.html', import.meta.url), 'utf8');
assert.ok(html.indexOf('id="live-link"') < html.indexOf('id="github-link"'), 'Live button comes first');
assert.ok(!html.includes('GitHub available'), 'No GitHub status');
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
assert.equal(new Set(ids).size, ids.length, 'IDs must be unique');
for (const [, anchor] of html.matchAll(/href="#([^"]+)"/g)) {
    assert.ok(ids.includes(anchor), `Missing anchor: ${anchor}`);
}
assert.equal((html.match(/class="project reveal"/g) || []).length, 4);
assert.match(html, /href="assets\/dmytro_datsko_cv\.pdf" download/);
assert.equal(readFileSync(new URL('assets/dmytro_datsko_cv.pdf', import.meta.url)).toString('ascii', 0, 5), '%PDF-');
const css = readFileSync(new URL('styles.css', import.meta.url), 'utf8');
for (const [, asset] of [...html.matchAll(/src="(assets\/[^"]+)"/g), ...css.matchAll(/url\('([^']+)'\)/g)]) {
    assert.ok(readFileSync(new URL(asset, import.meta.url)).length > 0, `Missing or empty asset: ${asset}`);
}
assert.equal(readFileSync(new URL('assets/JetBrainsMono-Regular.woff2', import.meta.url)).toString('ascii', 0, 4), 'wOF2');
for (const preview of ['cat-result', 'collectible-match', 'car-up', 'dashboard-preview']) {
    assert.ok(css.includes(`.project-art:is(:hover,:focus-visible) .${preview}`), `Missing interaction: ${preview}`);
}
console.log('Passed: reveal behavior, reduced motion, browser fallbacks, anchors, assets, font format, all four preview interactions, modal states, URL scheme validation, backdrop dismissal, and back-to-top visibility.');
