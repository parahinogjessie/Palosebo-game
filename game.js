/* public/js/game.js — Palosebo Game with Player Name Modal + Leaderboard + Change Players */ 
document.addEventListener("DOMContentLoaded", () => {
  // Elements
  const p1El = document.getElementById("player1");
  const p2El = document.getElementById("player2");
  const bamboo1 = document.getElementById("bamboo1");
  const bamboo2 = document.getElementById("bamboo2");
  const startBtn = document.getElementById("startBtn");
  const restartBtn = document.getElementById("restartBtn");
  const changePlayersBtn = document.getElementById("changePlayersBtn"); // 🔹 new
  const countdownEl = document.getElementById("countdown");
  const overlay = document.getElementById("overlay");
  const winnerPopup = document.getElementById("winnerPopup");
  const winnerText = document.getElementById("winnerText");
  const closeWinner = document.getElementById("closeWinner");
  const confettiCanvas = document.getElementById("confettiCanvas");
  const p1BarFill = document.querySelector("#p1Bar .progress-fill");
  const p2BarFill = document.querySelector("#p2Bar .progress-fill");
  const timerEl = document.getElementById("timer");
  const mobileP1 = document.getElementById("mobileP1");
  const mobileP2 = document.getElementById("mobileP2");
  const gameRoot = document.getElementById("game-root");

  // Modal for player names
  const playerSetupModal = document.getElementById("playerSetupModal");
  const playerForm = document.getElementById("playerForm");
  const p1NameInput = document.getElementById("player1NameInput");
  const p2NameInput = document.getElementById("player2NameInput");
  const p1NameDisplay = document.getElementById("p1Name");
  const p2NameDisplay = document.getElementById("p2Name");

  // Leaderboard modal
  const leaderboardBtn = document.getElementById("leaderboardBtn");
  const leaderboardModal = document.getElementById("leaderboardModal");
  const leaderboardTable = document.getElementById("leaderboardTable");
  const closeLeaderboard = document.getElementById("closeLeaderboard");

  // Config
  let pos1 = 0, pos2 = 0;
  const step = 30; // climb per press (px)
  const bambooHeight = Math.max(bamboo1.clientHeight, bamboo2.clientHeight);
  const finishLine = bambooHeight - 80; // px from bottom
  let gameActive = false;
  let startTime = 0, timerInterval = null;

  // Confetti engine
  const confetti = initConfetti(confettiCanvas);

  // Optional sounds
  const soundClimb = null;
  const soundSlip = null;
  const soundWin  = null;

  // Reset state
  function resetGame() {
    pos1 = 0; pos2 = 0;
    setBottom(p1El, 0);
    setBottom(p2El, 0);
    updateProgressBars();
    stopTimer();
    gameActive = false;
    restartBtn.style.display = "none";
    overlay.style.display = "none";
  }

  function setBottom(el, px) {
    el.style.bottom = px + "px";
  }

  // Countdown
  function startCountdown() {
    overlay.style.display = "flex";
    countdownEl.style.display = "block";
    let timeLeft = 3;
    countdownEl.textContent = timeLeft;
    startBtn.disabled = true;

    const id = setInterval(() => {
      timeLeft--;
      if (timeLeft > 0) {
        countdownEl.textContent = timeLeft;
      } else {
        clearInterval(id);
        countdownEl.textContent = "GO!";
        countdownEl.style.transform = "scale(1.06)";
        setTimeout(() => {
          overlay.style.display = "none";
          countdownEl.style.transform = "scale(1)";
          countdownEl.style.display = "none";
        }, 650);
        gameActive = true;
        startTimer();
        startBtn.disabled = false;
        restartBtn.style.display = "inline-block";
      }
    }, 1000);
  }

  // Timer
  function startTimer() {
    startTime = performance.now();
    timerInterval = setInterval(() => {
      const t = performance.now() - startTime;
      timerEl.textContent = formatTime(t);
    }, 30);
  }
  function stopTimer() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }
  function formatTime(ms) {
    const s = Math.floor(ms / 1000);
    const cs = Math.floor((ms % 1000) / 10);
    const mm = String(Math.floor(s / 60)).padStart(2, "0");
    const ss = String(s % 60).padStart(2, "0");
    return `${mm}:${ss}.${String(cs).padStart(2, "0")}`;
  }

  // Progress bars
  function updateProgressBars() {
    const pct1 = Math.min(100, Math.round((pos1 / finishLine) * 100));
    const pct2 = Math.min(100, Math.round((pos2 / finishLine) * 100));
    p1BarFill.style.width = pct1 + "%";
    p2BarFill.style.width = pct2 + "%";
  }

  // Climb + slips
  function climbWithSlip(playerEl, currentPos) {
    playerEl.classList.add("climb");
    setTimeout(() => playerEl.classList.remove("climb"), 160);

    if (soundClimb) { soundClimb.currentTime = 0; soundClimb.play(); }

    let pos = currentPos + step;
    const progressPct = (pos / finishLine) * 100;

    // Small slip
    if (progressPct > 40 && progressPct < 80 && Math.random() < 0.20) {
      triggerSmallSlip(playerEl);
      pos = Math.max(0, pos - 40);
      if (soundSlip) { soundSlip.currentTime = 0; soundSlip.play(); }
    }

    // Big slip
    if (progressPct >= 80 && Math.random() < 0.35) {
      triggerBigSlip(playerEl);
      pos = 0;
      gameRoot.classList.add("shake");
      setTimeout(() => gameRoot.classList.remove("shake"), 600);
      if (soundSlip) { soundSlip.currentTime = 0; soundSlip.play(); }
    }

    return Math.max(0, pos);
  }

  function triggerSmallSlip(el) {
    el.classList.add("slip");
    setTimeout(() => el.classList.remove("slip"), 340);
  }

  function triggerBigSlip(el) {
    const cur = parseInt(getComputedStyle(el).bottom || "0", 10) || 0;
    el.style.setProperty("--pos", cur + "px");
    el.classList.add("big-slip");
    setTimeout(() => {
      el.classList.remove("big-slip");
      setBottom(el, 0);
    }, 980);
  }

  // Winner (✅ now saves to DB)
  function declareWinner(name) {
    gameActive = false;
    stopTimer();

    const rawSeconds = (performance.now() - startTime) / 1000;

    // Save winner to DB
    fetch("/leaderboard", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-TOKEN": document.querySelector('meta[name="csrf-token"]').content
      },
      body: JSON.stringify({ player_name: name, time: rawSeconds.toFixed(2) })
    });

    winnerText.innerHTML = `<strong>${name}</strong> wins! 🏆<br>Time: ${timerEl.textContent}`;
    winnerPopup.style.display = "block";
    overlay.style.display = "flex";
    confetti.explode();
    if (soundWin) { soundWin.play(); }
  }

  closeWinner.addEventListener("click", () => {
    winnerPopup.style.display = "none";
    overlay.style.display = "none";
  });

  // Keyboard
  document.addEventListener("keydown", (ev) => {
    if (!gameActive) return;
    if (ev.key.toLowerCase() === "a") {
      pos1 = climbWithSlip(p1El, pos1);
      setBottom(p1El, pos1);
      updateProgressBars();
      if (pos1 >= finishLine) declareWinner(p1NameDisplay.textContent);
    } else if (ev.key.toLowerCase() === "l") {
      pos2 = climbWithSlip(p2El, pos2);
      setBottom(p2El, pos2);
      updateProgressBars();
      if (pos2 >= finishLine) declareWinner(p2NameDisplay.textContent);
    }
  });

  // Mobile
  mobileP1.addEventListener("touchstart", (e) => {
    e.preventDefault();
    if (!gameActive) return;
    pos1 = climbWithSlip(p1El, pos1);
    setBottom(p1El, pos1);
    updateProgressBars();
    if (pos1 >= finishLine) declareWinner(p1NameDisplay.textContent);
  });

  mobileP2.addEventListener("touchstart", (e) => {
    e.preventDefault();
    if (!gameActive) return;
    pos2 = climbWithSlip(p2El, pos2);
    setBottom(p2El, pos2);
    updateProgressBars();
    if (pos2 >= finishLine) declareWinner(p2NameDisplay.textContent);
  });

  // Buttons
  startBtn.addEventListener("click", () => { resetGame(); startCountdown(); });
  restartBtn.addEventListener("click", () => { resetGame(); startCountdown(); });

  // 🔹 Change Players button
  changePlayersBtn.addEventListener("click", () => {
    resetGame();
    // Reset player names
    p1NameDisplay.textContent = "Player 1";
    p2NameDisplay.textContent = "Player 2";
    p1NameInput.value = "";
    p2NameInput.value = "";
    // Show setup modal again
    playerSetupModal.style.display = "flex";
    // Disable Start until new names entered
    startBtn.disabled = true;
  });

  // Player name modal submit
  playerForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const p1Name = p1NameInput.value.trim() || "Player 1";
    const p2Name = p2NameInput.value.trim() || "Player 2";

    p1NameDisplay.textContent = p1Name;
    p2NameDisplay.textContent = p2Name;

    playerSetupModal.style.display = "none";
    startBtn.disabled = false;
  });

  // Leaderboard button
  leaderboardBtn.addEventListener("click", () => {
    fetch("/leaderboard")
      .then(res => res.json())
      .then(data => {
        leaderboardTable.innerHTML = "";
        data.forEach((row, index) => {
          leaderboardTable.innerHTML += `
            <tr>
              <td>${index + 1}</td>
              <td>${row.player_name}</td>
              <td>${row.time}</td>
            </tr>`;
        });
        leaderboardModal.style.display = "flex";
      });
  });

  // Close leaderboard
  closeLeaderboard.addEventListener("click", () => {
    leaderboardModal.style.display = "none";
  });

  // Init
  resetGame();

  // Confetti Engine
  function initConfetti(canvas) {
    canvas.width = window.innerWidth; 
    canvas.height = window.innerHeight;
    const ctx = canvas.getContext("2d");
    let particles = [];
    function rand(min,max){ return Math.random()*(max-min)+min; }

    function spawn(n=80) {
      const colors = ["#ff5252","#ffb74d","#ffd54f","#66bb6a","#4fc3f7","#9575cd"];
      for (let i=0;i<n;i++){
        particles.push({
          x: rand(0,canvas.width), y: rand(-20,canvas.height/2),
          vx: rand(-2,2), vy: rand(2,6),
          size: rand(6,12), color: colors[Math.floor(rand(0,colors.length))],
          rot: rand(0,360), vr: rand(-6,6), life: rand(80,160)
        });
      }
      if (!animLoop) animate();
    }

    function explode(){ spawn(120); }

    let animLoop = null;
    function animate(){
      animLoop = requestAnimationFrame(animate);
      ctx.clearRect(0,0,canvas.width,canvas.height);
      for (let i=particles.length-1;i>=0;i--){
        const p = particles[i];
        p.x += p.vx; p.y += p.vy; p.vy += 0.12; p.rot += p.vr; p.life--;
        ctx.save();
        ctx.translate(p.x,p.y);
        ctx.rotate(p.rot * Math.PI/180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size*0.6);
        ctx.restore();
        if (p.y > canvas.height + 50 || p.life <= 0) particles.splice(i,1);
      }
      if (particles.length === 0) { cancelAnimationFrame(animLoop); animLoop=null; }
    }

    window.addEventListener("resize", () => { 
      canvas.width = window.innerWidth; 
      canvas.height = window.innerHeight; 
    });

    return { explode };
  }
});

// Trash talk
const phrases = [
  "Haha you're weak!",
  "This game is ez 😎",
  "Catch me if you can!",
  "Too slow!",
  "I was born for this!",
  "Better luck next time!"
];

function showTrashTalk(playerId) {
  const bubble = document.getElementById("bubble" + playerId);
  const randomPhrase = phrases[Math.floor(Math.random() * phrases.length)];
  bubble.textContent = randomPhrase;
  bubble.classList.add("show");

  setTimeout(() => {
    bubble.classList.remove("show");
  }, 2000);
}

// Trash talk timing
setInterval(() => showTrashTalk(1), Math.random() * 3000 + 5000);
setInterval(() => showTrashTalk(2), Math.random() * 3000 + 5000);

if (!checkWinner()) {
  // keep game running
}

