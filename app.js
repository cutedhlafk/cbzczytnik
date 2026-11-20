(() => {
  const fileInput = document.getElementById('cbz-file');
  const driveButton = document.getElementById('drive-button');
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

  function driveConfig() {
    const config = window.PANEL_GOOGLE_CONFIG || {};
    return config.apiKey && config.clientId && config.appId &&
      !/WSTAW|YOUR_|TU_WSTAW/i.test(`${config.apiKey} ${config.clientId} ${config.appId}`)
      ? config : null;
  }

  function loadPicker() {
    return new Promise((resolve, reject) => {
      if (!window.gapi?.load) return reject(new Error('Nie uda�o si� za�adowa� Google Picker. Sprawd� po��czenie z internetem.'));
      window.gapi.load('picker', { callback: resolve, onerror: () => reject(new Error('Google Picker nie mo�e si� za�adowa�.')) });
    });
  }

  async function selectDriveComic(accessToken, config) {
    await loadPicker();
    return new Promise((resolve, reject) => {
      const picker = new google.picker.PickerBuilder()
        .setAppId(config.appId)
        .setOAuthToken(accessToken)
        .setDeveloperKey(config.apiKey)
        .setOrigin(window.location.origin)
        .addView(new google.picker.DocsView())
        .setCallback(async (data) => {
          if (data.action === google.picker.Action.CANCEL) return resolve(null);
          if (data.action !== google.picker.Action.PICKED) return;
          const selected = data.docs?.[0];
          if (!selected) return resolve(null);
          if (!/\.(cbz|zip)$/i.test(selected.name || '')) return reject(new Error('Wybierz plik z rozszerzeniem .cbz albo .zip.'));
          try {
            const response = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(selected.id)}?alt=media`, {
              headers: { Authorization: `Bearer ${accessToken}` }
            });
            if (!response.ok) throw new Error(response.status === 403
              ? 'Google nie pozwoli� pobra� tego pliku. Sprawd� uprawnienia do pliku i spr�buj ponownie.'
              : `Nie uda�o si� pobra� pliku z Google Drive (b��d ${response.status}).`);
            const blob = await response.blob();
            resolve(new File([blob], selected.name, { type: 'application/zip' }));
          } catch (error) { reject(error); }
        })
        .build();
      picker.setVisible(true);
    });
  }

  async function openFromDrive() {
    clearError();
    const config = driveConfig();
    if (!config) {
      showError('Najpierw skonfiguruj Google Drive w pliku drive-config.js. Instrukcja jest w README projektu.');
      return;
    }
    if (!window.google?.accounts?.oauth2 || !window.gapi?.load) {
      showError('Nie uda�o si� po��czy� z us�ugami Google. Sprawd� internet i od�wie� stron�.');
      return;
    }
    driveButton.disabled = true;
    driveButton.textContent = '��czenie z Google';
    try {
      const token = await new Promise((resolve, reject) => {
        const client = google.accounts.oauth2.initTokenClient({
          client_id: config.clientId,
          scope: 'https://www.googleapis.com/auth/drive.file',
          callback: (result) => result.error ? reject(new Error('Logowanie Google zosta�o przerwane lub odrzucone.')) : resolve(result.access_token)
        });
        client.requestAccessToken();
      });
      driveButton.textContent = 'Wybierz plik na Dysku';
      const file = await selectDriveComic(token, config);
      if (file) await openComic(file);
    } catch (error) {
      showError(error?.message || 'Nie uda�o si� pobra� pliku z Google Drive.');
    } finally {
      driveButton.disabled = false;
      driveButton.textContent = 'Otw�rz CBZ z Google Drive';
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
  driveButton.addEventListener('click', openFromDrive);
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

