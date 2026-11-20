(() => {
  const fileInput = document.getElementById('cbz-file');
  const libraryView = document.getElementById('library-view');
  const readerView = document.getElementById('reader-view');
  const pageImage = document.getElementById('comic-page');
  const pageCounter = document.getElementById('page-counter');
  const percentCounter = document.getElementById('percent-counter');
  const pageSlider = document.getElementById('page-slider');
  const loadError = document.getElementById('load-error');
  const loading = document.getElementById('reader-loading');
  const bookTitle = document.getElementById('book-title');
  const bookSubtitle = document.getElementById('book-subtitle');
  const stage = document.getElementById('reader-stage');
  const pageWrap = document.getElementById('page-wrap');
  let pages = [];
  let pageUrls = [];
  let pageIndex = 0;
  let touchStartX = 0;
  let touchStartY = 0;
  let fitMode = 'page';

  const imageExtensions = /\.(avif|bmp|gif|heic|heif|jpe?g|png|tiff?|webp)$/i;
  const naturalCompare = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

  function showError(message) {
    loadError.textContent = message;
    loadError.hidden = false;
  }

  function clearError() {
    loadError.hidden = true;
    loadError.textContent = '';
  }

  function releasePages() {
    pageUrls.forEach((url) => URL.revokeObjectURL(url));
    pageUrls = [];
    pages = [];
  }

  async function openComic(file) {
    clearError();
    if (!file) return;
    if (!window.JSZip) {
      showError('Nie uda�o si� wczyta� obs�ugi archiw�w. Sprawd� po��czenie z internetem i spr�buj ponownie.');
      return;
    }
    if (!/\.(cbz|zip)$/i.test(file.name)) {
      showError('Wybierz plik .cbz.');
      return;
    }

    loading.hidden = false;
    try {
      const archive = await JSZip.loadAsync(file, { checkCRC32: false });
      const entries = Object.values(archive.files)
        .filter((entry) => !entry.dir && imageExtensions.test(entry.name) && !entry.name.split('/').some((part) => part.startsWith('.')))
        .sort((a, b) => naturalCompare.compare(a.name, b.name));

      if (!entries.length) throw new Error('W archiwum nie ma rozpoznanych stron w formie obraz�w.');
      releasePages();
      pages = entries;
      bookTitle.textContent = file.name.replace(/\.(cbz|zip)$/i, '');
      bookSubtitle.textContent = `${entries.length} ${entries.length === 1 ? 'strona' : entries.length < 5 ? 'strony' : 'stron'}  plik lokalny`;
      libraryView.hidden = true;
      readerView.hidden = false;
      document.body.classList.add('reading');
      pageSlider.min = '0';
      pageSlider.max = String(entries.length - 1);
      let savedPage = 0;
      try { savedPage = Number(localStorage.getItem(`panel-progress:${bookTitle.textContent}`) || 0); } catch (_) {}
      await showPage(Math.min(savedPage, entries.length - 1));
      if (document.documentElement.requestFullscreen && !/iPhone|iPad|iPod/.test(navigator.userAgent)) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    } catch (error) {
      showError(error?.message || 'Nie uda�o si� otworzy� pliku CBZ.');
      readerView.hidden = true;
      libraryView.hidden = false;
    } finally {
      loading.hidden = true;
      fileInput.value = '';
    }
  }

  async function getPageUrl(index) {
    if (pageUrls[index]) return pageUrls[index];
    const blob = await pages[index].async('blob');
    const url = URL.createObjectURL(blob);
    pageUrls[index] = url;
    return url;
  }

  async function showPage(index) {
    if (!pages.length) return;
    pageIndex = Math.max(0, Math.min(pages.length - 1, Number(index)));
    loading.hidden = false;
    pageImage.style.opacity = '0.35';
    try {
      const url = await getPageUrl(pageIndex);
      await new Promise((resolve, reject) => {
        pageImage.onload = resolve;
        pageImage.onerror = reject;
        pageImage.src = url;
      });
      pageImage.style.opacity = '1';
      pageImage.alt = `Strona ${pageIndex + 1} z ${pages.length}`;
      pageCounter.textContent = `${pageIndex + 1} / ${pages.length}`;
      const percent = Math.round(((pageIndex + 1) / pages.length) * 100);
      percentCounter.textContent = `${percent}%`;
      pageSlider.value = String(pageIndex);
      pageSlider.style.setProperty('--progress', `${pages.length > 1 ? (pageIndex / (pages.length - 1)) * 100 : 100}%`);
      document.getElementById('previous-button').disabled = pageIndex === 0;
      document.getElementById('previous-control').disabled = pageIndex === 0;
      document.getElementById('next-button').disabled = pageIndex === pages.length - 1;
      document.getElementById('next-control').disabled = pageIndex === pages.length - 1;
      try { localStorage.setItem(`panel-progress:${bookTitle.textContent}`, String(pageIndex)); } catch (_) {}
    } catch (_) {
      showError('Nie uda�o si� wy�wietli� tej strony.');
    } finally {
      loading.hidden = true;
    }
  }

  function nextPage() { if (pageIndex < pages.length - 1) showPage(pageIndex + 1); }
  function previousPage() { if (pageIndex > 0) showPage(pageIndex - 1); }

  function closeReader() {
    readerView.hidden = true;
    libraryView.hidden = false;
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    document.body.classList.remove('reading');
    releasePages();
    pageImage.removeAttribute('src');
  }

  fileInput.addEventListener('change', (event) => openComic(event.target.files?.[0]));
  document.getElementById('back-button').addEventListener('click', closeReader);
  document.getElementById('previous-button').addEventListener('click', previousPage);
  document.getElementById('previous-control').addEventListener('click', previousPage);
  document.getElementById('next-button').addEventListener('click', nextPage);
  document.getElementById('next-control').addEventListener('click', nextPage);
  pageSlider.addEventListener('input', (event) => showPage(event.target.value));
  document.getElementById('fit-button').addEventListener('click', () => {
    fitMode = fitMode === 'page' ? 'width' : 'page';
    pageImage.style.maxHeight = fitMode === 'page' ? '100%' : 'none';
    pageImage.style.maxWidth = fitMode === 'width' ? '100vw' : '100%';
    pageWrap.style.overflowY = fitMode === 'width' ? 'auto' : 'hidden';
  });

  document.addEventListener('keydown', (event) => {
    if (readerView.hidden) return;
    if (event.key === 'ArrowRight' || event.key === ' ') { event.preventDefault(); nextPage(); }
    if (event.key === 'ArrowLeft') { event.preventDefault(); previousPage(); }
    if (event.key === 'Escape') closeReader();
  });

  stage.addEventListener('touchstart', (event) => {
    touchStartX = event.changedTouches[0].clientX;
    touchStartY = event.changedTouches[0].clientY;
  }, { passive: true });
  stage.addEventListener('touchend', (event) => {
    const dx = event.changedTouches[0].clientX - touchStartX;
    const dy = event.changedTouches[0].clientY - touchStartY;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.25) {
      if (dx < 0) nextPage(); else previousPage();
    }
  }, { passive: true });
})();

