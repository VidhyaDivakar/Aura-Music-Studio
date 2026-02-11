# Aura Music Studio
The Intelligent Sound Discovery Engine & Generative AI Composer
Aura Music Studio is a high-fidelity, multimodal music asset platform that transforms a 64-key polyphonic studio keyboard into a powerful sound discovery engine. By leveraging the Gemini 1.5 Flash API, Aura bridges the gap between raw frequency math and generative intelligence, acting as a resident AI producer for modern creators.
# Key Features
## 1. High-Fidelity Studio Engine
64-Key Polyphony: A full range from deep bass (C2) to high-frequency leads (D#7).
Tactile Hardware Mapping: 48 physical laptop keys are mapped across 4 octaves (Numbers, QWERTY, ASDF, and ZXCV rows) for a real-time, hardware-like performance experience.
Sustain Logic: Professional ADSR envelope control allowing for true "long-press" sustain.

## 2. AI Master Tape (Semantic Analysis)
Capture 15-second performances and let Gemini act as your Resident Producer:
Melodic Recognition: Identifies famous song signatures (e.g., "Happy Birthday") or technical chords.
Trendy Auto-Naming: Translates the "vibe" of your notes into trendy asset titles like Neon Pulse or Astral Dust.
Persistent Reports: All AI analyses are serialized and stored in LocalStorage, ensuring your creative insights remain after a refresh.

## 3. AI Composer (Vibe-to-Motif)
Generative Composition: Describe a mood (e.g., "Cyberpunk Chase" or "Rainy Jazz Cafe"), and Gemini generates a unique 15-note MIDI motif.
10-Second Ambient Textures: The engine synthesizes the AI's data into lush, 10-second soundscapes.
AI Scratchpad: Automatically manages a rolling library of your last 20 AI-generated motifs.

## 4. Asset Library & PWA
120+ Curated Motifs: Explore functional audio assets categorized by Gaming, Viral Pop, ASMR, and UI.
Installable App: A full Progressive Web App (PWA) with Service Worker support. Install it on your phone or desktop and use it offline.

# Gemini 1.5 Flash Integration
Aura Studio Pro utilizes the Gemini 1.5 Flash API (v1beta) as its cognitive core.
Latent Sentiment Analysis: The app serializes raw MIDI events into JSON strings. Gemini interprets these intervallic relationships to extract emotional intent and musical context.
Multimodal Data Generation: The AI Composer leverages Gemini’s reasoning to output strictly formatted MIDI arrays. This transforms a text-based LLM into an algorithmic MIDI architect.

# Technology Stack
Frontend: HTML5, CSS3 (Grid/Flexbox), Vanilla JavaScript (ES6+).
Audio Engine: Web Audio API (Additive Synthesis).
AI Engine: Google Gemini 1.5 Flash API.
Storage: LocalStorage Persistence.
Deployment: PWA (Service Workers & Web Manifest).

# Getting Started
Clone the Repository:
code
Bash
git clone https://github.com/VidhyaDivakar/Music-Project.git
Open the App: Launch index.html via a local server (e.g., Live Server in VS Code).
Activate AI: Click the Settings (Cog Icon) in the header and paste your Gemini API Key from Google AI Studio.

# Usage Manual
Studio: Play keys or type on your keyboard to compose. Click REC to start a 15s session.
AI Master Tape: View your saved mixes. Click the AI Robot button to analyze and rename them.
AI Composer: Type a vibe and hit Generate to hear Gemini's original composition.
Library: Browse 120+ professional sound assets for sonic branding.
