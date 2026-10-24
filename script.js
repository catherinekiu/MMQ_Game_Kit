(() => {
  "use strict";

  const M = window.MMQMath || {
    randInt(min, max) {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    },
    choice(items) {
      return items[Math.floor(Math.random() * items.length)];
    },
    shuffle(items) {
      const out = items.slice();
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
      }
      return out;
    },
    multiplicationDistractors(a, b, count) {
      const answer = a * b;
      const candidates = [
        (a - 1) * b, (a + 1) * b,
        a * (b - 1), a * (b + 1),
        answer - b, answer + b,
        answer - a, answer + a,
        answer - 1, answer + 1,
        answer - 2, answer + 2,
        answer - 5, answer + 5
      ];
      const unique = [];
      for (const value of this.shuffle(candidates)) {
        if (value > 0 && value <= 100 && value !== answer && !unique.includes(value)) {
          unique.push(value);
          if (unique.length === count) return unique;
        }
      }
      let offset = 1;
      while (unique.length < count) {
        for (const value of [answer + offset, answer - offset]) {
          if (value > 0 && value <= 100 && value !== answer && !unique.includes(value)) {
            unique.push(value);
            if (unique.length === count) break;
          }
        }
        offset++;
      }
      return unique;
    },
    metrics(correct, attempts, seconds) {
      const safeSeconds = Math.max(1, seconds);
      const attemptRate = attempts * 60 / safeSeconds;
      const accuracy = attempts ? correct / attempts : 0;
      return {
        attemptRate,
        accuracyPercent: accuracy * 100,
        fluency: accuracy * attemptRate
      };
    }
  };
  const $ = id => document.getElementById(id);
  const params = new URLSearchParams(location.search);

  const TOTAL = 20;
  const LIMIT = 60;
  const MIN_END = 10;

  const SPEEDS = {
    slow:   { rise: 44, sway: 8,  swayRate: 1.15, icon: "🐢" },
    medium: { rise: 68, sway: 13, swayRate: 1.45, icon: "🐇" },
    fast:   { rise: 98, sway: 18, swayRate: 1.8,  icon: "⚡" }
  };

  const bubbleArt = [
    "assets/answer_blue.png",
    "assets/answer_green.png",
    "assets/answer_pink.png",
    "assets/answer_gold.png"
  ];

  const feedbackArt = {
    good: "assets/correct.png",
    bad: "assets/wrong.png",
    burst: "assets/bubble_burst.png"
  };

  let lang = (params.get("lang") || "en").toLowerCase().startsWith("zh") ? "zh" : "en";
  let timeMode = ["timed", "untimed"].includes(params.get("mode"))
    ? params.get("mode")
    : (["timed", "untimed"].includes(params.get("timing")) ? params.get("timing") : "untimed");

  const requestedSpeed = params.get("speed");
  let speed = Object.prototype.hasOwnProperty.call(SPEEDS, requestedSpeed) ? requestedSpeed : "medium";

  const slot = params.get("slot") || "";
  if (slot === "competency") timeMode = "timed";
  if (slot === "procedural") timeMode = "untimed";
  const lockTiming = params.get("lockTiming") === "1" || slot === "procedural" || slot === "competency";

  let mode = "single";
  let selectedTable = null;
  let selectedTables = [];
  const mixed = new Set();

  let gameActive = false;
  let gamePrepared = false;
  let score = 0;
  let attempts = 0;
  let correct = 0;
  let startAt = 0;
  let timerId = null;
  let nextQuestionTimer = null;
  let lastResult = null;

  let currentQuestion = null;
  let questionToken = 0;
  let questionResolved = false;

  let bubbleRAF = 0;
  let lastBubbleFrame = 0;
  let floatingBubbles = [];

  const T = {
    en: {
      home: "MMQ! Home",
      subtitle: "Pop the bubble with the correct multiplication answer.",
      how: "How to play",
      step1: "Choose a times table.",
      step2: "Press START GAME! to open the play screen.",
      step3: "Adjust the play screen so you can see it clearly.",
      step4: "Press START NOW! when you are ready.",
      step5: "Read the question and tap the correct bubble.",
      playMode: "Play mode",
      untimed: "Untimed",
      timed: "Timed • 60 s",
      motion: "Bubble movement",
      speed: "Speed",
      slow: "Slow",
      medium: "Medium",
      fast: "Fast",
      chooseTable: "Choose a times table",
      mixed: "Mixed ×3",
      mixedHelp: "Choose exactly three times tables.",
      or: "OR",
      startGame: "START GAME!",
      beforeStart: "BEFORE YOU START",
      adjustTitle: "Adjust Your Screen",
      adjustHelp: "Make sure you can see the question and the whole bubble area clearly.",
      adjustTip: "Resize or move the window if needed. The timer has not started yet.",
      startNow: "START NOW!",
      readyQuestion: "Get Ready!",
      chooseFirst: "Choose one table above, or choose three for Mixed.",
      question: "Question",
      score: "Score",
      attempts: "Attempts",
      end: "End game",
      finished: "Game finished!",
      timeSpent: "Time",
      correct: "Correct",
      speedRate: "Response rate",
      accuracy: "Accuracy",
      fluency: "Fluency",
      again: "Play again",
      fixedTimed: "Competency mode is fixed at 60 seconds.",
      fixedUntimed: "Practice mode is untimed. It ends after 20 attempts.",
      freeTimed: "Timed mode lasts 60 seconds.",
      freeUntimed: "Untimed mode ends after 20 attempts; you may finish after 10.",
      timeLeft: "Time left",
      time: "Time",
      correctMsg: (q, a) => `Great! ${q} = ${a}.`,
      wrong: (q, a) => `Good try. ${q} = ${a}.`,
      need10: "Answer at least 10 questions before ending.",
      result: (c, a) => `You answered ${c} correctly out of ${a} attempts.`,
      pick3: "Choose three tables first.",
      singleReady: n => `You chose ×${n}. Ready? Press START GAME!`,
      mixedNeed: n => `Mixed: choose ${n} more table${n === 1 ? "" : "s"}.`,
      mixedReady: "Mixed is ready! Press START GAME!",
      mixedFull: "Three tables are selected. Untick one to choose a different table."
    },
    zh: {
      home: "MMQ! 主页",
      subtitle: "点击正确乘法答案的泡泡。",
      how: "玩法",
      step1: "选择一个乘法表。",
      step2: "按“开始游戏！”进入游戏画面。",
      step3: "调整游戏画面，确保看得清楚。",
      step4: "准备好后，按“现在开始！”。",
      step5: "看清题目，然后点击正确答案泡泡。",
      playMode: "游戏模式",
      untimed: "不限时",
      timed: "限时 • 60 秒",
      motion: "泡泡移动速度",
      speed: "速度",
      slow: "慢",
      medium: "中",
      fast: "快",
      chooseTable: "选择乘法表",
      mixed: "混合 ×3",
      mixedHelp: "请选择三个乘法表。",
      or: "或",
      startGame: "开始游戏！",
      beforeStart: "开始前",
      adjustTitle: "调整游戏画面",
      adjustHelp: "请确保你能清楚看到题目和完整的泡泡区域。",
      adjustTip: "如有需要，请调整窗口大小或位置。计时还没有开始。",
      startNow: "现在开始！",
      readyQuestion: "准备好！",
      chooseFirst: "选择一个乘法表，或在混合模式选择三个。",
      question: "题目",
      score: "得分",
      attempts: "作答次数",
      end: "结束游戏",
      finished: "游戏结束！",
      timeSpent: "用时",
      correct: "答对",
      speedRate: "作答速度",
      accuracy: "正确率",
      fluency: "流畅度",
      again: "再玩一次",
      fixedTimed: "达标检测固定为 60 秒。",
      fixedUntimed: "练习模式不限时，完成 20 次作答后结束。",
      freeTimed: "限时模式为 60 秒。",
      freeUntimed: "不限时模式完成 20 次后结束；做满 10 次可提前结束。",
      timeLeft: "剩余时间",
      time: "时间",
      correctMsg: (q, a) => `答对了！${q} = ${a}。`,
      wrong: (q, a) => `继续加油。${q} = ${a}。`,
      need10: "至少完成 10 次作答后才可结束。",
      result: (c, a) => `你答对 ${c} 题，共作答 ${a} 次。`,
      pick3: "请先选择三个乘法表。",
      singleReady: n => `已选择 ×${n}。准备好了吗？按“开始游戏！”。`,
      mixedNeed: n => `混合模式：请再选择 ${n} 个乘法表。`,
      mixedReady: "混合模式准备好了！按“开始游戏！”。",
      mixedFull: "已选择三个乘法表。如要更换，请先取消一个。"
    }
  };

  const tr = () => T[lang];

  function show(id) {
    ["menuScreen", "gameScreen", "resultScreen"].forEach(screenId => {
      $(screenId).classList.toggle("active", screenId === id);
    });
  }

  function speedLabel() {
    return tr()[speed];
  }

  function updateSpeedHud() {
    $("speedIcon").textContent = SPEEDS[speed].icon;
    $("speedValue").textContent = speedLabel();
  }

  function setLang(nextLang) {
    lang = nextLang === "zh" ? "zh" : "en";
    document.documentElement.lang = lang === "zh" ? "zh-Hans" : "en-GB";

    document.querySelectorAll("[data-i18n]").forEach(el => {
      const key = el.dataset.i18n;
      if (typeof tr()[key] === "string") el.textContent = tr()[key];
    });

    const home = lang === "zh" ? "../../START_HERE_ZH_CN.html" : "../../START_HERE_EN_GB.html";
    $("homeLink").href = home;
    $("resultHome").href = home;
    $("langEn").setAttribute("aria-pressed", String(lang === "en"));
    $("langZh").setAttribute("aria-pressed", String(lang === "zh"));

    updateModeUI();
    updateSpeedHud();
    updateStartButton();

    if (gamePrepared && !gameActive) {
      $("questionText").textContent = tr().readyQuestion;
    } else if (currentQuestion) {
      $("questionText").textContent = `${currentQuestion.a} × ${currentQuestion.b} = ?`;
    }

    if ($("resultScreen").classList.contains("active") && lastResult) {
      renderResult(lastResult);
    }
  }

  function updateModeUI() {
    document.querySelectorAll("[data-time]").forEach(button => {
      button.classList.toggle("selected", button.dataset.time === timeMode);
      button.disabled = lockTiming && button.dataset.time !== timeMode;
    });

    document.querySelectorAll("[data-speed]").forEach(button => {
      button.classList.toggle("selected", button.dataset.speed === speed);
      button.setAttribute("aria-pressed", String(button.dataset.speed === speed));
    });

    $("timeNote").textContent = lockTiming
      ? (timeMode === "timed" ? tr().fixedTimed : tr().fixedUntimed)
      : (timeMode === "timed" ? tr().freeTimed : tr().freeUntimed);

    $("slotPill").textContent = timeMode === "timed"
      ? (lang === "zh" ? "熟练度达标检测" : "Fluency Competency")
      : (lang === "zh" ? "程序性练习" : "Procedural Practice");

    $("timeLabel").textContent = timeMode === "timed" ? tr().timeLeft : tr().time;
    updateSpeedHud();
  }

  function buildTables() {
    const box = $("tableButtons");
    const mix = $("mixedButtons");
    box.innerHTML = "";
    mix.innerHTML = "";

    for (let n = 2; n <= 9; n++) {
      const singleButton = document.createElement("button");
      singleButton.className = "table-btn";
      singleButton.type = "button";
      singleButton.textContent = `×${n}`;
      singleButton.dataset.singleTable = String(n);
      singleButton.setAttribute("aria-pressed", "false");
      singleButton.addEventListener("click", () => selectSingle(n, singleButton));
      box.appendChild(singleButton);

      const mixedButton = document.createElement("button");
      mixedButton.className = "table-btn";
      mixedButton.type = "button";
      mixedButton.textContent = `×${n}`;
      mixedButton.dataset.table = String(n);
      mixedButton.setAttribute("aria-pressed", "false");
      mixedButton.addEventListener("click", () => toggleMixed(n, mixedButton));
      mix.appendChild(mixedButton);
    }
  }

  function clearSingleSelection() {
    document.querySelectorAll("[data-single-table]").forEach(btn => {
      btn.classList.remove("selected");
      btn.setAttribute("aria-pressed", "false");
    });
    selectedTable = null;
    selectedTables = [];
  }

  function clearMixedSelection() {
    mixed.clear();
    document.querySelectorAll("#mixedButtons .table-btn").forEach(btn => {
      btn.classList.remove("selected");
      btn.setAttribute("aria-pressed", "false");
    });
    $("mixedCount").textContent = "0/3";
  }

  function selectSingle(n, button) {
    mode = "single";
    clearMixedSelection();
    document.querySelectorAll("[data-single-table]").forEach(btn => {
      btn.classList.remove("selected");
      btn.setAttribute("aria-pressed", "false");
    });
    button.classList.add("selected");
    button.setAttribute("aria-pressed", "true");
    selectedTable = n;
    selectedTables = [n];
    updateStartButton();
  }

  function toggleMixed(n, button) {
    if (mode !== "mixed") {
      mode = "mixed";
      clearSingleSelection();
      clearMixedSelection();
    }

    if (mixed.has(n)) {
      mixed.delete(n);
    } else if (mixed.size < 3) {
      mixed.add(n);
    } else {
      $("startHint").textContent = tr().mixedFull;
      return;
    }

    button.classList.toggle("selected", mixed.has(n));
    button.setAttribute("aria-pressed", String(mixed.has(n)));
    $("mixedCount").textContent = `${mixed.size}/3`;
    updateStartButton();
  }

  function updateStartButton() {
    const button = $("startGameBtn");
    const hint = $("startHint");
    if (!button || !hint) return;

    const singleReady = mode === "single" && selectedTable !== null;
    const mixedReady = mode === "mixed" && mixed.size === 3;
    button.disabled = !(singleReady || mixedReady);

    if (singleReady) {
      hint.textContent = tr().singleReady(selectedTable);
    } else if (mode === "mixed") {
      const need = 3 - mixed.size;
      hint.textContent = need === 0 ? tr().mixedReady : tr().mixedNeed(need);
    } else {
      hint.textContent = tr().chooseFirst;
    }
  }

  function setTime(nextMode) {
    if (lockTiming && nextMode !== timeMode) return;
    if (!["timed", "untimed"].includes(nextMode)) return;
    timeMode = nextMode;
    updateModeUI();
  }

  function setSpeed(nextSpeed) {
    if (!Object.prototype.hasOwnProperty.call(SPEEDS, nextSpeed)) return;
    speed = nextSpeed;
    updateModeUI();
  }

  function startSelectedGame() {
    if (gameActive || gamePrepared) return;

    if (mode === "single" && selectedTable !== null) {
      selectedTables = [selectedTable];
      prepareGameScreen();
      return;
    }

    if (mode === "mixed" && mixed.size === 3) {
      selectedTables = [...mixed];
      selectedTable = selectedTables[0];
      prepareGameScreen();
      return;
    }

    updateStartButton();
  }

  function prepareGameScreen() {
    clearInterval(timerId);
    clearTimeout(nextQuestionTimer);
    timerId = null;
    nextQuestionTimer = null;
    stopBubbleMotion();

    gameActive = false;
    gamePrepared = true;
    score = 0;
    attempts = 0;
    correct = 0;
    currentQuestion = null;
    questionResolved = false;
    questionToken++;
    floatingBubbles = [];

    $("score").textContent = "0";
    $("attempts").textContent = "0";
    $("timer").textContent = timeMode === "timed" ? String(LIMIT) : "0";
    $("questionText").textContent = tr().readyQuestion;
    $("feedback").replaceChildren();
    $("progressBar").style.width = "0%";
    $("bubbleField").querySelectorAll(".bubble-mover").forEach(el => el.remove());
    $("readyPanel").hidden = false;
    $("endBtn").disabled = true;
    $("endBtn").style.display = "none";

    show("gameScreen");
    updateModeUI();

    requestAnimationFrame(() => {
      $("startNowBtn").focus({ preventScroll: true });
    });
  }

  function activeTable() {
    return mode === "mixed" ? M.choice(selectedTables) : selectedTable;
  }

  function startGame() {
    if (gameActive || !gamePrepared) return;

    clearTimeout(nextQuestionTimer);
    nextQuestionTimer = null;
    stopBubbleMotion();
    gamePrepared = false;
    $("readyPanel").hidden = true;
    score = 0;
    attempts = 0;
    correct = 0;
    startAt = Date.now();
    gameActive = true;
    questionToken++;
    questionResolved = false;

    clearInterval(timerId);
    timerId = setInterval(tick, 250);

    $("score").textContent = "0";
    $("attempts").textContent = "0";
    $("feedback").replaceChildren();

    show("gameScreen");
    updateModeUI();
    generateQuestion();
    tick();
  }

  function elapsed() {
    return Math.max(0, Math.floor((Date.now() - startAt) / 1000));
  }

  function tick() {
    if (!gameActive) return;

    const seconds = elapsed();
    const left = Math.max(0, LIMIT - seconds);

    $("timer").textContent = timeMode === "timed" ? left : seconds;
    updateProgress(seconds);

    if (timeMode === "timed" && left <= 0) endGame();
  }

  function updateProgress(seconds = elapsed()) {
    const percent = timeMode === "timed"
      ? (seconds / LIMIT) * 100
      : (attempts / TOTAL) * 100;

    $("progressBar").style.width = `${Math.min(100, Math.max(0, percent))}%`;

    const canEnd = attempts >= MIN_END;
    $("endBtn").disabled = !canEnd;
    $("endBtn").style.display = timeMode === "timed" && lockTiming ? "none" : "inline-flex";
  }

  function initialBubbleLayout(fieldWidth, fieldHeight) {
    if (fieldWidth < 620) {
      return [
        { x: fieldWidth * 0.27, y: fieldHeight * 0.24 },
        { x: fieldWidth * 0.73, y: fieldHeight * 0.43 },
        { x: fieldWidth * 0.27, y: fieldHeight * 0.60 },
        { x: fieldWidth * 0.73, y: fieldHeight * 0.72 }
      ];
    }

    return [
      { x: fieldWidth * 0.14, y: fieldHeight * 0.28 },
      { x: fieldWidth * 0.39, y: fieldHeight * 0.55 },
      { x: fieldWidth * 0.64, y: fieldHeight * 0.37 },
      { x: fieldWidth * 0.86, y: fieldHeight * 0.64 }
    ];
  }

  function buildFloatingAnswers(values, token) {
    stopBubbleMotion();

    const field = $("bubbleField");
    field.querySelectorAll(".bubble-mover").forEach(el => el.remove());

    const width = Math.max(280, field.clientWidth);
    const height = Math.max(380, field.clientHeight);
    const layout = initialBubbleLayout(width, height);

    floatingBubbles = values.map((value, index) => {
      const mover = document.createElement("div");
      mover.className = "bubble-mover";

      const button = document.createElement("button");
      button.type = "button";
      button.className = "answer-bubble";
      button.dataset.value = String(value);
      button.setAttribute("aria-label", String(value));

      const img = document.createElement("img");
      img.className = "bubble-art";
      img.src = bubbleArt[index % bubbleArt.length];
      img.alt = "";

      const number = document.createElement("span");
      number.className = "answer-number";
      number.textContent = String(value);

      button.append(img, number);
      button.addEventListener("click", () => resolveChoice(value, button, token));
      mover.appendChild(button);
      field.appendChild(mover);

      const halfBubble = mover.offsetWidth / 2;
      const state = {
        mover,
        button,
        x: layout[index].x - halfBubble,
        baseX: layout[index].x - halfBubble,
        y: layout[index].y,
        phase: index * 1.37 + Math.random() * 0.6,
        individualRate: 0.96 + index * 0.025
      };

      placeBubble(state, 0);
      return state;
    });

    lastBubbleFrame = 0;
    bubbleRAF = requestAnimationFrame(animateBubbles);
  }

  function placeBubble(state, sway) {
    state.mover.style.transform = `translate3d(${state.x + sway}px, ${state.y}px, 0)`;
  }

  function recycleBubble(state, fieldHeight) {
    const bubbleHeight = Math.max(110, state.button.offsetHeight || 150);
    state.y = fieldHeight - Math.min(30, bubbleHeight * 0.18) + Math.random() * 18;
    state.phase += 1.2 + Math.random();
  }

  function animateBubbles(timestamp) {
    if (!gameActive || questionResolved || floatingBubbles.length === 0) return;

    const settings = SPEEDS[speed];
    const dt = lastBubbleFrame ? Math.min(0.05, (timestamp - lastBubbleFrame) / 1000) : 0.016;
    lastBubbleFrame = timestamp;

    const field = $("bubbleField");
    const fieldHeight = Math.max(380, field.clientHeight);
    const time = timestamp / 1000;

    floatingBubbles.forEach(state => {
      state.y -= settings.rise * state.individualRate * dt;
      const sway = Math.sin(time * settings.swayRate + state.phase) * settings.sway;
      placeBubble(state, sway);

      const bubbleHeight = Math.max(110, state.button.offsetHeight || 150);
      if (state.y < -bubbleHeight - 25) recycleBubble(state, fieldHeight);
    });

    bubbleRAF = requestAnimationFrame(animateBubbles);
  }

  function stopBubbleMotion() {
    cancelAnimationFrame(bubbleRAF);
    bubbleRAF = 0;
    lastBubbleFrame = 0;
  }

  function generateQuestion() {
    if (!gameActive) return;

    if (timeMode === "untimed" && attempts >= TOTAL) {
      endGame();
      return;
    }

    questionToken++;
    const token = questionToken;
    questionResolved = false;

    const b = activeTable();
    const a = M.randInt(1, 9);
    const ans = a * b;
    currentQuestion = { a, b, ans };

    $("questionText").textContent = `${a} × ${b} = ?`;
    $("feedback").replaceChildren();

    const values = M.shuffle([ans, ...M.multiplicationDistractors(a, b, 3)]);
    buildFloatingAnswers(values, token);
  }

  function resolveChoice(value, button, token) {
    if (!gameActive || token !== questionToken || questionResolved) return;

    questionResolved = true;
    stopBubbleMotion();
    attempts++;

    const good = value === currentQuestion.ans;

    if (good) {
      correct++;
      score += 10;

      button.classList.add("correct");
      button.querySelector(".bubble-art").src = feedbackArt.good;

      const burst = document.createElement("img");
      burst.className = "burst";
      burst.src = feedbackArt.burst;
      burst.alt = "";
      button.appendChild(burst);

      showFeedback(tr().correctMsg(`${currentQuestion.a} × ${currentQuestion.b}`, currentQuestion.ans), true);
    } else {
      button.classList.add("wrong");
      button.querySelector(".bubble-art").src = feedbackArt.bad;

      const correctButton = [...document.querySelectorAll(".answer-bubble")]
        .find(el => Number(el.dataset.value) === currentQuestion.ans);

      if (correctButton) {
        correctButton.classList.add("correct");
        correctButton.querySelector(".bubble-art").src = feedbackArt.good;
      }

      showFeedback(tr().wrong(`${currentQuestion.a} × ${currentQuestion.b}`, currentQuestion.ans), false);
    }

    document.querySelectorAll(".answer-bubble").forEach(el => {
      el.disabled = true;
      if (el !== button && Number(el.dataset.value) !== currentQuestion.ans) {
        el.classList.add("dim");
      }
    });

    syncStats();

    nextQuestionTimer = setTimeout(() => {
      if (gameActive && token === questionToken) generateQuestion();
    }, 900);
  }

  function syncStats() {
    $("score").textContent = String(score);
    $("attempts").textContent = String(attempts);
    updateProgress();
  }

  function showFeedback(text, good) {
    const feedback = $("feedback");
    feedback.replaceChildren();
    if (!text) return;

    const img = document.createElement("img");
    img.src = good ? feedbackArt.good : feedbackArt.bad;
    img.alt = "";

    const span = document.createElement("span");
    span.textContent = text;

    feedback.append(img, span);
    feedback.style.color = good ? "#267450" : "#9b4a42";
  }

  function formatSecondsLabel(seconds) {
    return lang === "zh" ? `${seconds} 秒` : `${seconds} s`;
  }

  function getResultPresentation(metrics) {
    const accuracy = metrics.accuracyPercent;
    const fluency = metrics.fluency;

    if (accuracy >= 95 && fluency >= 12) {
      return lang === "zh"
        ? {
            tier: "amazing",
            stars: 3,
            celebration: "太棒了！",
            badge: "泡泡冠军",
            encouragement: "你又快又准！表现非常出色！"
          }
        : {
            tier: "amazing",
            stars: 3,
            celebration: "Amazing!",
            badge: "Bubble Champion",
            encouragement: "You were fast and accurate. Fantastic work!"
          };
    }

    if (accuracy >= 85) {
      return lang === "zh"
        ? {
            tier: "great",
            stars: 3,
            celebration: "做得很好！",
            badge: "乘法小达人",
            encouragement: "你的表现很棒！再接再厉！"
          }
        : {
            tier: "great",
            stars: 3,
            celebration: "Great job!",
            badge: "Multiplication Star",
            encouragement: "Excellent effort! Keep building your speed."
          };
    }

    if (accuracy >= 70) {
      return lang === "zh"
        ? {
            tier: "good",
            stars: 2,
            celebration: "做得不错！",
            badge: "泡泡探索者",
            encouragement: "你越来越好了。继续练习会更熟练！"
          }
        : {
            tier: "good",
            stars: 2,
            celebration: "Well done!",
            badge: "Bubble Explorer",
            encouragement: "Nice work. A little more practice will make you even stronger!"
          };
    }

    return lang === "zh"
      ? {
          tier: "keep-going",
          stars: 1,
          celebration: "继续加油！",
          badge: "练习小勇士",
          encouragement: "你已经开始前进了。再玩一次，争取更高分！"
        }
      : {
          tier: "keep-going",
          stars: 1,
          celebration: "Keep going!",
          badge: "Practice Hero",
          encouragement: "You are improving. Play again and try to beat your score!"
        };
  }

  function currentTableSummary() {
    if (mode === "mixed" && selectedTables.length) {
      const tables = selectedTables.slice().sort((a, b) => a - b).map(n => `×${n}`).join(" ");
      return lang === "zh" ? `混合：${tables}` : `Mixed: ${tables}`;
    }
    if (selectedTable !== null) {
      return lang === "zh" ? `乘法表 ×${selectedTable}` : `Table ×${selectedTable}`;
    }
    return lang === "zh" ? "未选择" : "Not selected";
  }

  function renderResult(result) {
    const { seconds, metrics, score: resultScore, correct: resultCorrect, attempts: resultAttempts } = result;
    const presentation = getResultPresentation(metrics);
    result.presentation = presentation;

    $("resultScreen").dataset.tier = presentation.tier;
    $("resultCelebration").textContent = presentation.celebration;
    $("resultBadge").textContent = presentation.badge;
    $("resultTitle").textContent = tr().finished;
    $("resultMessage").textContent = tr().result(resultCorrect, resultAttempts);
    $("resultEncouragement").textContent = presentation.encouragement;

    $("rScore").textContent = String(resultScore);
    $("rTime").textContent = formatSecondsLabel(seconds);
    $("rCorrect").textContent = String(resultCorrect);
    $("rSpeed").textContent = `${metrics.attemptRate.toFixed(2)}/min`;
    $("rAccuracy").textContent = `${metrics.accuracyPercent.toFixed(1)}%`;
    $("rFluency").textContent = `${metrics.fluency.toFixed(2)}/min`;
    $("rAccuracyMeter").textContent = `${metrics.accuracyPercent.toFixed(1)}%`;
    $("rFluencyMeter").textContent = `${metrics.fluency.toFixed(2)}/min`;

    $("resultModeChip").textContent = timeMode === "timed" ? tr().timed : tr().untimed;
    $("resultTableChip").textContent = currentTableSummary();
    $("resultSpeedChip").textContent = `${lang === "zh" ? "速度" : "Speed"}: ${speedLabel()}`;

    $("rAccuracyBar").style.width = `${Math.max(0, Math.min(100, metrics.accuracyPercent))}%`;
    $("rFluencyBar").style.width = `${Math.max(0, Math.min(100, metrics.fluency * 5))}%`;

    const stars = Array.from(document.querySelectorAll("#resultStars .result-star"));
    stars.forEach((star, index) => {
      star.classList.toggle("active", index < presentation.stars);
    });
  }

  function requestEnd() {
    if (!gameActive) return;
    if (timeMode === "timed" && lockTiming) return;

    if (attempts < MIN_END) {
      showFeedback(tr().need10, false);
      return;
    }

    endGame();
  }

  function endGame() {
    if (!gameActive) return;

    gameActive = false;
    gamePrepared = false;
    clearInterval(timerId);
    clearTimeout(nextQuestionTimer);
    nextQuestionTimer = null;
    stopBubbleMotion();
    questionToken++;
    floatingBubbles = [];
    $("bubbleField").querySelectorAll(".bubble-mover").forEach(el => el.remove());

    const seconds = timeMode === "timed"
      ? Math.min(LIMIT, elapsed())
      : Math.max(1, elapsed());

    const metrics = M.metrics(correct, attempts, seconds);
    const presentation = getResultPresentation(metrics);

    lastResult = {
      seconds,
      metrics,
      presentation,
      score,
      correct,
      attempts
    };

    renderResult(lastResult);
    show("resultScreen");
  }

  function resetToMenu() {
    clearInterval(timerId);
    clearTimeout(nextQuestionTimer);
    nextQuestionTimer = null;
    stopBubbleMotion();
    gameActive = false;
    gamePrepared = false;
    floatingBubbles = [];
    currentQuestion = null;
    $("readyPanel").hidden = false;
    show("menuScreen");
    updateModeUI();
  }

  window.addEventListener("resize", () => {
    if (!gameActive || questionResolved || floatingBubbles.length === 0) return;

    const field = $("bubbleField");
    const width = Math.max(280, field.clientWidth);
    const height = Math.max(380, field.clientHeight);
    const layout = initialBubbleLayout(width, height);

    floatingBubbles.forEach((state, index) => {
      const halfBubble = state.mover.offsetWidth / 2;
      state.baseX = layout[index].x - halfBubble;
      state.x = state.baseX;
      state.y = Math.min(state.y, height + 100);
    });
  });

  $("langEn").addEventListener("click", () => setLang("en"));
  $("langZh").addEventListener("click", () => setLang("zh"));

  document.querySelectorAll("[data-time]").forEach(button => {
    button.addEventListener("click", () => setTime(button.dataset.time));
  });

  document.querySelectorAll("[data-speed]").forEach(button => {
    button.addEventListener("click", () => setSpeed(button.dataset.speed));
  });

  $("startGameBtn").addEventListener("click", startSelectedGame);
  $("startNowBtn").addEventListener("click", startGame);
  $("endBtn").addEventListener("click", requestEnd);
  $("againBtn").addEventListener("click", resetToMenu);

  buildTables();
  setLang(lang);
  setSpeed(speed);
  updateModeUI();
  updateStartButton();
})();
