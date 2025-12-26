// ===============================
// CONFIGURAÇÃO DE PERFORMANCE
// ===============================
const CARDS_TO_SHOW = 25;
const FORCE_OFFSET_FROM_END = 7;
const FORCE_EXTRA_DELAY = 200;

const SPEED_START = 60;
const SPEED_END = 40;
const AFTER_FLUSH_DELAY = 10;

// ===============================
// BARALHO — MNEMONICA ROTACIONADA
// ===============================
const deck = [
  "as","5h","9s","2s","qh","3d","qc","8h","6s","5s","9h","kc",
  "2d","jh","3s","8s","6h","xc","5d","kd","2c","3h","8d","5c",
  "ks","jd","8c","xs","kh","jc","7s","xh","ad","4s","7h","4d",
  "ac","9c","js","qd","7d","qs","xd","6c","ah","9d","4c","2h",
  "7c","3c","4h","6d"
];

const deckEl = document.getElementById("deck");
const cardImg = document.getElementById("card");
const indicator = document.getElementById("swipe-indicator");

// ===============================
// ESTADO
// ===============================
let sequence = [];
let index = 0;
let running = false;
let timer = null;
let awaitingRetry = false;

let forcedOverride = null;
let forcedRunsLeft = 0;
let forceIndexThisRun = -1;

// ===============================
// PRÉ-CARREGAMENTO
// ===============================
deck.forEach(c => {
  const img = new Image();
  img.src = `cards/${c}.png`;
});

const randomCard = () =>
  deck[Math.floor(Math.random() * deck.length)];

// ===============================
// PREPARA SEQUÊNCIA (force configurável)
// ===============================
function prepareDeck(force) {
  const pool = deck.filter(c => c !== force);

  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  const total = CARDS_TO_SHOW;
  const offset = Math.max(1, Math.min(FORCE_OFFSET_FROM_END, total - 2));
  const forceIndex = total - 1 - offset;

  const slice = pool.slice(0, total - 1);
  slice.splice(forceIndex, 0, force);

  forceIndexThisRun = forceIndex;
  return slice;
}

function clearTimer() {
  if (timer) clearTimeout(timer);
  timer = null;
}

// ===============================
// INDICADOR STEALTH (PEEK)
// ===============================
let indicatorTimeout = null;

function showIndicatorStealth(text) {
  if (!indicator) return;
  indicator.textContent = text;
  indicator.style.opacity = "1";
  clearTimeout(indicatorTimeout);
  indicatorTimeout = setTimeout(() => {
    indicator.style.opacity = "0";
  }, 420);
}

// ===============================
// BOTÃO "TENTAR DE NOVO"
// ===============================
const retryBtn = document.createElement("button");
retryBtn.textContent = "Tentar de novo";

Object.assign(retryBtn.style, {
  position: "absolute",
  left: "50%",
  top: "50%",
  transform: "translate(-50%, -50%)",
  padding: "14px 18px",
  borderRadius: "14px",
  border: "1px solid rgba(255,255,255,0.16)",
  background: "rgba(0,0,0,0.55)",
  color: "rgba(255,255,255,0.92)",
  fontSize: "15px",
  opacity: "0",
  display: "none",
  transition: "opacity 0.18s ease",
  zIndex: "10"
});

deckEl.appendChild(retryBtn);

function showRetryOnly() {
  awaitingRetry = true;
  cardImg.style.opacity = "0";
  retryBtn.style.display = "block";
  requestAnimationFrame(() => retryBtn.style.opacity = "1");
}

function resetToAce() {
  awaitingRetry = false;
  retryBtn.style.opacity = "0";
  setTimeout(() => retryBtn.style.display = "none", 200);
  cardImg.src = "cards/as.png";
  cardImg.style.opacity = "1";
}

retryBtn.addEventListener("click", e => {
  e.stopPropagation();
  resetToAce();
});

// ===============================
// ANIMAÇÃO DO BARALHO
// ===============================
function runDeck() {
  if (!running) return;

  if (index >= sequence.length) {
    running = false;
    setTimeout(showRetryOnly, AFTER_FLUSH_DELAY);
    return;
  }

  const card = sequence[index];

  cardImg.style.transform = "translateY(14px)";
  cardImg.style.opacity = "0";

  clearTimer();
  timer = setTimeout(() => {
    cardImg.src = `cards/${card}.png`;
    requestAnimationFrame(() => {
      cardImg.style.transform = "translateY(0)";
      cardImg.style.opacity = "1";
    });

    const isForce = index === forceIndexThisRun;
    index++;

    const baseDelay =
      index > forceIndexThisRun ? SPEED_END : SPEED_START;

    const delay = isForce
      ? baseDelay + FORCE_EXTRA_DELAY
      : baseDelay;

    timer = setTimeout(runDeck, delay);
  }, 40);
}

function startDeck() {
  if (running || awaitingRetry) return;

  running = true;
  index = 0;

  const force =
    forcedRunsLeft > 0 && forcedOverride
      ? (forcedRunsLeft--, forcedOverride)
      : randomCard();

  if (forcedRunsLeft === 0) forcedOverride = null;

  cardImg.src = "cards/as.png";
  cardImg.style.opacity = "1";

  sequence = prepareDeck(force);
  timer = setTimeout(runDeck, 120);
}

// ===============================
// SWIPE INPUT (INALTERADO)
// ===============================
const SWIPE_MIN = 42;
let sx = 0, sy = 0;
let swipeBuffer = [];

function decodeSwipe([a,b,c]) {
  const valueMap = {
    "UR":"a","RU":"2","RR":"3","RD":"4","DR":"5","DD":"6",
    "DL":"7","LD":"8","LL":"9","LU":"x","UL":"j","UU":"q","UD":"k"
  };
  const suitMap = { "U":"s","R":"h","D":"c","L":"d" };
  return valueMap[a+b] && suitMap[c]
    ? valueMap[a+b] + suitMap[c]
    : null;
}

document.addEventListener("touchstart", e => {
  if (running || awaitingRetry) return;
  sx = e.touches[0].clientX;
  sy = e.touches[0].clientY;
}, { passive:true });

document.addEventListener("touchend", e => {
  if (running || awaitingRetry) return;

  const dx = e.changedTouches[0].clientX - sx;
  const dy = e.changedTouches[0].clientY - sy;

  if (Math.abs(dx) >= SWIPE_MIN || Math.abs(dy) >= SWIPE_MIN) {
    swipeBuffer.push(
      Math.abs(dx) > Math.abs(dy)
        ? dx > 0 ? "R" : "L"
        : dy > 0 ? "D" : "U"
    );

    if (swipeBuffer.length === 3) {
      const card = decodeSwipe(swipeBuffer);
      swipeBuffer = [];
      if (card) {
        forcedOverride = card;
        forcedRunsLeft = 2;
        showIndicatorStealth(card.toUpperCase());
      }
    }
    return;
  }

  startDeck();
});

deckEl.addEventListener("click", () => {
  if (!awaitingRetry) startDeck();
});






