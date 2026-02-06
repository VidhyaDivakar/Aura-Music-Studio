const toneLibrary = [
    // --- GAMING CLASSICS ---
    { name: "Super Mario Jump", genre: "Gaming Classics", icon: "fa-gamepad", color: "#E52521", motif: [0, 5, 12], dur: 1 },
    { name: "Pikachu Pika!", genre: "Gaming Classics", icon: "fa-bolt", color: "#FFDE00", motif: [12, 14, 12], dur: 0.8 },
    { name: "Sonic Ring", genre: "Gaming Classics", icon: "fa-circle", color: "#0054FF", motif: [0, 4, 7, 12, 16, 24], dur: 1 },
    { name: "Zelda Secret", genre: "Gaming Classics", icon: "fa-shield-halved", color: "#4CAF50", motif: [5, 4, 1, 6, 5, 1, 8, 7], dur: 3 },

    // --- VIRAL POP ---
    { name: "Frozen Elsa Arp", genre: "Viral Pop Snippets", icon: "fa-snowflake", color: "#81D4FA", motif: [0, 7, 12, 16], dur: 4 },
    { name: "Wednesday Snap", genre: "Viral Pop Snippets", icon: "fa-hand", color: "#212121", motif: [0, 1, 0], dur: 1 },
    { name: "Encanto Sun", genre: "Viral Pop Snippets", icon: "fa-sun", color: "#FFB300", motif: [0, 3, 7, 10, 12], dur: 3 },

    // --- UI & MINIMALIST ---
    { name: "Banking Success", genre: "Minimalist UI", icon: "fa-wallet", color: "#2E7D32", motif: [0, 12, 15], dur: 2 },
    { name: "Shopping Cart", genre: "Minimalist UI", icon: "fa-cart-shopping", color: "#FF9800", motif: [7, 12], dur: 1 },
    { name: "Email Sent", genre: "Minimalist UI", icon: "fa-paper-plane", color: "#0288D1", motif: [12, 19], dur: 1 }
];

// Automatically generate 110 more unique tones to reach 120+
const types = ["Ping", "Alert", "Hifi", "Loft", "Echo", "Wave"];
const cats = ["Retro & Lofi", "ASMR & Nature", "Cinematic Effects", "Gaming Classics"];
for (let i = 1; i <= 110; i++) {
    toneLibrary.push({
        name: `${types[i % types.length]} ${i}`,
        genre: cats[i % cats.length],
        icon: "fa-music", color: "#333",
        motif: [i % 12, (i + 4) % 12], dur: 2
    });
}