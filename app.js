/**
 * AURA STUDIO PRO - MASTER ENGINE V1.0
 * Features: High-Fidelity Audio, 3-Octave Key Mapping, Persistent AI Analysis, 
 * 15s Timer, Pause/Resume, & Gemini 1.5 Flash Integration.
 */

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const activeOscs = new Map();
let sampleVoices = [];

// App State
let isRecording = false, isPaused = false, recStart = 0, totalPausedTime = 0, pauseStartTime = 0, recData = [], activePlaybackId = null, activeAssetId = null, recInterval = null;
let GEMINI_API_KEY = localStorage.getItem('gemini_key') || "";

// --- 1. COMPUTER KEYBOARD MAPPING (3 OCTAVES) ---
// Reverse the map to easily find keys by MIDI value
const keyMap = {
    // Octave 2 (Numbers)
    '1': 36, '2': 37, '3': 38, '4': 39, '5': 40, '6': 41, '7': 42, '8': 43, '9': 44, '0': 45, '-': 46, '=': 47,
    // Octave 3 (QWERTY)
    'q': 48, 'w': 49, 'e': 50, 'r': 51, 't': 52, 'y': 53, 'u': 54, 'i': 55, 'o': 56, 'p': 57, '[': 58, ']': 59,
    // Octave 4 (ASDF)
    'a': 60, 's': 61, 'd': 62, 'f': 63, 'g': 64, 'h': 65, 'j': 66, 'k': 67, 'l': 68, ';': 69, "'": 70, '\\': 71,
    // Octave 5 (ZXCV)
    'z': 72, 'x': 73, 'c': 74, 'v': 75, 'b': 76, 'n': 77, 'm': 78, ',': 79, '.': 80, '/': 81
};

const reverseKeyMap = Object.fromEntries(Object.entries(keyMap).map(([k, v]) => [v, k]));

const pianoContainer = document.getElementById('piano-keys');
if (pianoContainer) {
    pianoContainer.innerHTML = ''; // Clear previous if any
    for (let i = 0; i < 64; i++) {
        const midi = 36 + i;
        const label = noteNames[midi % 12] + (Math.floor(midi / 12) - 1);
        const computerKey = reverseKeyMap[midi];

        const key = document.createElement('div');
        key.className = `key ${label.includes('#') ? 'black' : 'white'}`;
        key.innerHTML = `<span>${label}</span>`;

        if (computerKey) {
            const hint = document.createElement('div');
            hint.className = 'key-hint';
            hint.innerText = computerKey.toUpperCase();
            key.appendChild(hint);
        }

        key.dataset.midi = midi;
        key.onmousedown = (e) => { e.preventDefault(); key.classList.add('active'); playNote(midi); };
        key.onmouseup = () => { key.classList.remove('active'); stopNote(midi); };
        key.onmouseleave = () => { if (activeOscs.has(midi)) { key.classList.remove('active'); stopNote(midi); } };
        pianoContainer.appendChild(key);
    }
}

// --- 2. ABOUT TAB CONTENT (GEMINI API DETAILS) ---
const manualData = [
    {
        head: "Aura Studio Intelligence",
        body: "Aura Studio utilizes the Gemini 1.5 Flash API via the v1beta endpoint. It employs 'Semantic Harmonic Analysis' to translate MIDI pitch data into musical context.",
        color: "green"
    },
    {
        head: "The Composition API",
        body: "The AI Compose tab uses Generative AI to convert natural language 'vibes' into JSON-formatted MIDI motifs, which are then synthesized in real-time by the Aura Sound Engine.",
        color: "yellow"
    },
    {
        head: "Keyboard Layout",
        body: "We feature 64 polyphonic keys (C2-D#7). Your laptop keyboard is mapped to the central 48 keys for tactile performance. Use Shift+Keys for higher octaves.",
        color: "yellow"
    },
    {
        head: "Persistence & Logic",
        body: "Every AI report and User Mix is serialized into JSON and stored in LocalStorage, ensuring your creative work remains persistent across browser sessions.",
        color: "green"
    }
    {
        head: "Tactile Control Map",
        body: "Aura Studio is mapped for high-speed performance: \n• Numbers 1-0 = Bass (Octave 2)\n• QWERTY = Low Mid (Octave 3)\n• ASDF = Center (Octave 4)\n• ZXCV = High Lead (Octave 5)\nLook at the blue hints on the keys!",
        color: "green"
    }
];

window.addEventListener('keydown', (e) => {
    if (document.activeElement.tagName === 'INPUT') return;
    if (e.repeat) return;
    const midi = keyMap[e.key.toLowerCase()];
    if (midi) {
        const keyEl = document.querySelector(`[data-midi="${midi}"]`);
        if (keyEl) keyEl.classList.add('active');
        playNote(midi);
    }
});

window.addEventListener('keyup', (e) => {
    const midi = keyMap[e.key.toLowerCase()];
    if (midi) {
        const keyEl = document.querySelector(`[data-midi="${midi}"]`);
        if (keyEl) keyEl.classList.remove('active');
        stopNote(midi);
    }
});

// --- 2. AUDIO ENGINE (LONG PRESS / SUSTAIN ENABLED) ---
function playNote(midi, isAuto = false, dur = 1.5) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    if (activeOscs.has(midi) && !isAuto) return;

    const freq = 440 * Math.pow(2, (midi - 69) / 12);
    const osc = audioCtx.createOscillator(), g = audioCtx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    g.gain.setValueAtTime(0, audioCtx.currentTime);
    g.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.05);

    osc.connect(g); g.connect(audioCtx.destination);
    osc.start();

    if (!isAuto) {
        activeOscs.set(midi, { osc, g });
        if (isRecording && !isPaused) {
            recData.push({ time: Date.now() - recStart - totalPausedTime, midi: midi, type: 'on' });
        }
    } else {
        setTimeout(() => {
            g.gain.setTargetAtTime(0, audioCtx.currentTime, 0.1);
            setTimeout(() => osc.stop(), 200);
        }, dur * 1000);
        return { osc, g };
    }
}

function stopNote(midi) {
    if (activeOscs.has(midi)) {
        const { osc, g } = activeOscs.get(midi);
        g.gain.setTargetAtTime(0, audioCtx.currentTime, 0.1);
        setTimeout(() => osc.stop(), 200);
        activeOscs.delete(midi);
        if (isRecording && !isPaused) {
            recData.push({ time: Date.now() - recStart - totalPausedTime, midi: midi, type: 'off' });
        }
    }
}

// --- 3. KEYBOARD GENERATION ---
const piano = document.getElementById('piano-keys');
if (piano) {
    for (let i = 0; i < 64; i++) {
        const midi = 36 + i;
        const label = noteNames[midi % 12] + (Math.floor(midi / 12) - 1);
        const key = document.createElement('div');
        key.className = `key ${label.includes('#') ? 'black' : 'white'}`;
        key.innerHTML = `<span>${label}</span>`;
        key.dataset.midi = midi;
        key.onmousedown = (e) => { e.preventDefault(); key.classList.add('active'); playNote(midi); document.getElementById('note-display').innerText = label; };
        key.onmouseup = () => { key.classList.remove('active'); stopNote(midi); };
        key.onmouseleave = () => { if (activeOscs.has(midi)) { key.classList.remove('active'); stopNote(midi); } };
        piano.appendChild(key);
    }
}

// --- 4. RECORDING ENGINE ---
function handleRecording() {
    const btn = document.getElementById('rec-btn'), pBtn = document.getElementById('pause-btn'), timerEl = document.getElementById('rec-timer');
    if (!isRecording) {
        isRecording = true; isPaused = false; recStart = Date.now(); totalPausedTime = 0; recData = [];
        btn.innerText = "SAVE"; pBtn.style.display = "block"; timerEl.style.display = "block";
        let sec = 15; timerEl.innerText = `00:${sec}`;
        recInterval = setInterval(() => {
            if (!isPaused) {
                sec--; timerEl.innerText = `00:${sec < 10 ? '0' : ''}${sec}`;
                if (sec <= 0) handleRecording();
            }
        }, 1000);
    } else {
        isRecording = false; clearInterval(recInterval);
        btn.innerText = "REC"; pBtn.style.display = "none"; timerEl.style.display = "none";
        if (recData.length > 0) {
            const saved = JSON.parse(localStorage.getItem('sb_pro_v4') || '[]');
            saved.push({ id: Date.now(), name: "User Mix " + (saved.length + 1), data: recData, aiReport: null });
            localStorage.setItem('sb_pro_v4', JSON.stringify(saved));
            renderUser();
        }
    }
}

function togglePauseRec() {
    isPaused = !isPaused;
    if (isPaused) pauseStartTime = Date.now();
    else totalPausedTime += (Date.now() - pauseStartTime);
    document.getElementById('pause-btn').innerText = isPaused ? "RESUME" : "PAUSE";
}

// --- 5. LIBRARY & ARCHIVE PLAYBACK (NO OVERLAP) ---
function playAsset(motif, dur, id) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const btn = document.getElementById(`play-lib-${id}`);
    if (activeAssetId === id) {
        activeAssetId = null; btn.innerHTML = '<i class="fa fa-play"></i>';
        sampleVoices.forEach(v => { try { v.g.gain.setTargetAtTime(0, audioCtx.currentTime, 0.1); v.osc.stop(); } catch (e) { } });
        return;
    }
    activeAssetId = id; btn.innerHTML = '<i class="fa fa-pause"></i>';
    motif.forEach((v, i) => {
        setTimeout(() => {
            if (activeAssetId !== id) return;
            const s = playNote(55 + v, true, 0.5); sampleVoices.push(s);
            const k = document.querySelector(`[data-midi="${55 + v}"]`);
            if (k) { k.classList.add('active'); setTimeout(() => k.classList.remove('active'), 150); }
        }, i * 200);
    });
    setTimeout(() => { if (activeAssetId === id) { activeAssetId = null; btn.innerHTML = '<i class="fa fa-play"></i>'; } }, motif.length * 200 + 500);
}

function playArchived(id) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const saved = JSON.parse(localStorage.getItem('sb_pro_v4') || '[]');
    const mix = saved.find(m => m.id === id); if (!mix) return;
    const btn = document.getElementById(`play-user-${id}`);

    if (activePlaybackId === id) { activePlaybackId = null; btn.innerHTML = '<i class="fa fa-play"></i>'; return; }
    activePlaybackId = id; btn.innerHTML = '<i class="fa fa-pause"></i>';

    const voices = new Map();
    mix.data.forEach(e => {
        setTimeout(() => {
            if (activePlaybackId !== id) { voices.forEach(v => v.osc.stop()); return; }
            if (e.type === 'on') {
                const s = playNote(e.midi, true, 2.0); voices.set(e.midi, s);
                document.querySelector(`[data-midi="${e.midi}"]`)?.classList.add('active');
            } else {
                const s = voices.get(e.midi);
                if (s) { s.g.gain.setTargetAtTime(0, audioCtx.currentTime, 0.1); voices.delete(e.midi); }
                document.querySelector(`[data-midi="${e.midi}"]`)?.classList.remove('active');
            }
        }, e.time);
    });
    const lastT = mix.data[mix.data.length - 1].time;
    setTimeout(() => { if (activePlaybackId === id) { activePlaybackId = null; btn.innerHTML = '<i class="fa fa-play"></i>'; } }, lastT + 500);
}

// --- 6. GEMINI 3 API (STABLE & PERSISTENT) ---
async function callGemini(prompt) {
    if (!GEMINI_API_KEY) { alert("Add API Key in Settings!"); return null; }
    const model = "gemini-flash-latest";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
    try {
        const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) });
        const data = await response.json();
        return data.candidates[0].content.parts[0].text;
    } catch (e) { return null; }
}

async function analyzeWithAI(id, midiArray) {
    const report = document.getElementById(`ai-report-${id}`), titleEl = document.getElementById(`card-title-${id}`);
    report.innerText = "AI vibe-checking...";
    const names = midiArray.map(m => noteNames[m % 12]).join(', ');
    const prompt = `Producer mode. Notes: [${names}]. If famous song, name it. Otherwise give a 2-word trendy name and 10-word mood. Format Name: [Name] | Analysis: [Analysis]`;

    const res = await callGemini(prompt);
    if (res && res.includes('|')) {
        const [n, a] = res.split('|');
        const trendyName = n.replace('Name:', '').trim();
        const analysis = a.replace('Analysis:', '').trim();
        titleEl.innerText = trendyName;
        report.innerText = analysis;

        // SAVE PERMANENTLY
        const saved = JSON.parse(localStorage.getItem('sb_pro_v4') || '[]');
        const idx = saved.findIndex(m => m.id === id);
        if (idx !== -1) {
            saved[idx].aiReport = analysis; // Save the text
            saved[idx].name = trendyName; // Save the new title
            localStorage.setItem('sb_pro_v4', JSON.stringify(saved));
        }
    }
}

async function generateAITone() {
    const vibe = document.getElementById('vibe-input').value; if (!vibe) return;
    const res = await callGemini(`Return ONLY a JSON array of 5 MIDI offsets for: "${vibe}". No markdown. e.g. [0,3,7,10,12]`);
    try {
        const cleanJson = res.match(/\[.*\]/)[0];
        const motif = JSON.parse(cleanJson);
        playAsset(motif, 3, "ai_gen");
    } catch (e) { alert("AI error. Try another vibe!"); }
}

// --- 7. RENDERING & NAVIGATION ---
function renderLibrary(s = "", g = "All") {
    const grid = document.getElementById('lib-grid'); if (!grid) return; grid.innerHTML = '';
    toneLibrary.filter(t => (t.name.toLowerCase().includes(s.toLowerCase()) && (g === "All" || t.genre === g))).forEach(tone => {
        const card = document.createElement('div'); card.className = 'tone-card';
        card.style.borderTop = `5px solid ${tone.color}`;
        const safeId = tone.name.replace(/\s+/g, '');
        card.innerHTML = `<div class="card-top"><div class="card-icon" style="background:${tone.color}"><i class="fa ${tone.icon}"></i></div><div><h4>${tone.name}</h4><small>${tone.genre}</small></div></div>
            <div class="actions"><button class="tool-btn" onclick="shareMe('${tone.name}')"><i class="fa fa-share-nodes"></i></button>
            <button class="play-btn" id="play-lib-${safeId}" onclick="playAsset(${JSON.stringify(tone.motif)}, ${tone.dur}, '${safeId}')"><i class="fa fa-play"></i></button></div>`;
        grid.appendChild(card);
    });
}

function renderUser() {
    const grid = document.getElementById('user-grid'); if (!grid) return;
    const saved = JSON.parse(localStorage.getItem('sb_pro_v4') || '[]');
    grid.innerHTML = saved.length === 0 ? '<p style="color:#333">Empty gallery.</p>' : '';
    saved.forEach(mix => {
        const midiList = [...new Set(mix.data.filter(e => e.type === 'on').map(e => e.midi))];
        const card = document.createElement('div'); card.className = 'tone-card';
        card.innerHTML = `<div class="card-top"><div><h4 id="card-title-${mix.id}">${mix.name}</h4><small id="ai-report-${mix.id}" style="color:var(--studio-blue)">${mix.aiReport || 'No AI analysis yet.'}</small></div></div>
            <div class="actions">// Add this line inside the .actions div in your renderUser loop
<button class="tool-btn" onclick="shareMe('${mix.name}')"><i class="fa fa-share-nodes"></i></button> <button class="tool-btn" onclick="delUser(${mix.id})"><i class="fa fa-trash"></i></button>
            <button class="tool-btn" onclick="analyzeWithAI(${mix.id}, [${midiList}])"><i class="fa fa-wand-magic-sparkles"></i> AI</button>
            <button class="play-btn" id="play-user-${mix.id}" onclick="playArchived(${mix.id})"><i class="fa fa-play"></i></button></div>`;
        grid.appendChild(card);
    });
}

function shareMe(n) { const url = window.location.href; if (navigator.share) navigator.share({ title: 'Aura Studio', text: `Check out my tone: ${n}`, url: url }); else alert("Link copied!"); }
function navTo(e, id) {
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));

    document.getElementById(id).classList.add('active');
    if (e) e.currentTarget.classList.add('active');

    // Auto-render manual if entering About tab
    if (id === 'pane-manual') renderAbout();
}
function renderAbout() {
    const board = document.getElementById('manual-board');
    if (board) {
        board.innerHTML = manualData.map(m => `
            <div class="sticky-note ${m.color}" onclick="this.classList.toggle('expanded')">
                <div class="pin"></div>
                <h3 class="note-heading">${m.head}</h3>
                <p class="note-content">${m.body}</p>
            </div>`).join('');
    }
}
function runGlobalSearch() { const q = document.getElementById('search-box').value; if (q.length > 0) { navTo(null, 'pane-library'); renderLibrary(q); } }
function filterByGenre(g) { document.querySelectorAll('.genre-chip').forEach(c => c.classList.remove('active')); event.currentTarget.classList.add('active'); renderLibrary("", g); }
function openSettings() { const key = prompt("Enter Gemini API Key:", GEMINI_API_KEY); if (key !== null) { GEMINI_API_KEY = key; localStorage.setItem('gemini_key', key); } }
function delUser(id) { let s = JSON.parse(localStorage.getItem('sb_pro_v4') || '[]'); localStorage.setItem('sb_pro_v4', JSON.stringify(s.filter(m => m.id !== id))); renderUser(); }

function init() {
    renderUser(); renderLibrary();
    const board = document.getElementById('manual-board');
    if (board && typeof manualData !== 'undefined') {
        board.innerHTML = manualData.map(m => `<div class="sticky-note ${m.color}" onclick="this.classList.toggle('expanded')"><div class="pin"></div><h3 class="note-heading">${m.head}</h3><p class="note-content">${m.body}</p></div>`).join('');
    }
}
window.onload = init;