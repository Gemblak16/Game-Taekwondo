/* ==========================================================================
   GAME.JS - Inti Mekanik, Aturan, dan Inisialisasi Papan Game
   ========================================================================== */

const allMasterSymbols = [
    "🥋", "👊", "🦶", "💥", "🏆", "🥇", "🛡️", "🔥", "🎽", "🔴", "🔵", "🙌", "🟥", "🟦", "⏱️", "📋", "🪵", "🧱", "🧘", "🙇", "🚩", "📢", "🛑", "WT", "🐉", "⚠️", "🪖", "🥊", "🧦", "🎒", "👟", "RUN", "⚡", "💪", "🩸", "🤸", "🥈", "🥉", "👑", "✨", "🎉", "🇰🇷", "🐯", "🏮", "⛩️", "🏯", "🥁", "🥢"
];

const beltRanks = [
    { name: "Putih", color: "#ffffff", bg: "#2c3e50" },
    { name: "Kuning", color: "#ffd600", bg: "#3e3a00" },
    { name: "Hijau", color: "#00c853", bg: "#0a3d1a" },
    { name: "Biru", color: "#2979ff", bg: "#0b2545" },
    { name: "Merah", color: "#d50000", bg: "#3a0007" },
    { name: "Hitam", color: "#ffd700", bg: "#111111" }
];

let currentSymbols = [];
let currentLevel = 1;
let maxReachedLevel = 1; 
let firstCard = null;
let secondCard = null;
let lock = false;
let score = 0;
let coins = 0; 
let bossTokens = 0;
let timer;
let gameStarted = false;
let maxTime = 0;
let relaxMode = false;
let bossRewardCard = null;
let time = 220;
let isNoLimitActive = false; 

let comboCount = 0;  
let comboTimer = null;  
const COMBO_TIMEOUT = 3000; 

function shuffle(arr){
    return arr.sort(() => Math.random() - 0.5);
}

function shuffleBoard(){
    if(!gameStarted){
        alert("Mulai game dulu!");
        return;
    }

    const cards = [...document.querySelectorAll(".card")];
    const remainingSymbols = cards
        .filter(c => !c.classList.contains("matched"))
        .map(c => c.dataset.symbol);

    shuffle(remainingSymbols);

    let i = 0;
    cards.forEach(card => {
        if(card.classList.contains("matched")) return;
        card.dataset.symbol = remainingSymbols[i];
        const symbolEl = card.querySelector(".symbol");
        if(symbolEl) symbolEl.innerText = remainingSymbols[i];
        i++;
    });

    alert("🔀 Kartu berhasil diacak!");
    let safety = 0;

    while(!hasAvailableMove() && safety < 20){
        shuffle(remainingSymbols);
        let j = 0;
        cards.forEach(card => {
            if(card.classList.contains("matched")) return;
            card.dataset.symbol = remainingSymbols[j];
            const symbolEl = card.querySelector(".symbol");
            if(symbolEl) symbolEl.innerText = remainingSymbols[j];
            j++;
        });
        safety++;
    }
}

function paidShuffle(){
    if(coins < 5){
        alert("Koin tidak cukup!");
        return;
    }
    coins -= 5;
    syncCoins();
    shuffleBoard();
}

function autoShuffle(){
    let count = 0;
    const interval = setInterval(()=>{
        shuffleBoard();
        count++;
        if(count >= 10){
            clearInterval(interval);
            alert("⚡ Auto Shuffle selesai!");
        }
    }, 300);
}

function getBoardCols(){
    const totalCards = currentSymbols.length;
    if(totalCards <= 4) return 2;
    if(totalCards <= 12) return 4;
    if(totalCards <= 16) return 4;
    if(totalCards <= 20) return 4;
    return 6;
}

function drawConnection(cardA, cardB) {
    const canvas = document.getElementById("lineCanvas");
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const gameWrapper = document.getElementById("game-wrapper");
    if (!gameWrapper) return;
    
    const wrapRect = gameWrapper.getBoundingClientRect();
    canvas.width = wrapRect.width;
    canvas.height = wrapRect.height;
    canvas.style.position = "absolute";
    canvas.style.top = "0px";
    canvas.style.left = "0px";
    canvas.style.pointerEvents = "none";

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const rectA = cardA.getBoundingClientRect();
    const rectB = cardB.getBoundingClientRect();

    const startX = rectA.left - wrapRect.left + (rectA.width / 2);
    const startY = rectA.top - wrapRect.top + (rectA.height / 2);
    const endX = rectB.left - wrapRect.left + (rectB.width / 2);
    const endY = rectB.top - wrapRect.top + (rectB.height / 2);

    let corners = [{ x: startX, y: startY }];
    const cols = getBoardCols();
    const totalCards = document.querySelectorAll(".card").length;
    const rows = Math.ceil(totalCards / cols);

    const indexA = parseInt(cardA.dataset.index);
    const indexB = parseInt(cardB.dataset.index);
    const ax = indexA % cols;
    const ay = Math.floor(indexA / cols);
    const bx = indexB % cols;
    const by = Math.floor(indexB / cols);

    const cellWidth = wrapRect.width / cols;
    const cellHeight = wrapRect.height / rows;

    if (ax !== bx && ay !== by) {
        if (isEmptyCell(bx, ay, cols, rows)) corners.push({ x: endX, y: startY });
        else corners.push({ x: startX, y: endY });
    }

    corners.push({ x: endX, y: endY });

    ctx.beginPath();
    ctx.moveTo(corners[0].x, corners[0].y);
    for (let i = 1; i < corners.length; i++) { ctx.lineTo(corners[i].x, corners[i].y); }

    ctx.strokeStyle = "#00ffff"; 
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round"; 
    ctx.shadowColor = "#00ffff";
    ctx.shadowBlur = 12;
    ctx.stroke();

    setTimeout(() => { ctx.clearRect(0, 0, canvas.width, canvas.height); }, 350);
}

function handleComboSystem() {
    if (comboTimer) clearTimeout(comboTimer);

    comboCount++;
    let bonusCoins = 0;
    let comboName = "";
    const displayComboLevel = comboCount - 1;

    if (displayComboLevel === 1) { comboName = "Basic"; bonusCoins = 2; } 
    else if (displayComboLevel === 2) { comboName = "Taegeuk"; bonusCoins = 2; } 
    else if (displayComboLevel === 3) { comboName = "Koryo"; bonusCoins = 3; } 
    else if (displayComboLevel >= 4) { comboName = "Keumgang"; bonusCoins = 5; }

    if (displayComboLevel >= 1 && bonusCoins > 0) {
        coins += bonusCoins;
        syncCoins();
        showComboNotification(`Combo x${displayComboLevel}: ${comboName} (+Rp.${bonusCoins}k)`);
    }

    comboTimer = setTimeout(() => { comboCount = 0; }, COMBO_TIMEOUT);
}

function showComboNotification(message) {
    let container = document.getElementById("combo-container");
    if (!container) {
        container = document.createElement("div");
        container.id = "combo-container";
        container.style.position = "absolute";
        container.style.top = "20%";
        container.style.left = "50%";
        container.style.transform = "translateX(-50%)";
        container.style.zIndex = "999";
        container.style.pointerEvents = "none";
        document.getElementById("game-wrapper")?.appendChild(container);
    }
    container.innerHTML = ""; 

    const popUp = document.createElement("div");
    popUp.innerText = message;
    popUp.style.background = "rgba(0, 0, 0, 0.85)";
    popUp.style.color = "#ffd700"; 
    popUp.style.padding = "8px 18px";
    popUp.style.borderRadius = "25px";
    popUp.style.fontWeight = "bold";
    popUp.style.fontSize = "1.2rem";
    popUp.style.border = "2px solid #00ffff";
    popUp.style.boxShadow = "0 0 15px #00ffff";
    popUp.style.animation = "fadeUpAndOut 1.5s forwards";

    container.appendChild(popUp);
    setTimeout(() => { popUp.remove(); }, 1500);
}

function initLevelConfig() {
    const stageInfo = getChapter(currentLevel);
    const chapEl = document.getElementById("chapter");
    if(chapEl) chapEl.innerText = stageInfo.isBoss ? `Boss ${stageInfo.chapter}` : `Chapter ${stageInfo.chapter}`;

    let neededPairs = Math.min(currentLevel + 1, allMasterSymbols.length);
    let selectedSymbols = allMasterSymbols.slice(0, neededPairs);
    currentSymbols = [...selectedSymbols, ...selectedSymbols];

    time = 20 + ((currentSymbols.length / 2) * 5);
    maxTime = time;

    const gameContainer = document.getElementById("game");
    if(gameContainer) {
        gameContainer.className = ""; 
        let totalCards = currentSymbols.length;
        if (totalCards <= 4) { gameContainer.style.gridTemplateColumns = "repeat(2, 1fr)"; gameContainer.classList.add("grid-2x2"); } 
        else if (totalCards <= 12) { gameContainer.style.gridTemplateColumns = "repeat(4, 1fr)"; gameContainer.classList.add("grid-4x3"); } 
        else if (totalCards <= 16) { gameContainer.style.gridTemplateColumns = "repeat(4, 1fr)"; gameContainer.classList.add("grid-4x4"); } 
        else if (totalCards <= 20) { gameContainer.style.gridTemplateColumns = "repeat(4, 1fr)"; gameContainer.classList.add("grid-4x5"); } 
        else { gameContainer.style.gridTemplateColumns = "repeat(6, 1fr)"; gameContainer.classList.add("grid-6x6"); }
    }

    const lvlEl = document.getElementById("level");
    const tmEl = document.getElementById("time");
    const cnEl = document.getElementById("coins");
    if(lvlEl) lvlEl.innerText = currentLevel;
    if(tmEl) tmEl.innerText = time;
    if(cnEl) cnEl.innerText = coins;
    
    updateLevelSelectorHTML();
    updateBeltUI();
    updateInventoryUI();
}

function updateBossTokenVisibility() {
    const wrapper = document.getElementById("bossTokenWrapper");
    const tokenSpan = document.getElementById("bossTokens");
    if(!tokenSpan) return;
    
    tokenSpan.innerText = bossTokens;
    if (wrapper) wrapper.className = (bossTokens > 0) ? "show-token" : "hidden-token";
}

function createBoard() {
    const game = document.getElementById("game");
    if (!game) return;

    game.innerHTML = "";
    shuffle(currentSymbols);

    const totalCards = currentSymbols.length;
    let cols = Math.ceil(Math.sqrt(totalCards));
    game.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

    let cardSize = Math.floor((window.innerWidth * 0.9) / cols);
    cardSize = Math.max(30, Math.min(cardSize, 80));
    document.documentElement.style.setProperty("--card-size", `${cardSize}px`);

    const stageInfo = getChapter(currentLevel);
    bossRewardCard = stageInfo.isBoss ? Math.floor(Math.random() * currentSymbols.length) : null;

    currentSymbols.forEach((symbol, index) => {
        const card = document.createElement("div");
        card.className = "card";
        card.dataset.symbol = symbol;
        card.dataset.index = index;
        card.innerHTML = `<span class="symbol">${symbol}</span>`;

        card.addEventListener("click", () => {
            if (!gameStarted || lock || card.classList.contains("matched") || firstCard === card) return;

            playClickSound();
            card.classList.remove("hidden-symbol");

            if (!firstCard) {
                firstCard = card;
                firstCard.classList.add("selected-active");
            } else {
                secondCard = card;
                lock = true; 

                if (firstCard.dataset.symbol === secondCard.dataset.symbol) {
                    try { drawConnection(firstCard, secondCard); } catch(e){}
                    try { handleComboSystem(); } catch(e){}

                    const card1 = firstCard;
                    const card2 = secondCard;
                    card1.classList.add("removing");
                    card2.classList.add("removing");

                    score += 10;
                    const scoreEl = document.getElementById("score");
                    if(scoreEl) scoreEl.innerText = score;

                    firstCard = null;
                    secondCard = null;

                    setTimeout(() => {
                        card1.classList.add("matched");
                        card2.classList.add("matched");
                        card1.style.visibility = "hidden";
                        card2.style.visibility = "hidden";
                        lock = false;
                        checkWin();
                    }, 350);

                } else {
                    comboCount = 0;
                    if (comboTimer) clearTimeout(comboTimer);
                    setTimeout(() => {
                        if (firstCard) firstCard.classList.remove("selected-active");
                        if (secondCard) secondCard.classList.remove("selected-active");
                        firstCard = null;
                        secondCard = null;
                        lock = false;
                    }, 300);
                }
            }

            if (stageInfo.isBoss && index === bossRewardCard && !card.dataset.rewardFound) {
                card.dataset.rewardFound = "true";
                bossTokens++;
                updateBossTokenVisibility();
                playBossTokenSound(); // Efek suara Garang
                alert("👑 Boss Token ditemukan!");
            }
        });

        game.appendChild(card);
    });
}

function isEmptyCell(x, y, cols, rows) {
    if (x < 0 || y < 0 || x >= cols || y >= rows) return true;
    const idx = y * cols + x;
    const card = document.querySelector(`[data-index="${idx}"]`);
    return (!card || card.classList.contains("matched"));
}

function hasAvailableMove() {
    return document.querySelectorAll(".card:not(.matched)").length > 0;
}

function checkWin() {
    const totalCards = document.querySelectorAll(".card").length;
    const matchedCards = document.querySelectorAll(".card.matched").length;
    if (matchedCards < totalCards) return false;

    clearInterval(timer);
    gameStarted = false;
    lock = true;
    playVictorySound();

    setTimeout(() => {
        try { confetti({ particleCount: 120, spread: 90, origin: { y: 0.6 } }); } catch(e) {}
        coins += 5;
        syncCoins();
        alert(`🏆 LEVEL ${currentLevel} SELESAI!\n\n🎁 Hadiah: Rp.5K`);
        playGlassShatterSound(); // Suara Gelas Pecah On setelah klik OK
        nextLevel();
    }, 500);

    return true;
}

function findAndHighlightMatch(){
    const cards = [...document.querySelectorAll(".card")].filter(card => !card.classList.contains("matched"));
    for(let i = 0; i < cards.length; i++){
        for(let j = i + 1; j < cards.length; j++){
            const cardA = cards[i];
            const cardB = cards[j];
            if(cardA.dataset.symbol === cardB.dataset.symbol){
                lock = true; 
                cardA.classList.add("hint-card");
                cardB.classList.add("hint-card");
                setTimeout(() => {
                    cardA.classList.remove("hint-card");
                    cardB.classList.remove("hint-card");
                    lock = false; 
                }, 3000);
                return true;
            }
        }
    }
    alert("Tidak ada pasangan yang bisa terhubung! Silakan acak papan (Shuffle).");
    lock = false; 
    return false;
}

function buyHint() {
    let itemHint = parseInt(localStorage.getItem("item_hint")) || 0;
    if (itemHint <= 0 && bossTokens <= 0) {
        lock = false; 
        if (confirm("🔍 Clue habis!\n\nBuka Toko Taegeuk?")) openTaegeukShop();
        return;
    }
    if (!gameStarted || lock) return;

    if (bossTokens > 0) {
        if (findAndHighlightMatch()) { bossTokens--; updateBossTokenVisibility(); }
        return;
    }
    if (findAndHighlightMatch()) {
        itemHint--;
        localStorage.setItem("item_hint", itemHint);
        updateInventoryUI();
    }
}

function useShuffleItem() {
    if (!gameStarted) { alert("Mulai game dulu!"); return; }
    let itemShuffle = parseInt(localStorage.getItem("item_shuffle")) || 0;
    if (itemShuffle <= 0) {
        if (confirm("🔀 Paid Shuffle habis!\n\nBuka Toko Taegeuk?")) openTaegeukShop();
        return;
    }
    itemShuffle -= 1;
    localStorage.setItem("item_shuffle", itemShuffle);
    updateInventoryUI();
    shuffleBoard();
}

function useNoLimitItem() { 
    if (!gameStarted || isNoLimitActive) return; 
    let itemNoLimit = parseInt(localStorage.getItem("item_noLimit")) || 0;
    if (itemNoLimit <= 0) {
        if (confirm("♾️ No Limit Time habis!\n\nBuka Toko Taegeuk?")) openTaegeukShop();
        return;
    }
    itemNoLimit -= 1;
    localStorage.setItem("item_noLimit", itemNoLimit);
    updateInventoryUI();

    isNoLimitActive = true; 
    clearInterval(timer); 
    time = 9999; 
    if(document.getElementById("time")) document.getElementById("time").innerText = "♾️"; 
    alert("♾️ Waktu tak terbatas diaktifkan untuk level ini!");
}

function buySkipLevel(){
    if(coins < 15) { alert("Koin tidak cukup! Harga Lompat Level Rp.15K"); return; }
    if(confirm("Bayar Rp.15K koin untuk melewati level ini?")) {
        coins -= 15;
        syncCoins();
        saveGameData();
        nextLevel();
    }
}

function startTimer(){
    clearInterval(timer);
    timer = setInterval(() => {
        time--;
        const tmEl = document.getElementById("time");
        if(tmEl) tmEl.innerText = time;
        if (time <= 0) {
            clearInterval(timer);
            gameStarted = false;
            saveToLeaderboard(true); 
            document.getElementById("gameOverOverlay")?.classList.remove("hidden");
        }
    }, 1000);
}

function startLevel(){
    const startOverlay = document.getElementById("startOverlay");
    if(startOverlay) startOverlay.classList.add("hidden");
    
    document.getElementById("bgMusic")?.play().catch(e => console.log("Audio blocked:", e));

    const countdown = document.getElementById("countdown");
    if(!countdown) { gameStarted = true; startTimer(); return; }
    
    let count = 3;
    countdown.style.display = "block";
    countdown.innerText = count;
    playCountdownSound(false); // Efek Suara Tiga

    const cd = setInterval(() => {
        count--;
        if(count > 0) {
            countdown.innerText = count;
            playCountdownSound(false); // Efek Suara Dua & Satu
        } else if(count === 0) {
            countdown.innerText = "GO!";
            playCountdownSound(true); // Efek Suara GO!
        } else {
            clearInterval(cd);
            countdown.style.display = "none";
            gameStarted = true;
            startTimer();
        }
    }, 1000);
}

function nextLevel() {
    currentLevel++;
    if (currentLevel > maxReachedLevel) maxReachedLevel = currentLevel;
    saveGameData();
    comboCount = 0;
    if (comboTimer) { clearTimeout(comboTimer); comboTimer = null; }
    resetState();
}

function resetCurrentLevel(){
    document.getElementById("gameOverOverlay")?.classList.add("hidden");
    resetState();
}

function resetState() {
    clearInterval(timer);
    gameStarted = false;
    firstCard = null;
    secondCard = null;
    lock = false; 
    relaxMode = false;
    isNoLimitActive = false;
    initLevelConfig();
    createBoard();
    document.getElementById("startOverlay")?.classList.remove("hidden");
}

function getBeltRank(level){
    if(level <= 5) return beltRanks[0];
    if(level <= 10) return beltRanks[1];
    if(level <= 15) return beltRanks[2];
    if(level <= 20) return beltRanks[3];
    if(level <= 25) return beltRanks[4];
    return beltRanks[5];
}

function updateBeltUI(){
    const belt = getBeltRank(currentLevel);
    const beltBadge = document.getElementById("beltRank");
    if(beltBadge) { beltBadge.innerText = belt.name; beltBadge.style.color = belt.color; }
    document.body.style.background = belt.bg;
}

function getChapter(level){
    return { chapter: Math.floor((level - 1) / 5) + 1, isBoss: level % 5 === 0 };
}

function updateLevelSelectorHTML() {
    const selector = document.getElementById("levelSelector");
    if(!selector) return;
    selector.innerHTML = "";
    if (maxReachedLevel <= 1) { selector.disabled = true; return; }
    selector.disabled = false;
    for (let i = 1; i <= maxReachedLevel; i++) {
        const opt = document.createElement("option");
        opt.value = i; opt.text = `Level ${i}`;
        if(i === currentLevel) opt.selected = true;
        selector.add(opt);
    }
}

function selectLevel(target) {
    if (!target) return;
    currentLevel = parseInt(target);
    resetState();
}

/* --- DEV CHEAT PANEL --- */
function toggleCheatPanel() { document.getElementById("cheatPanel")?.classList.toggle("hidden"); }
function cheatAddCoins() { coins += 999; syncCoins(); alert("💰 Koin Ditambahkan!");}
function cheatAddBossTokens() { bossTokens += 999; updateBossTokenVisibility(); alert("👑 999 Boss Token Ditambahkan!");}
function cheatAutoWin() { document.querySelectorAll(".card").forEach(c => {c.classList.remove("hidden-symbol"); c.classList.add("matched");}); checkWin(); }
function cheatTimeNoLimit() { clearInterval(timer); if(document.getElementById("time")) document.getElementById("time").innerText = "∞"; }
function cheatSetLevel() { 
    const lvlInp = document.getElementById("cheatLevelInput");
    if(!lvlInp) return;
    const lvl = lvlInp.value;
    if(lvl > 0) { currentLevel = parseInt(lvl); if(currentLevel > maxReachedLevel) maxReachedLevel = currentLevel; resetState(); }
}

function setupLongPress(elementId, callbackLong, callbackShort) {
    const el = document.getElementById(elementId);
    if (!el) return;
    let pressTimer = null; let isLongPress = false;
    const startPress = (e) => {
        clearTimeout(pressTimer); isLongPress = false;
        pressTimer = setTimeout(() => { isLongPress = true; callbackLong(); }, 1000); 
    };
    const endPress = () => { clearTimeout(pressTimer); if (!isLongPress) callbackShort(); isLongPress = false; };
    el.addEventListener("mousedown", startPress); el.addEventListener("mouseup", endPress);
    el.addEventListener("touchstart", startPress, {passive: true}); el.addEventListener("touchend", endPress, {passive: true});
}

function openTaegeukShop() { window.location.href = "Shop.html"; }

// Solusi Brilian: Integrasi fungsi global penutup menu Setting
function toggleSettingsPanel() {
    document.getElementById("settingsPanel")?.classList.toggle("hidden");
}

window.addEventListener("DOMContentLoaded", () => {
    setupLongPress("btnSkipLevel", toggleCheatPanel, buySkipLevel);
    setupLongPress("btnHint", shuffleBoard, buyHint);

    const settingsBtn = document.getElementById("settingsBtn");
    const settingsPanel = document.getElementById("settingsPanel");

    if (settingsBtn && settingsPanel) {
        settingsBtn.onclick = (e) => { e.stopPropagation(); toggleSettingsPanel(); };
    }

    window.addEventListener("click", (e) => {
        if (settingsPanel && !settingsPanel.classList.contains("hidden")) {
            if (!settingsPanel.contains(e.target) && e.target !== settingsBtn) {
                settingsPanel.classList.add("hidden");
            }
        }
    });
    
    if(document.getElementById("btnMulih")) {
        document.getElementById("btnMulih").onclick = () => { window.location.href = "index.html"; };
    }

    loadGameData();
    initLevelConfig();
    createBoard();
    updateBossTokenVisibility(); 
    renderLeaderboard();
});
