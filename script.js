document.getElementById('year').textContent = new Date().getFullYear();

const backToTop = document.getElementById('back-to-top');
function updateBackToTop() {
    backToTop.hidden = window.scrollY < 400;
}
window.addEventListener('scroll', updateBackToTop, { passive: true });
updateBackToTop();

const dialog = document.getElementById('project-dialog');
if (typeof dialog.showModal === 'function') {
    const liveLink = document.getElementById('live-link');
    for (const project of document.querySelectorAll('[data-project]')) {
        project.setAttribute('aria-haspopup', 'dialog');
        project.addEventListener('click', (event) => {
            // Preserve normal link behavior for opening the repository in another tab.
            if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
            event.preventDefault();
            document.getElementById('dialog-title').textContent = project.dataset.project;
            document.getElementById('github-link').href = project.href;
            const url = project.dataset.liveUrl;
            const published = /^https?:\/\//i.test(url);
            liveLink.removeAttribute('href');
            liveLink.setAttribute('aria-disabled', String(!published));
            if (published) liveLink.href = url;
            const status = document.getElementById('live-status');
            status.textContent = published ? 'Live site: Published' : 'Live site: Not deployed';
            status.className = published ? 'online' : 'offline';
            dialog.showModal();
        });
    }
    dialog.addEventListener('click', (event) => {
        if (event.target !== dialog) return;
        const bounds = dialog.getBoundingClientRect();
        if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
    });
}

// Keep content visible without JavaScript or when motion is reduced.
if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const observer = new IntersectionObserver((entries) => {
        for (const entry of entries) {
            if (entry.isIntersecting) {
                entry.target.classList.remove('is-pending');
                observer.unobserve(entry.target);
            }
        }
    }, { threshold: 0.08 });

    for (const section of document.querySelectorAll('.reveal')) {
        section.classList.add('is-pending');
        observer.observe(section);
    }
}
