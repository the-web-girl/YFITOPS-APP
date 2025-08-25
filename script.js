   // ======= Helpers & State =======
    const $ = sel => document.querySelector(sel);
    const $$ = sel => Array.from(document.querySelectorAll(sel));

    const state = {
      theme: 'dark',
      queue: [],         // { id, title, artist, src, cover, duration }
      current: -1,
      repeat: false,
      shuffle: false,
    };

    function saveTheme() {
      try { localStorage.setItem('yfitops-theme', state.theme); } catch {}
    }
    function loadTheme() {
      try { return localStorage.getItem('yfitops-theme') || 'dark'; } catch { return 'dark'; }
    }

    function formatTime(t) {
      if (!isFinite(t) || t < 0) t = 0;
      const m = Math.floor(t / 60);
      const s = Math.floor(t % 60);
      return m + ':' + String(s).padStart(2, '0');
    }

    function announce(msg) { const log = $('#a11yLog'); log.textContent = msg; }

    // ======= Tone generator (creates a small WAV so the player works out-of-the-box) =======
    function createSineWavBlob(seconds = 2, freq = 440, sampleRate = 44100) {
      const length = seconds * sampleRate;
      const headerSize = 44;
      const buffer = new ArrayBuffer(headerSize + length * 2);
      const view = new DataView(buffer);

      // Write WAV header (PCM 16-bit mono)
      function writeString(offset, str) { for (let i=0; i<str.length; i++) view.setUint8(offset+i, str.charCodeAt(i)); }
      function write16(offset, value) { view.setUint16(offset, value, true); }
      function write32(offset, value) { view.setUint32(offset, value, true); }

      writeString(0, 'RIFF');
      write32(4, 36 + length * 2);
      writeString(8, 'WAVE');
      writeString(12, 'fmt ');
      write32(16, 16);              // PCM chunk size
      write16(20, 1);               // Audio format 1=PCM
      write16(22, 1);               // channels
      write32(24, sampleRate);
      write32(28, sampleRate * 2);  // byte rate
      write16(32, 2);               // block align
      write16(34, 16);              // bits per sample
      writeString(36, 'data');
      write32(40, length * 2);

      // PCM data
      let offset = 44;
      for (let i = 0; i < length; i++) {
        const t = i / sampleRate;
        const sample = Math.sin(2 * Math.PI * freq * t) * 0.3; // -10 dBFS approx
        const s = Math.max(-1, Math.min(1, sample));
        view.setInt16(offset, s * 0x7fff, true);
        offset += 2;
      }

      return new Blob([buffer], { type: 'audio/wav' });
    }

    // ======= Mock catalog =======
    const demoBlob = createSineWavBlob(3, 494); // 3s note (B4)
    const demoURL = URL.createObjectURL(demoBlob);
    const CATALOG = [
      { id: 'd1', title: 'Back of the dead', artist: 'Skillet', src:'https://www.youtube.com/watch?v=Ce-J_lcihEA&list=PLFPYGpFG7Pd1YkemYaOhK2icTngf_hUu8' },
      { id: 'd2', title: 'Impulsion', artist: 'Yfitops Lab', src: demoURL },
      { id: 'd3', title: 'Éther', artist: 'Nocturne', src: demoURL },
      { id: 'd4', title: 'Tessiture', artist: 'Contours', src: demoURL },
      { id: 'd5', title: 'Aurore', artist: 'Horizon', src: demoURL }
    ];

    // ======= UI Bootstrap =======
    function cardTemplate(track) {
      return `
        <article class="card" role="listitem">
          <div class="cover" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/><path d="M9 8l8 4-8 4z" fill="#22c55e"/></svg>
          </div>
          <div class="meta">
            <div class="title ellipsis" title="${track.title}">${track.title}</div>
            <div class="subtitle ellipsis" title="${track.artist}">${track.artist}</div>
            <div class="actions">
              <button class="btn" data-action="play" data-id="${track.id}" aria-label="Lire ${track.title} par ${track.artist}">Lire</button>
              <button class="btn" data-action="queue" data-id="${track.id}" aria-label="Ajouter ${track.title} à la file d'attente">+ File</button>
            </div>
          </div>
        </article>`;
    }

    function renderSections() {
      $('#heroCards').innerHTML = CATALOG.slice(0, 4).map(cardTemplate).join('');
      $('#popCards').innerHTML = CATALOG.slice().reverse().map(cardTemplate).join('');
    }

    // ======= Player Logic =======
    const audio = $('#audio');
    const playBtn = $('#playBtn');
    const prevBtn = $('#prevBtn');
    const nextBtn = $('#nextBtn');
    const repeatBtn = $('#repeatBtn');
    const shuffleBtn = $('#shuffleBtn');
    const muteBtn = $('#muteBtn');
    const seek = $('#seek');
    const vol = $('#vol');
    const nowTitle = $('#nowTitle');
    const nowArtist = $('#nowArtist');
    const currentTimeEl = $('#currentTime');
    const durationEl = $('#duration');

    function setQueue(list) { state.queue = list.slice(); }
    setQueue(CATALOG);

    function load(index) {
      if (index < 0 || index >= state.queue.length) return;
      state.current = index;
      const t = state.queue[index];
      audio.src = t.src;
      nowTitle.textContent = t.title;
      nowArtist.textContent = t.artist;
      document.title = `${t.title} • ${t.artist} — Yfitops`;
      announce(`Chargé: ${t.title} par ${t.artist}`);
    }

    function play() {
      if (!audio.src) load(0);
      audio.play().then(() => {
        $('.player').dataset.state = 'playing';
        playBtn.textContent = '⏸';
        playBtn.setAttribute('aria-label', 'Pause (Espace)');
        announce('Lecture');
      }).catch(() => {});
    }

    function pause() {
      audio.pause();
      $('.player').dataset.state = 'paused';
      playBtn.textContent = '▶️';
      playBtn.setAttribute('aria-label', 'Lecture (Espace)');
      announce('Pause');
    }

    function togglePlay() { audio.paused ? play() : pause(); }
    function prev() { if (state.queue.length) { const i = Math.max(0, state.current - 1); load(i); play(); } }
    function next(auto=false) {
      if (!state.queue.length) return;
      let i = state.current + 1;
      if (state.shuffle) i = Math.floor(Math.random() * state.queue.length);
      if (i >= state.queue.length) i = 0;
      if (auto && state.repeat) i = state.current; // repeat current
      load(i); play();
    }

    function setRepeat(v) { state.repeat = v; repeatBtn.setAttribute('aria-pressed', String(v)); announce(v ? 'Répétition activée' : 'Répétition désactivée'); }
    function setShuffle(v) { state.shuffle = v; shuffleBtn.setAttribute('aria-pressed', String(v)); announce(v ? 'Aléatoire activé' : 'Aléatoire désactivé'); }

    // Events
    playBtn.addEventListener('click', togglePlay);
    prevBtn.addEventListener('click', prev);
    nextBtn.addEventListener('click', () => next(false));
    repeatBtn.addEventListener('click', () => setRepeat(!state.repeat));
    shuffleBtn.addEventListener('click', () => setShuffle(!state.shuffle));

    muteBtn.addEventListener('click', () => {
      audio.muted = !audio.muted;
      muteBtn.setAttribute('aria-pressed', String(audio.muted));
      muteBtn.textContent = audio.muted ? '🔇' : '🔈';
      announce(audio.muted ? 'Son coupé' : 'Son rétabli');
    });

    vol.addEventListener('input', () => { audio.volume = parseFloat(vol.value); });

    audio.addEventListener('timeupdate', () => {
      currentTimeEl.textContent = formatTime(audio.currentTime);
      seek.value = audio.duration ? Math.round((audio.currentTime / audio.duration) * 100) : 0;
    });

    audio.addEventListener('loadedmetadata', () => {
      durationEl.textContent = formatTime(audio.duration);
    });

    audio.addEventListener('ended', () => next(true));

    seek.addEventListener('input', () => {
      if (!audio.duration) return;
      const pct = parseFloat(seek.value) / 100;
      audio.currentTime = pct * audio.duration;
    });

    // Keyboard shortcuts (WCAG: ensure they don't conflict & are discoverable)
    document.addEventListener('keydown', (e) => {
      if (e.key === ' ' && document.activeElement.tagName !== 'INPUT') { e.preventDefault(); togglePlay(); }
      if ((e.altKey || e.metaKey) && e.key === '/') { e.preventDefault(); $('#q').focus(); }
      if (e.key === 'ArrowRight' && !audio.paused) { audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + 5); }
      if (e.key === 'ArrowLeft' && !audio.paused) { audio.currentTime = Math.max(0, audio.currentTime - 5); }
    }, { passive: false });

    // Delegate play/queue buttons
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      const id = btn.getAttribute('data-id');
      const idx = state.queue.findIndex(t => t.id === id);
      if (btn.dataset.action === 'play') { if (idx !== -1) { load(idx); play(); } }
      if (btn.dataset.action === 'queue') { announce('Ajouté à la file: ' + (state.queue[idx]?.title || 'Titre')); }
    });

    // Upload / Drag & Drop
    const drop = $('#drop');
    const fileInput = $('#file');
    drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.style.borderColor = 'var(--accent-2)'; });
    drop.addEventListener('dragleave', () => { drop.style.borderColor = 'var(--border)'; });
    drop.addEventListener('drop', (e) => { e.preventDefault(); drop.style.borderColor = 'var(--border)'; handleFiles(e.dataTransfer.files); });
    drop.addEventListener('click', () => fileInput.click());
    drop.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); } });
    fileInput.addEventListener('change', () => handleFiles(fileInput.files));

    function handleFiles(files) {
      if (!files || !files.length) return;
      drop.setAttribute('aria-busy', 'true');
      const newTracks = [];
      Array.from(files).forEach((f, i) => {
        const url = URL.createObjectURL(f);
        const base = f.name.replace(/\.[^.]+$/, '');
        newTracks.push({ id: 'u' + Date.now() + '-' + i, title: base, artist: 'Importé', src: url });
      });
      // Render cards
      const container = $('#userTracks');
      container.insertAdjacentHTML('beforeend', newTracks.map(cardTemplate).join(''));
      // Add to queue
      state.queue.push(...newTracks);
      drop.setAttribute('aria-busy', 'false');
      announce(newTracks.length + ' fichier(s) importé(s)');
    }

    // Theme switch
    const themeBtn = $('#themeBtn');
    function applyTheme(t) { document.querySelector('.app').setAttribute('data-theme', t); themeBtn.setAttribute('aria-pressed', String(t==='dark')); }
    state.theme = loadTheme();
    applyTheme(state.theme);
    themeBtn.addEventListener('click', () => { state.theme = state.theme === 'dark' ? 'light' : 'dark'; applyTheme(state.theme); saveTheme(); });

    // Init
    renderSections();
    load(0); // Preload first track

    // Respect prefers-reduced-motion for focus scrolls
    document.getElementById('skip-link').addEventListener('click', () => {
      document.getElementById('main').focus({ preventScroll: false });
    });