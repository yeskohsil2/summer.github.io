const routes = ["home", "library", "leaderboard", "account"];

const games = [
  { id: "guess", title: "Угадай число", description: "Найди число от 1 до 50 за минимальное число попыток." },
  { id: "reaction", title: "Реакция", description: "Нажми кнопку как можно быстрее после сигнала." },
  { id: "memory", title: "Память", description: "Повтори последовательность чисел без ошибок." },
  { id: "roulette", title: "Рулетка", description: "Выбери сектор, крути колесо и лови множитель очков." }
];

const rouletteSectors = [
  { label: "x2", score: 80 },
  { label: "x3", score: 120 },
  { label: "x1", score: 40 },
  { label: "x5", score: 200 },
  { label: "x2", score: 80 },
  { label: "x4", score: 160 },
  { label: "x1", score: 40 },
  { label: "jackpot", score: 320 }
];

const storageKey = {
  users: "aetherplay_users",
  session: "aetherplay_session",
  scores: "aetherplay_scores"
};

const getUsers = () => JSON.parse(localStorage.getItem(storageKey.users) || "[]");
const getSession = () => JSON.parse(localStorage.getItem(storageKey.session) || "null");
const getScores = () => JSON.parse(localStorage.getItem(storageKey.scores) || "[]");

const setUsers = (nextUsers) => localStorage.setItem(storageKey.users, JSON.stringify(nextUsers));
const setSession = (sessionUser) => localStorage.setItem(storageKey.session, JSON.stringify(sessionUser));
const setScores = (nextScores) => localStorage.setItem(storageKey.scores, JSON.stringify(nextScores));

const getViewRoot = () => document.getElementById("viewRoot");
const getSessionActions = () => document.getElementById("sessionActions");
const getTemplateContent = (templateId) => document.getElementById(templateId).content.cloneNode(true);

const appState = {
  route: "home",
  activeGameId: null,
  reactionStartTime: null,
  reactionTimeoutId: null,
  memorySequence: [],
  rouletteRotation: 0,
  isRouletteSpinning: false
};

const openRoute = (routeName) => {
  if (!routes.includes(routeName)) {
    return;
  }

  appState.route = routeName;
  render();
};

const getIntegerValue = (rawValue) => Number.parseInt(rawValue, 10);

const saveScore = (gameId, scoreValue) => {
  const sessionUser = getSession();

  if (!sessionUser) {
    return false;
  }

  const nextScores = [...getScores(), { gameId, scoreValue, player: sessionUser.email, playedAt: Date.now() }];

  setScores(nextScores);
  return true;
};

const renderHome = () => {
  const fragment = getTemplateContent("homeViewTemplate");
  const scores = getScores();

  fragment.getElementById("gamesCount").textContent = String(games.length);
  fragment.getElementById("playersCount").textContent = String(getUsers().length);
  fragment.getElementById("highScoreValue").textContent = String(scores.length ? Math.max(...scores.map(({ scoreValue }) => scoreValue)) : 0);

  getViewRoot().appendChild(fragment);
};

const renderGameLibrary = () => {
  const fragment = getTemplateContent("libraryViewTemplate");
  const gameGrid = fragment.getElementById("gameGrid");

  gameGrid.innerHTML = games.map(({ id, title, description }) => `
      <article class="game-card glass-panel">
        <h3>${title}</h3>
        <p class="subtle">${description}</p>
        <button class="secondary-button" data-play="${id}">Играть</button>
      </article>
    `).join("");

  getViewRoot().appendChild(fragment);
  bindGameCards();
  renderGameArena();
};

const renderLeaderboard = () => {
  const fragment = getTemplateContent("leaderboardViewTemplate");
  const leaderboardTable = fragment.getElementById("leaderboardTable");

  const topScores = getScores().sort((leftScore, rightScore) => rightScore.scoreValue - leftScore.scoreValue).slice(0, 12);

  const tableRows = topScores.map(({ gameId, player, scoreValue }, index) => `
      <div class="table-row">
        <div>${index + 1}</div>
        <div>${games.find(({ id }) => id === gameId)?.title || gameId}</div>
        <div>${player}</div>
        <div>${scoreValue}</div>
      </div>
    `).join("");

  leaderboardTable.innerHTML = `
    <div class="leaderboard-table glass-panel">
      <div class="table-row table-header">
        <div>Место</div>
        <div>Игра</div>
        <div>Игрок</div>
        <div>Очки</div>
      </div>
      ${tableRows || '<div class="table-row"><div>—</div><div>Пока нет результатов</div><div>—</div><div>—</div></div>'}
    </div>
  `;

  getViewRoot().appendChild(fragment);
};

const registerOrLogin = ({ email, password }) => {
  const users = getUsers();
  const existingUser = users.find((user) => user.email === email);

  if (!existingUser) {
    const createdUser = { email, password, createdAt: Date.now() };
    setUsers([...users, createdUser]);
    setSession({ email: createdUser.email });
    return;
  }

  if (existingUser.password !== password) {
    alert("Неверный пароль");
    return;
  }

  setSession({ email: existingUser.email });
};

const renderAccount = () => {
  const fragment = getTemplateContent("accountViewTemplate");
  const sessionUser = getSession();

  if (sessionUser) {
    fragment.getElementById("accountTitle").textContent = `Вы вошли как ${sessionUser.email}`;
    fragment.getElementById("authForm").innerHTML = '<button class="secondary-button" type="button" id="logoutButton">Выйти</button>';
  }

  getViewRoot().appendChild(fragment);

  const authForm = document.getElementById("authForm");

  authForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const email = document.getElementById("emailField").value.trim();
    const password = document.getElementById("passwordField").value;

    if (!email || !password) {
      return;
    }

    registerOrLogin({ email, password });
    render();
  });

  const logoutButton = document.getElementById("logoutButton");

  if (!logoutButton) {
    return;
  }

  logoutButton.addEventListener("click", () => {
    setSession(null);
    render();
  });
};

const renderGuessGame = (arenaNode) => {
  const target = Math.floor(Math.random() * 50) + 1;
  let attempts = 0;

  arenaNode.innerHTML = `
    <h3>Угадай число</h3>
    <div class="control-row">
      <input id="guessInput" type="number" min="1" max="50" placeholder="Введите число" />
      <button class="primary-button" id="guessButton">Проверить</button>
    </div>
    <p id="guessResult" class="subtle">Диапазон: 1-50</p>
  `;

  document.getElementById("guessButton").addEventListener("click", () => {
    const guessValue = getIntegerValue(document.getElementById("guessInput").value);

    if (!guessValue || guessValue < 1 || guessValue > 50) {
      return;
    }

    attempts += 1;

    if (guessValue === target) {
      const scoreValue = Math.max(1, 60 - attempts * 8);
      document.getElementById("guessResult").textContent = `Победа за ${attempts} ходов. Очки: ${scoreValue}`;
      saveScore("guess", scoreValue);
      return;
    }

    document.getElementById("guessResult").textContent = guessValue < target ? "Больше" : "Меньше";
  });
};

const renderReactionGame = (arenaNode) => {
  if (appState.reactionTimeoutId) {
    clearTimeout(appState.reactionTimeoutId);
  }

  arenaNode.innerHTML = `
    <h3>Реакция</h3>
    <p id="reactionStatus" class="subtle">Нажмите старт и ждите сигнал.</p>
    <div class="control-row">
      <button class="secondary-button" id="startReaction">Старт</button>
      <button class="primary-button" id="stopReaction">Нажать</button>
    </div>
  `;

  document.getElementById("startReaction").addEventListener("click", () => {
    document.getElementById("reactionStatus").textContent = "Ожидайте...";
    appState.reactionStartTime = null;

    appState.reactionTimeoutId = setTimeout(() => {
      appState.reactionStartTime = Date.now();
      document.getElementById("reactionStatus").textContent = "ЖМИ";
    }, 1200 + Math.random() * 1800);
  });

  document.getElementById("stopReaction").addEventListener("click", () => {
    if (!appState.reactionStartTime) {
      document.getElementById("reactionStatus").textContent = "Слишком рано. Попробуйте снова.";
      return;
    }

    const reactionMs = Date.now() - appState.reactionStartTime;
    const scoreValue = Math.max(1, 1000 - reactionMs);

    document.getElementById("reactionStatus").textContent = `${reactionMs} мс. Очки: ${scoreValue}`;
    saveScore("reaction", scoreValue);
  });
};

const createMemorySequence = () => Array.from({ length: 4 }, () => Math.floor(Math.random() * 9) + 1);

const renderMemoryGame = (arenaNode) => {
  appState.memorySequence = createMemorySequence();

  arenaNode.innerHTML = `
    <h3>Память</h3>
    <p class="subtle">Запомните последовательность: ${appState.memorySequence.join(" ")}</p>
    <div class="control-row">
      <input id="memoryInput" placeholder="Введите через пробел" />
      <button id="memorySubmit" class="primary-button">Проверить</button>
    </div>
    <p id="memoryStatus" class="subtle"></p>
  `;

  document.getElementById("memorySubmit").addEventListener("click", () => {
    const rawInput = document.getElementById("memoryInput").value.trim();

    if (!rawInput) {
      return;
    }

    if (rawInput !== appState.memorySequence.join(" ")) {
      document.getElementById("memoryStatus").textContent = "Почти. Перезапустите игру.";
      return;
    }

    const scoreValue = 120;

    document.getElementById("memoryStatus").textContent = `Идеально. Очки: ${scoreValue}`;
    saveScore("memory", scoreValue);
  });
};

const getRouletteWin = (absoluteAngle) => {
  const sectorAngle = 360 / rouletteSectors.length;
  const adjustedAngle = (360 - (absoluteAngle % 360)) % 360;
  const index = Math.floor(adjustedAngle / sectorAngle) % rouletteSectors.length;
  return rouletteSectors[index];
};

const renderRouletteGame = (arenaNode) => {
  arenaNode.innerHTML = `
    <h3>Рулетка</h3>
    <p class="subtle">Жми крутить и получай очки за выпавший сектор.</p>
    <div class="roulette-layout">
      <div class="roulette-wheel-wrap">
        <div class="roulette-pointer"></div>
        <div id="rouletteWheel" class="roulette-wheel"></div>
      </div>
      <div class="control-row">
        <button id="rouletteSpin" class="primary-button">Крутить рулетку</button>
      </div>
      <p id="rouletteStatus" class="subtle">Готово к запуску.</p>
    </div>
  `;

  const wheelNode = document.getElementById("rouletteWheel");
  const spinButton = document.getElementById("rouletteSpin");
  const statusNode = document.getElementById("rouletteStatus");

  wheelNode.style.transform = `rotate(${appState.rouletteRotation}deg)`;

  spinButton.addEventListener("click", () => {
    if (appState.isRouletteSpinning) {
      return;
    }

    appState.isRouletteSpinning = true;

    const extraTurns = 2160;
    const randomAngle = Math.floor(Math.random() * 360);

    appState.rouletteRotation += extraTurns + randomAngle;

    wheelNode.style.transform = `rotate(${appState.rouletteRotation}deg)`;
    statusNode.textContent = "Колесо крутится...";

    setTimeout(() => {
      const winner = getRouletteWin(appState.rouletteRotation);

      saveScore("roulette", winner.score);
      statusNode.textContent = `Выпало ${winner.label}. Очки: ${winner.score}`;
      appState.isRouletteSpinning = false;
    }, 5200);
  });
};

const renderGameArena = () => {
  const arenaNode = document.getElementById("gameArena");

  if (!appState.activeGameId) {
    arenaNode.innerHTML = '<p class="subtle">Выберите игру в каталоге.</p>';
    return;
  }

  switch (appState.activeGameId) {
    case "guess":
      renderGuessGame(arenaNode);
      return;
    case "reaction":
      renderReactionGame(arenaNode);
      return;
    case "memory":
      renderMemoryGame(arenaNode);
      return;
    case "roulette":
      renderRouletteGame(arenaNode);
      return;
    default:
      arenaNode.innerHTML = '<p class="subtle">Игра временно недоступна.</p>';
  }
};

const bindGameCards = () => {
  document.querySelectorAll("[data-play]").forEach((button) => {
    button.addEventListener("click", () => {
      appState.activeGameId = button.dataset.play;
      renderGameArena();
    });
  });
};

const renderSessionActions = () => {
  const sessionUser = getSession();
  const sessionActions = getSessionActions();

  sessionActions.innerHTML = sessionUser
    ? `<span class="session-pill"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 12a5 5 0 1 0-5-5a5 5 0 0 0 5 5Zm0 2c-4.2 0-8 2.1-8 4.7V21h16v-2.3c0-2.6-3.8-4.7-8-4.7Z"/></svg>${sessionUser.email}</span>`
    : '<button class="secondary-button" data-route="account">Войти</button>';
};

const bindRouteButtons = () => {
  document.querySelectorAll("[data-route]").forEach((button) => {
    button.addEventListener("click", () => openRoute(button.dataset.route));
    button.classList.toggle("active", button.dataset.route === appState.route);
  });
};

const render = () => {
  getViewRoot().innerHTML = "";
  renderSessionActions();

  switch (appState.route) {
    case "home":
      renderHome();
      break;
    case "library":
      renderGameLibrary();
      break;
    case "leaderboard":
      renderLeaderboard();
      break;
    case "account":
      renderAccount();
      break;
  }

  bindRouteButtons();
};

render();
