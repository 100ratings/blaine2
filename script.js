// ===============================
// CONFIGURAÇÃO GERAL
// ===============================

// Quantas cartas aparecem no total
const CARDS_TO_SHOW = 25;

// Quantas cartas ANTES do final o force aparece
const FORCE_OFFSET_FROM_END = 7;

// Micro pausa SOMENTE no force (0 = sem pausa)
const FORCE_HOLD_MS = 350;

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

// ===============================
// ESTADO
// ===============================
let forcedOverride = null;
let forcedRunsLeft = 0;
let forceThisRun = null;
let forceIndexThisRun = -1;

let sequence = [];
let index = 0;
let running = false;
let timer = null;
let awaitingRetry = false;

// ===============================
// VELOCIDADES
// ===============================
const SPEED_START = 60;
const SPEED_END   = 38;
const FINAL_FLUSH_DELAY = 40; // último sumiço rápido

// ===============================
// PRÉ-CARREGAMENTO
// ===============================
deck.forEach(c => {
  const img = new Image();
  img.src = `cards/${c}.png`;
});

function getRandomCard() {
  return deck[Math.floor(Math.random() * deck.length)];
}

// ===============================
// PREPARA SEQUÊNCIA (force NÃO no final)
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
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
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

function hideRetryAndShowAceOnly() {
  awaitingRetry = false;
  retryBtn.style.opacity = "0";
  setTimeout(() => retryBtn.style.display = "none", 200);
  cardImg.src = "cards/as.png";
  cardImg.style.opacity = "1";
}

retryBtn.addEventListener("click", e => {
  e.stopPropagation();
  hideRetryAndShowAceOnly();
});

// ===============================
// ANIMAÇÃO DO BARALHO
// ===============================
function runDeck() {
  if (!running) return;

  if (index >= sequence.length) {
    running = false;

    // SUMIÇO FINAL (evento mais forte)
    setTimeout(() => {
      cardImg.style.opacity = "0";
      showRetryOnly();
    }, FINAL_FLUSH_DELAY);

    return;
  }

  const currentCard = sequence[index];

  cardImg.style.transform = "translateY(14px)";
  cardImg.style.opacity = "0";

  clearTimer();
  timer = setTimeout(() => {
    cardImg.src = `cards/${currentCard}.png`;

    requestAnimationFrame(() => {
      cardImg.style.transform = "translateY(0)";
      cardImg.style.opacity = "1";
    });

    const isForce = index === forceIndexThisRun;
    index++;

    const baseDelay =
      index > sequence.length * 0.65 ? SPEED_END : SPEED_START;

    const delay = isForce
      ? FORCE_HOLD_MS
      : baseDelay;

    timer = setTimeout(runDeck, delay);
  }, 40);
}

function startDeck() {
  if (running || awaitingRetry) return;

  running = true;
  index = 0;

  if (forcedRunsLeft > 0 && forcedOverride) {
    forceThisRun = forcedOverride;
    forcedRunsLeft--;
    if (forcedRunsLeft === 0) forcedOverride = null;
  } else {
    forceThisRun = getRandomCard();
  }

  cardImg.src = "cards/as.png";
  cardImg.style.opacity = "1";

  sequence = prepareDeck(forceThisRun);
  timer = setTimeout(runDeck, 120);
}

// ===============================
// INPUT (tap)
// ===============================
deckEl.addEventListener("click", () => {
  if (!awaitingRetry) startDeck();
});
