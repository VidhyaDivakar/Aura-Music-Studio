const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const activeOscs = new Map();
let sampleVoices = [];
let isRecording = false, recData = [], recStart = 0;

function playNote(midi, isAuto = false, dur = 1.5) {
    if (activeOscs.has(midi) && !isAuto) return;
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440 * Math.pow(2, (midi - 69) / 12), audioCtx.currentTime);
    g.gain.setValueAtTime(0, audioCtx.currentTime);
    g.gain.linearRampToValueAtTime(0.25, audioCtx.currentTime + 0.05);
    osc.connect(g); g.connect(audioCtx.destination);
    osc.start();
    if (!isAuto) {
        activeOscs.set(midi, { osc, g });
        if (isRecording) recData.push({ time: Date.now() - recStart, midi, type: 'on' });
    } else {
        setTimeout(() => { g.gain.setTargetAtTime(0, audioCtx.currentTime, 0.1); setTimeout(() => osc.stop(), 200); }, dur * 1000);
        return { osc, g };
    }
}

function stopNote(midi) {
    if (activeOscs.has(midi)) {
        const { osc, g } = activeOscs.get(midi);
        g.gain.setTargetAtTime(0, audioCtx.currentTime, 0.1);
        setTimeout(() => osc.stop(), 200);
        activeOscs.delete(midi);
        if (isRecording) recData.push({ time: Date.now() - recStart, midi, type: 'off' });
    }
}

// Keyboard Init
const piano = document.getElementById('piano-keys');
for (let i = 0; i < 64; i++) {
    const midi = 36 + i;
    const label = noteNames[midi % 12] + (Math.floor(midi / 12) - 1);
    const key = document.createElement('div');
    key.className = `key ${label.includes('#') ? 'black' : 'white'}`;
    key.innerHTML = `<span>${label}</span>`;
    key.dataset.midi = midi;
    key.onmousedown = (e) => { e.preventDefault(); if (audioCtx.state === 'suspended') audioCtx.resume(); key.classList.add('active'); playNote(midi); document.getElementById('note-display').innerText = label; };
    key.onmouseup = () => { key.classList.remove('active'); stopNote(midi); };
    key.onmouseleave = () => { key.classList.remove('active'); stopNote(midi); };
    piano.appendChild(key);
}

function renderLibrary(search = "", genre = "All") {
    const grid = document.getElementById('lib-grid');
    grid.innerHTML = '';
    toneLibrary.filter(t => {
        const mS = t.name.toLowerCase().includes(search.toLowerCase());
        const mG = genre === "All" || t.genre === genre;
        return mS && mG;
    }).forEach(tone => {
        const card = document.createElement('div');
        card.className = 'tone-card';
        card.innerHTML = `
            <div class="card-top">
                <div class="card-icon" style="background:${tone.color}"><i class="fa ${tone.icon}"></i></div>
                <div><h4 style="margin:0">${tone.name}</h4><div style="font-size:11px;color:#555">${tone.genre}</div></div>
            </div>
            <div class="actions">
                <button class="tool-btn" onclick="shareMe('${tone.name}')"><i class="fa fa-share-nodes"></i> Share</button>
                <button class="play-btn" onclick="playAsset(${JSON.stringify(tone.motif)}, ${tone.dur})"><i class="fa fa-play"></i></button>
            </div>`;
        grid.appendChild(card);
    });
}

function playAsset(motif, dur) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    sampleVoices.forEach(v => { v.g.gain.setTargetAtTime(0, audioCtx.currentTime, 0.1); setTimeout(() => v.osc.stop(), 200); });
    sampleVoices = [];
    motif.forEach((v, i) => { setTimeout(() => { const s = playNote(60 + v, true, dur); sampleVoices.push(s); }, i * 160); });
}

function handleRecording() {
    const btn = document.getElementById('rec-btn');
    if (!isRecording) {
        isRecording = true; recStart = Date.now(); recData = [];
        btn.innerText = "SAVE"; btn.style.background = "#fff";
    } else {
        isRecording = false; btn.innerText = "REC"; btn.style.background = "red";
        if (recData.length > 0) {
            const saved = JSON.parse(localStorage.getItem('sb_pro_mixes') || '[]');
            saved.push({ id: Date.now(), name: "Session " + saved.length, data: recData });
            localStorage.setItem('sb_pro_mixes', JSON.stringify(saved));
            renderUser();
        }
    }
}

function renderUser() {
    const grid = document.getElementById('user-grid');
    const saved = JSON.parse(localStorage.getItem('sb_pro_mixes') || '[]');
    grid.innerHTML = saved.length === 0 ? '<p style="color:#333">No sessions archived.</p>' : '';
    saved.forEach(mix => {
        const card = document.createElement('div');
        card.className = 'tone-card';
        card.innerHTML = `
            <div class="card-top"><div class="card-icon" style="background:#333"><i class="fa fa-microphone"></i></div><h4>${mix.name}</h4></div>
            <div class="actions">
                <button class="tool-btn" style="color:#ff5252" onclick="delUser(${mix.id})"><i class="fa fa-trash"></i> Delete</button>
                <button class="play-btn" onclick="playArchived(${JSON.stringify(mix.data)})"><i class="fa fa-play"></i></button>
            </div>`;
        grid.appendChild(card);
    });
}

function delUser(id) {
    let saved = JSON.parse(localStorage.getItem('sb_pro_mixes') || '[]');
    localStorage.setItem('sb_pro_mixes', JSON.stringify(saved.filter(m => m.id !== id)));
    renderUser();
}

function playArchived(data) {
    if (audioCtx.state === 'suspended') audioCtx.resume();

    // Clear any currently playing sample sounds
    sampleVoices.forEach(v => {
        v.g.gain.setTargetAtTime(0, audioCtx.currentTime, 0.1);
        setTimeout(() => v.osc.stop(), 200);
    });
    sampleVoices = [];

    data.forEach(e => {
        setTimeout(() => {
            if (e.type === 'on') {
                const s = playNote(e.midi, true, 1.5);
                sampleVoices.push(s);

                // Visual feedback on keys
                const key = document.querySelector(`[data-midi="${e.midi}"]`);
                if (key) {
                    key.classList.add('active');
                    setTimeout(() => key.classList.remove('active'), 250);
                }
            }
        }, e.time);
    });
}

function navTo(e, id) {
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(id).classList.add('active'); e.currentTarget.classList.add('active');
}

function filterByGenre(g) {
    document.querySelectorAll('.genre-chip').forEach(c => c.classList.remove('active'));
    event.currentTarget.classList.add('active');
    renderLibrary("", g);
}

function runSearch() { renderLibrary(document.getElementById('search-box').value); }
function toggleNote(el) { el.classList.toggle('expanded'); }
function shareMe(n) { alert("Shared: " + n); }

renderLibrary(); renderUser();