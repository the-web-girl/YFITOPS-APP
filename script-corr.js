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

    function announce(msg) { 
      const log = $('#a11yLog'); 
      log.textContent = msg; 
      console.log('🎵 Yfitops:', msg);
    }

    // ======= Enhanced tone generator for different musical styles =======
    function createMusicBlob(type = 'melody', seconds = 30, sampleRate = 44100) {
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
      write32(16, 16);              
      write16(20, 1);               
      write16(22, 1);               
      write32(24, sampleRate);
      write32(28, sampleRate * 2);  
      write16(32, 2);               
      write16(34, 16);              
      writeString(36, 'data');
      write32(40, length * 2);

      // Generate different musical patterns
      let offset = 44;
      for (let i = 0; i < length; i++) {
        const t = i / sampleRate;
        let sample = 0;

        switch(type) {
          case 'melody':
            // Pleasant melody with harmonics
            sample = Math.sin(2 * Math.PI * 523.25 * t) * 0.3 * Math.sin(t * 0.5) + // C5
                     Math.sin(2 * Math.PI * 659.25 * t) * 0.2 * Math.sin(t * 0.7) + // E5
                     Math.sin(2 * Math.PI * 783.99 * t) * 0.1 * Math.sin(t * 0.3);  // G5
            break;
          case 'upbeat':
            // Rhythmic upbeat pattern
            const beat = Math.floor(t * 2) % 2;
            sample = Math.sin(2 * Math.PI * (440 + beat * 110) * t) * 0.4 * 
                     (Math.sin(t * 8) > 0 ? 1 : 0.3);
            break;
          case 'chill':
            // Ambient chill sound
            sample = Math.sin(2 * Math.PI * 220 * t) * 0.2 * Math.sin(t * 0.2) +
                     Math.sin(2 * Math.PI * 330 * t) * 0.15 * Math.sin(t * 0.15) +
                     (Math.random() - 0.5) * 0.05; // Add slight noise
            break;
          case 'electronic':
            // Electronic-style sound
            const freq = 440 + Math.sin(t * 2) * 100;
            sample = Math.sign(Math.sin(2 * Math.PI * freq * t)) * 0.3 * 
                     Math.sin(t * 4);
            break;
          case 'piano':
            // Piano-like sound with decay
            const decay = Math.exp(-t * 2);
            sample = Math.sin(2 * Math.PI * 440 * t) * 0.4 * decay +
                     Math.sin(2 * Math.PI * 880 * t) * 0.2 * decay +
                     Math.sin(2 * Math.PI * 1320 * t) * 0.1 * decay;
            break;
          default:
            sample = Math.sin(2 * Math.PI * 440 * t) * 0.3;
        }

        // Apply envelope and clipping
        const envelope = Math.min(1, t * 10) * Math.min(1, (seconds - t) * 10);
        sample *= envelope;
        const clipped = Math.max(-1, Math.min(1, sample));
        view.setInt16(offset, clipped * 0x7fff, true);
        offset += 2;
      }

      return new Blob([buffer], { type: 'audio/wav' });
    }

    // ======= Music Catalog with Generated Audio + Free Sources =======
    const melodyBlob = createMusicBlob('melody', 45);
    const upbeatBlob = createMusicBlob('upbeat', 40);  
    const chillBlob = createMusicBlob('chill', 50);
    const electronicBlob = createMusicBlob('electronic', 35);
    const pianoBlob = createMusicBlob('piano', 38);
    const bassBlob = createMusicBlob('melody', 42);

    const CATALOG = [
      {
        id: 'gen1',
        title: 'Sunny Walk',
        artist: 'Yfitops Studio',
        src: URL.createObjectURL(melodyBlob),
        duration: 45
      },
      {
        id: 'gen2', 
        title: 'Creative Minds',
        artist: 'Yfitops Beats',
        src: URL.createObjectURL(upbeatBlob),
        duration: 40
      },
      {
        id: 'gen3',
        title: 'Acoustic Breeze',
        artist: 'Yfitops Chill', 
        src: URL.createObjectURL(chillBlob),
        duration: 50
      },
      {
        id: 'gen4',
        title: 'Happy Rock',
        artist: 'Yfitops Energy',
        src: URL.createObjectURL(electronicBlob),
        duration: 35
      },
      {
        id: 'gen5',
        title: 'Groovy Piano',
        artist: 'Yfitops Keys',
        src: URL.createObjectURL(pianoBlob),
        duration: 38
      },
      {
        id: 'gen6',
        title: 'Bass Journey',
        artist: 'Yfitops Deep',
        src: URL.createObjectURL(bassBlob),
        duration: 42
      },
      // Free music sources that support CORS
      {
        id: 'free1',
        title: 'File Example MP3',
        artist: 'Sample Audio',
        src: 'https://file-examples.com/storage/fe68c8c45bb862422a99e0b/2017/11/file_example_MP3_700KB.mp3',
        duration: 27
      },
      {
        id: 'free2',
        title: 'Test Audio Stream',
        artist: 'Mozilla Demo',
        src: 'https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3',
        duration: 3
      },
        {
        id: 'mamusique2',
        title: 'Barely Alive',
        artist: 'Oceans Divide',
        src: 'assets/Barely Alive.mp3',
        duration: 196
        }
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
      $('#heroCards').innerHTML = CATALOG.slice(0, 3).map(cardTemplate).join('');
      $('#popCards').innerHTML = CATALOG.slice(3).map(cardTemplate).join('');
    }

    // ======= Enhanced Metadata Extraction =======
    async function extractMetadata(file) {
      return new Promise((resolve) => {
        const audio = new Audio();
        const url = URL.createObjectURL(file);
        
        audio.addEventListener('loadedmetadata', () => {
          const fileName = file.name.replace(/\.[^.]+$/, '');
          const duration = audio.duration || 0;
          
          // Try to extract from filename (Artist - Title format)
          const parts = fileName.split(' - ');
          let title = fileName;
          let artist = 'Artiste inconnu';
          
          if (parts.length >= 2) {
            artist = parts[0].trim();
            title = parts.slice(1).join(' - ').trim();
          }
          
          URL.revokeObjectURL(url);
          resolve({
            title,
            artist,
            duration,
            originalName: file.name
          });
        });
        
        audio.addEventListener('error', () => {
          URL.revokeObjectURL(url);
          resolve({
            title: file.name.replace(/\.[^.]+$/, ''),
            artist: 'Artiste inconnu',
            duration: 0,
            originalName: file.name
          });
        });
        
        audio.src = url;
      });
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

    function setQueue(list) { 
      state.queue = list.slice();
      announce(`File d'attente mise à jour: ${list.length} titres`);
    }
    
    // Initialize with catalog
    setQueue(CATALOG);

    function load(index) {
      if (index < 0 || index >= state.queue.length) return;
      state.current = index;
      const t = state.queue[index];
      
      // Add loading state
      $('.player').classList.add('loading');
      
      audio.src = t.src;
      nowTitle.textContent = t.title;
      nowArtist.textContent = t.artist;
      document.title = `${t.title} • ${t.artist} — Yfitops`;
      announce(`Chargé: ${t.title} par ${t.artist}`);
    }

    function play() {
      if (!audio.src && state.queue.length > 0) {
        load(0);
      }
      
      if (!audio.src) {
        announce('Aucune musique disponible');
        return;
      }
      
      const playPromise = audio.play();
      
      if (playPromise !== undefined) {
        playPromise.then(() => {
          $('.player').dataset.state = 'playing';
          $('.player').classList.remove('loading');
          playBtn.textContent = '⏸';
          playBtn.setAttribute('aria-label', 'Pause (Espace)');
          announce('Lecture en cours');
        }).catch(error => {
          console.error('Erreur de lecture:', error);
          $('.player').classList.remove('loading');
          announce('Erreur de lecture: ' + error.message);
          
          // Try to load next track if current fails
          if (state.current < state.queue.length - 1) {
            setTimeout(() => next(false), 1000);
          }
        });
      }
    }

    function pause() {
      audio.pause();
      $('.player').dataset.state = 'paused';
      $('.player').classList.remove('loading');
      playBtn.textContent = '▶️';
      playBtn.setAttribute('aria-label', 'Lecture (Espace)');
      announce('Pause');
    }

    function togglePlay() { 
      if (audio.paused || audio.ended) {
        play(); 
      } else {
        pause();
      }
    }
    
    function prev() { 
      if (state.queue.length) { 
        const i = state.current <= 0 ? state.queue.length - 1 : state.current - 1; 
        load(i); 
        if (!audio.paused) play(); 
      } 
    }
    
    function next(auto = false) {
      if (!state.queue.length) return;
      
      let i = state.current + 1;
      
      if (state.shuffle) {
        // Avoid repeating same track in shuffle
        const availableIndexes = state.queue.map((_, idx) => idx).filter(idx => idx !== state.current);
        if (availableIndexes.length > 0) {
          i = availableIndexes[Math.floor(Math.random() * availableIndexes.length)];
        }
      }
      
      if (i >= state.queue.length) {
        i = 0;
      }
      
      if (auto && state.repeat && state.queue.length === 1) {
        i = state.current; // repeat current track
      }
      
      load(i); 
      if (!audio.paused || auto) play();
    }

    function setRepeat(v) { 
      state.repeat = v; 
      repeatBtn.setAttribute('aria-pressed', String(v)); 
      announce(v ? 'Répétition activée' : 'Répétition désactivée'); 
    }
    
    function setShuffle(v) { 
      state.shuffle = v; 
      shuffleBtn.setAttribute('aria-pressed', String(v)); 
      announce(v ? 'Aléatoire activé' : 'Aléatoire désactivé'); 
    }

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

    vol.addEventListener('input', () => { 
      audio.volume = parseFloat(vol.value); 
    });

    audio.addEventListener('timeupdate', () => {
      if (audio.duration) {
        currentTimeEl.textContent = formatTime(audio.currentTime);
        seek.value = Math.round((audio.currentTime / audio.duration) * 100);
      }
    });

    audio.addEventListener('loadedmetadata', () => {
      durationEl.textContent = formatTime(audio.duration);
      $('.player').classList.remove('loading');
    });

    audio.addEventListener('ended', () => {
      if (state.repeat && state.queue.length === 1) {
        // Repeat current track
        audio.currentTime = 0;
        play();
      } else {
        next(true);
      }
    });

    audio.addEventListener('error', (e) => {
      console.error('Audio error:', e);
      $('.player').classList.remove('loading');
      announce('Erreur de chargement audio');
      
      // Auto-skip to next track on error
      if (state.current < state.queue.length - 1) {
        setTimeout(() => next(false), 2000);
      }
    });

    seek.addEventListener('input', () => {
      if (!audio.duration) return;
      const pct = parseFloat(seek.value) / 100;
      audio.currentTime = pct * audio.duration;
    });

    // Enhanced keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Prevent conflicts with form inputs
      if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') {
        if (e.key === ' ' && e.target.id !== 'q') return; // Allow space in search
        if ((e.altKey || e.metaKey) && e.key === '/') { 
          e.preventDefault(); 
          $('#q').focus(); 
          return;
        }
        return;
      }
      
      switch(e.key) {
        case ' ':
          e.preventDefault(); 
          togglePlay(); 
          break;
        case 'ArrowRight':
          if (!audio.paused && audio.duration) { 
            audio.currentTime = Math.min(audio.duration, audio.currentTime + 10); 
          }
          break;
        case 'ArrowLeft':
          if (!audio.paused && audio.duration) { 
            audio.currentTime = Math.max(0, audio.currentTime - 10); 
          }
          break;
        case 'ArrowUp':
          e.preventDefault();
          audio.volume = Math.min(1, audio.volume + 0.1);
          vol.value = audio.volume;
          break;
        case 'ArrowDown':
          e.preventDefault();
          audio.volume = Math.max(0, audio.volume - 0.1);
          vol.value = audio.volume;
          break;
        case 'n': // next
          next(false);
          break;
        case 'p': // previous
          prev();
          break;
        case 'm': // mute
          muteBtn.click();
          break;
      }
      
      if ((e.altKey || e.metaKey) && e.key === '/') { 
        e.preventDefault(); 
        $('#q').focus(); 
      }
    });

    // Delegate play/queue buttons
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      
      const id = btn.getAttribute('data-id');
      const idx = state.queue.findIndex(t => t.id === id);
      
      if (btn.dataset.action === 'play' && idx !== -1) { 
        load(idx); 
        play(); 
      }
      
      if (btn.dataset.action === 'queue' && idx !== -1) { 
        announce('Ajouté à la file: ' + state.queue[idx].title); 
      }
    });

    // Enhanced Upload / Drag & Drop with metadata extraction
    const drop = $('#drop');
    const fileInput = $('#file');
    
    drop.addEventListener('dragover', (e) => { 
      e.preventDefault(); 
      drop.style.borderColor = 'var(--accent-2)'; 
    });
    
    drop.addEventListener('dragleave', () => { 
      drop.style.borderColor = 'var(--border)'; 
    });
    
    drop.addEventListener('drop', (e) => { 
      e.preventDefault(); 
      drop.style.borderColor = 'var(--border)'; 
      handleFiles(e.dataTransfer.files); 
    });
    
    drop.addEventListener('click', () => fileInput.click());
    
    drop.addEventListener('keydown', (e) => { 
      if (e.key === 'Enter' || e.key === ' ') { 
        e.preventDefault(); 
        fileInput.click(); 
      } 
    });
    
    fileInput.addEventListener('change', () => handleFiles(fileInput.files));

    async function handleFiles(files) {
      if (!files || !files.length) return;
      
      drop.setAttribute('aria-busy', 'true');
      drop.innerHTML = 'Traitement des fichiers...';
      
      const newTracks = [];
      
      try {
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          
          // Validate file type
          if (!file.type.startsWith('audio/')) {
            console.warn(`Fichier ignoré (pas audio): ${file.name}`);
            continue;
          }
          
          const metadata = await extractMetadata(file);
          const url = URL.createObjectURL(file);
          
          newTracks.push({ 
            id: 'user-' + Date.now() + '-' + i, 
            title: metadata.title,
            artist: metadata.artist, 
            src: url,
            duration: metadata.duration,
            isUserFile: true
          });
        }
        
        // Add to queue
        state.queue.push(...newTracks);
        
        // Render cards
        const container = $('#userTracks');
        container.insertAdjacentHTML('beforeend', newTracks.map(cardTemplate).join(''));
        
        announce(`${newTracks.length} fichier(s) importé(s) avec succès`);
        
      } catch (error) {
        console.error('Erreur lors du traitement:', error);
        announce('Erreur lors de l\'import des fichiers');
      } finally {
        drop.setAttribute('aria-busy', 'false');
        drop.innerHTML = 'Glissez-déposez des fichiers .mp3/.wav ici ou <label for="file" style="text-decoration: underline; cursor: pointer;">cliquez pour sélectionner</label>.';
        fileInput.value = ''; // Reset input
      }
    }

    // Search functionality
    const searchInput = $('#q');
    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase().trim();
      
      if (!query) {
        renderSections(); // Show all
        return;
      }
      
      const filtered = CATALOG.concat(state.queue.filter(t => t.isUserFile)).filter(track => 
        track.title.toLowerCase().includes(query) || 
        track.artist.toLowerCase().includes(query)
      );
      
      $('#heroCards').innerHTML = filtered.slice(0, 6).map(cardTemplate).join('');
      $('#popCards').innerHTML = '';
      
      if (filtered.length === 0) {
        $('#heroCards').innerHTML = '<p style="text-align: center; color: var(--muted);">Aucun résultat trouvé</p>';
      }
    });

    // Theme switch
    const themeBtn = $('#themeBtn');
    function applyTheme(t) { 
      document.querySelector('.app').setAttribute('data-theme', t); 
      themeBtn.setAttribute('aria-pressed', String(t === 'dark')); 
      themeBtn.textContent = t === 'dark' ? '☀️ Clair' : '🌙 Sombre';
    }
    
    state.theme = loadTheme();
    applyTheme(state.theme);
    
    themeBtn.addEventListener('click', () => { 
      state.theme = state.theme === 'dark' ? 'light' : 'dark'; 
      applyTheme(state.theme); 
      saveTheme(); 
    });

    // Initialize app
    renderSections();
    
    // Auto-load first track but don't play
    if (state.queue.length > 0) {
      load(0);
    }

    // Accessibility: Skip link
    document.getElementById('skip-link').addEventListener('click', (e) => {
      e.preventDefault();
      document.getElementById('main').focus({ preventScroll: false });
    });

    // Show ready message
    console.log('🎵 Yfitops est prêt! Utilisez les raccourcis clavier:');
    console.log('   Espace: Lecture/Pause');
    console.log('   n: Piste suivante');
    console.log('   p: Piste précédente');
    console.log('   m: Muet');
    console.log('   ↑↓: Volume');
    console.log('   ←→: Avance/Recule (10s)');
    console.log('   Alt+/: Focus recherche');
    
    announce('Yfitops chargé avec succès. Prêt à écouter de la musique!');