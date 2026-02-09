/**
 * AURA STUDIO PRO - CORE ENGINE
 * Combined: High-Fidelity Audio, Computer Keyboard Mapping, Long-Press Sustain, 
 * 15s Recording Timer, & Gemini 1.5 Flash AI Integration.
 */

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const activeOscs = new Map();
let sampleVoices = [];

// App State
let isRecording = false;
let isPaused = false;
let recStart = 0;
let totalPausedTime = 0;
let pauseStartTime = 0;
let recData = [];
let activePlaybackId = null;
let activeAssetId = null; // For Library playback tracking
let recInterval = null;

// AI State
let GEMINI_API_KEY = localStorage.getItem('gemini_key') || "";

// --- 1. COMPUTER KEYBOARD MAPPING ---
const keyMap = {
    'a': 60, 'w': 61, 's': 62, 'e': 63, 'd': 64, 'f': 65, 't': 66, 'g': 67, 'y': 68, 'h': 69, 'u': 70, 'j': 71, 'k': 72
};

window.addEventListener('keydown', (e) => {
    if (document.activeElement.tagName === 'INPUT') return; // Don't play while typing in search
    if (e.repeat) return;
    const midi = keyMap[e.key.toLowerCase()];
    if (midi) {
        const keyEl = document.querySelector(`[data-midi="${midi}"]`);
        if (keyEl) keyEl.classList.add('active');
        playNote(midi);
        document.getElementById('note-display').innerText = noteNames[midi % 12] + (Math.floor(midi / 12) - 1);
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

// --- 2. AUDIO ENGINE (LONG PRESS / SUSTAIN) ---
function playNote(midi, isAuto = false, dur = 1.5) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    if (activeOscs.has(midi) && !isAuto) return;

    const freq = 440 * Math.pow(2, (midi - 69) / 12);
    const osc = audioCtx.createOscillator(), g = audioCtx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

    g.gain.setValueAtTime(0, audioCtx.currentTime);
    g.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.05); // Smooth Attack

    osc.connect(g); g.connect(audioCtx.destination);
    osc.start();

    if (!isAuto) {
        // MANUAL PLAY: Sound stays ON until stopNote is called (Long Press)
        activeOscs.set(midi, { osc, g });
        if (isRecording && !isPaused) {
            recData.push({ time: Date.now() - recStart - totalPausedTime, midi: midi, type: 'on' });
        }
    } else {
        // AUTO PLAY: For Library samples/AI motifs
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
        g.gain.setTargetAtTime(0, audioCtx.currentTime, 0.1); // Smooth Release
        setTimeout(() => osc.stop(), 200);
        activeOscs.delete(midi);
        if (isRecording && !isPaused) {
            recData.push({ time: Date.now() - recStart - totalPausedTime, midi: midi, type: 'off' });
        }
    }
}

// --- 3. KEYBOARD UI ---
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

// --- 4. RECORDING ENGINE (15s LIMIT) ---
const MAX_REC_TIME = 15;
function handleRecording() {
    const btn = document.getElementById('rec-btn'), pBtn = document.getElementById('pause-btn'), timerEl = document.getElementById('rec-timer');
    if (!isRecording) {
        isRecording = true; isPaused = false; recStart = Date.now(); totalPausedTime = 0; recData = [];
        btn.innerText = "SAVE"; pBtn.style.display = "block"; timerEl.style.display = "block";
        let sec = MAX_REC_TIME;
        timerEl.innerText = `00:${sec}`;
        recInterval = setInterval(() => {
            if (!isPaused) {
                sec--;
                timerEl.innerText = `00:${sec < 10 ? '0' : ''}${sec}`;
                if (sec <= 0) handleRecording(); // Auto-save
            }
        }, 1000);
    } else {
        isRecording = false; clearInterval(recInterval);
        btn.innerText = "REC"; pBtn.style.display = "none"; timerEl.style.display = "none";
        if (recData.length > 0) {
            const saved = JSON.parse(localStorage.getItem('sb_pro_v4') || '[]');
            saved.push({ id: Date.now(), name: "User Mix " + (saved.length + 1), data: recData });
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

// --- 5. LIBRARY & USER PLAYBACK ---
function renderLibrary(s = "", g = "All") {
    const grid = document.getElementById('lib-grid'); if (!grid) return; grid.innerHTML = '';
    toneLibrary.filter(t => (t.name.toLowerCase().includes(s.toLowerCase()) && (g === "All" || t.genre === g))).forEach(tone => {
        const card = document.createElement('div'); card.className = 'tone-card';
        card.style.borderTop = `5px solid ${tone.color}`;
        const safeId = tone.name.replace(/\s+/g, '');
        card.innerHTML = `<div class="card-top">
            <div class="card-icon" style="background:${tone.color}"><i class="fa ${tone.icon}"></i></div>
            <div><h4>${tone.name}</h4><small>${tone.genre}</small></div></div>
            <div class="actions"><button class="tool-btn" onclick="shareMe('${tone.name}')"><i class="fa fa-share-nodes"></i></button>
            <button class="play-btn" id="play-lib-${safeId}" onclick="playAsset(${JSON.stringify(tone.motif)}, ${tone.dur}, '${safeId}')"><i class="fa fa-play"></i></button></div>`;
        grid.appendChild(card);
    });
}

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

function renderUser() {
    const grid = document.getElementById('user-grid'); if (!grid) return;
    const saved = JSON.parse(localStorage.getItem('sb_pro_v4') || '[]');
    grid.innerHTML = saved.length === 0 ? '<p style="color:#333; padding:20px;">No sessions archived.</p>' : '';
    saved.forEach(mix => {
        const midiList = [...new Set(mix.data.filter(e => e.type === 'on').map(e => e.midi))];
        const card = document.createElement('div'); card.className = 'tone-card';
        card.innerHTML = `<div class="card-top"><div class="card-icon" style="background:#333"><i class="fa fa-microphone"></i></div>
            <div><h4 id="card-title-${mix.id}">${mix.name}</h4><small id="ai-report-${mix.id}" style="color:var(--studio-blue); font-style:italic; font-size:11px;">AI: No analysis yet.</small></div></div>
            <div class="actions"><button class="tool-btn" onclick="delUser(${mix.id})"><i class="fa fa-trash"></i></button>
            <button class="tool-btn" style="color:var(--studio-blue)" onclick="analyzeWithAI(${mix.id}, [${midiList}])"><i class="fa fa-wand-magic-sparkles"></i> AI</button>
            <button class="play-btn" id="play-user-${mix.id}" onclick="playArchived(${mix.id})"><i class="fa fa-play"></i></button></div>`;
        grid.appendChild(card);
    });
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
            if (activePlaybackId !== id) return;
            if (e.type === 'on') {
                const s = playNote(e.midi, true, 1.5); voices.set(e.midi, s);
                document.querySelector(`[data-midi="${e.midi}"]`)?.classList.add('active');
            } else {
                const s = voices.get(e.midi);
                if (s) { s.g.gain.setTargetAtTime(0, audioCtx.currentTime, 0.1); voices.delete(e.midi); }
                document.querySelector(`[data-midi="${e.midi}"]`)?.classList.remove('active');
            }
        }, e.time);
    });
    const lastTime = mix.data.length > 0 ? mix.data[mix.data.length - 1].time : 0;
    setTimeout(() => { if (activePlaybackId === id) { activePlaybackId = null; btn.innerHTML = '<i class="fa fa-play"></i>'; } }, lastTime + 500);
}

// --- 6. GEMINI 3 API ---
async function callGemini(prompt) {
    if (!GEMINI_API_KEY) { alert("Click Cog to set API Key!"); return null; }
    const model = "gemini-flash-latest";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
    try {
        const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) });
        const data = await response.json();
        if (!response.ok) return "Error: " + data.error.message;
        return data.candidates[0].content.parts[0].text;
    } catch (e) { return "Connection failed."; }
}

async function analyzeWithAI(id, midiArray) {
    const report = document.getElementById(`ai-report-${id}`), titleEl = document.getElementById(`card-title-${id}`);
    report.innerText = "AI vibe-checking...";
    const names = midiArray.map(m => noteNames[m % 12]).join(', ');
    const prompt = `Trendy producer mode. Notes: [${names}]. Give a 2-word trendy name and 10-word mood. Format Name: [Name] | Analysis: [Analysis]`;
    const res = await callGemini(prompt);
    if (res && res.includes('|')) {
        const [n, a] = res.split('|');
        titleEl.innerText = n.replace('Name:', '').trim();
        report.innerText = a.replace('Analysis:', '').trim();
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

// --- 7. NAVIGATION & SEARCH ---
function shareMe(n) {
    const url = window.location.href;
    if (navigator.share) navigator.share({ title: 'Aura Studio', text: `Check out my tone: ${n}`, url: url });
    else alert("Link copied!");
}

function navTo(e, id) {
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(id).classList.add('active'); if (e) e.currentTarget.classList.add('active');
}

function runGlobalSearch() {
    const q = document.getElementById('search-box').value;
    if (q.length > 0) { navTo(null, 'pane-library'); renderLibrary(q); }
}

function filterByGenre(g) {
    document.querySelectorAll('.genre-chip').forEach(c => c.classList.remove('active'));
    event.currentTarget.classList.add('active'); renderLibrary("", g);
}

function openSettings() {
    const key = prompt("Enter Gemini API Key:", GEMINI_API_KEY);
    if (key !== null) { GEMINI_API_KEY = key; localStorage.setItem('gemini_key', key); }
}

function delUser(id) {
    let saved = JSON.parse(localStorage.getItem('sb_pro_v4') || '[]');
    localStorage.setItem('sb_pro_v4', JSON.stringify(saved.filter(m => m.id !== id)));
    renderUser();
}

function init() {
    const board = document.getElementById('manual-board');
    if (board && typeof manualData !== 'undefined') {
        board.innerHTML = manualData.map(m => `<div class="sticky-note ${m.color}" onclick="this.classList.toggle('expanded')"><div class="pin"></div><h3 class="note-heading">${m.head}</h3><p class="note-content">${m.body}</p></div>`).join('');
    }
    renderLibrary(); renderUser();
}
window.onload = init;