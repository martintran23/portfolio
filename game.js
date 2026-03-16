(function () {
  'use strict';

  const LAB_WIDTH = 640;
  const LAB_HEIGHT = 480;
  const PLAYER_WIDTH = 64;
  const PLAYER_HEIGHT = 80;
  const INTERACT_DISTANCE = 60;
  const MOVE_SPEED = 0.6;

  const labRoom = document.getElementById('labRoom');
  const player = document.getElementById('player');
  const playerSprite = player.querySelector('.player-sprite');
  const dialogOverlay = document.getElementById('dialogOverlay');
  const dialogText = document.getElementById('dialogText');
  const optionPrimary = document.getElementById('optionPrimary');
  const optionCancel = document.getElementById('optionCancel');
  const panelOverlay = document.getElementById('panelOverlay');
  const panelContent = document.getElementById('panelContent');
  const panelClose = document.getElementById('panelClose');

  const pokeballs = [
    { el: document.getElementById('pokeball1'), option: 'projects', primary: 'Check Projects' },
    { el: document.getElementById('pokeball2'), option: 'experience', primary: 'Check Work Experience' },
    { el: document.getElementById('pokeball3'), option: 'resume', primary: 'Check Resume' }
  ];

  let playerX = LAB_WIDTH / 2 - PLAYER_WIDTH / 2;
  let playerY = 16;
  let keys = {};
  let currentPokeball = null;
  let facing = 'up';
  let frameIndex = 1; // 0,1,2 => 1,2,3
  let frameTimer = 0;

  const FRAME_INTERVAL_MS = 120;
  const SPRITES = {
    up: [
      'assets/movingup1.png',
      'assets/movingup2.png',
      'assets/movingup3.png'
    ],
    down: [
      'assets/movingdown1.png',
      'assets/movingdown2.png',
      'assets/movingdown3.png'
    ],
    left: [
      'assets/movingleft1.png',
      'assets/movingleft2.png',
      'assets/movingleft3.png'
    ],
    right: [
      'assets/movingright1.png',
      'assets/movingright2.png',
      'assets/movingright3.png'
    ]
  };

  function setPlayerPosition(x, y) {
    playerX = Math.max(0, Math.min(LAB_WIDTH - PLAYER_WIDTH, x));
    playerY = Math.max(0, Math.min(LAB_HEIGHT - PLAYER_HEIGHT, y));
    player.style.left = playerX + 'px';
    player.style.bottom = playerY + 'px';
  }

  function getPlayerCenter() {
    return {
      x: playerX + PLAYER_WIDTH / 2,
      y: LAB_HEIGHT - playerY - PLAYER_HEIGHT / 2
    };
  }

  function distance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function updatePlayerSprite() {
    const frames = SPRITES[facing] || SPRITES.up;
    const framePath = frames[frameIndex] || frames[1];
    playerSprite.style.backgroundImage = "url('" + framePath + "')";
  }

  function getPokeballCenter(pokeballEl) {
    const rect = pokeballEl.getBoundingClientRect();
    const roomRect = labRoom.getBoundingClientRect();
    return {
      x: rect.left - roomRect.left + rect.width / 2,
      y: rect.top - roomRect.top + rect.height / 2
    };
  }

  function getClosestPokeball() {
    const center = getPlayerCenter();
    for (const { el } of pokeballs) {
      const ballCenter = getPokeballCenter(el);
      if (distance(center, ballCenter) <= INTERACT_DISTANCE) {
        return pokeballs.find(p => p.el === el);
      }
    }
    return null;
  }

  const POKEBALL_ANIMATION_MS = 600;

  function showDialog(pokeball) {
    currentPokeball = pokeball;
    optionPrimary.textContent = pokeball.primary;
    optionCancel.textContent = 'Cancel';
    pokeball.el.classList.add('pokeball--open');
    setTimeout(function () {
      if (currentPokeball === pokeball) {
        dialogOverlay.hidden = false;
      }
    }, POKEBALL_ANIMATION_MS);
  }

  function hideDialog() {
    dialogOverlay.hidden = true;
    if (currentPokeball) {
      currentPokeball.el.classList.remove('pokeball--open');
    }
    currentPokeball = null;
  }

  function openPanel(sectionId) {
    const template = document.getElementById(sectionId + 'Content');
    if (template && template.content) {
      panelContent.innerHTML = '';
      panelContent.appendChild(template.content.cloneNode(true));
    }
    if (currentPokeball) currentPokeball.el.classList.remove('pokeball--open');
    currentPokeball = null;
    dialogOverlay.hidden = true;
    panelOverlay.hidden = false;
  }

  function closePanel() {
    panelOverlay.hidden = true;
  }

  optionPrimary.addEventListener('click', function () {
    if (!currentPokeball) return;
    openPanel(currentPokeball.option);
  });

  optionCancel.addEventListener('click', hideDialog);

  panelClose.addEventListener('click', closePanel);

  panelOverlay.addEventListener('click', function (e) {
    if (e.target === panelOverlay) closePanel();
  });

  document.addEventListener('keydown', function (e) {
    keys[e.key.toLowerCase()] = true;
    if (e.key === 'e' || e.key === 'E') {
      e.preventDefault();
      if (dialogOverlay.hidden) {
        const closest = getClosestPokeball();
        if (closest) showDialog(closest);
      }
    }
    if (e.key === 'Escape') {
      if (!panelOverlay.hidden) closePanel();
      else if (!dialogOverlay.hidden) hideDialog();
    }
  });

  document.addEventListener('keyup', function (e) {
    keys[e.key.toLowerCase()] = false;
  });

  function update(deltaMs) {
    if (!dialogOverlay.hidden || !panelOverlay.hidden) return;

    let dx = 0;
    let dy = 0;
    if (keys['w']) dy += MOVE_SPEED;
    if (keys['s']) dy -= MOVE_SPEED;
    if (keys['a']) dx -= MOVE_SPEED;
    if (keys['d']) dx += MOVE_SPEED;

    const isMoving = dx !== 0 || dy !== 0;

    if (isMoving) {
      // Determine facing based on movement direction
      if (Math.abs(dy) >= Math.abs(dx)) {
        facing = dy > 0 ? 'up' : 'down';
      } else {
        facing = dx < 0 ? 'left' : 'right';
      }

      setPlayerPosition(playerX + dx, playerY + dy);

      // Advance animation frame based on time
      frameTimer += deltaMs;
      if (frameTimer >= FRAME_INTERVAL_MS) {
        frameTimer = 0;
        frameIndex = (frameIndex + 1) % 3; // 0 → 1 → 2 → 0
      }
    } else {
      // Not moving: use middle (stationary) frame
      frameIndex = 1;
      frameTimer = 0;
    }

    updatePlayerSprite();
  }

  setPlayerPosition(playerX, playerY);
  // Initial sprite: facing up, stationary (movingup2)
  facing = 'up';
  frameIndex = 1;
  updatePlayerSprite();

  let lastTimestamp = performance.now();
  function gameLoop(timestamp) {
    const deltaMs = timestamp - lastTimestamp;
    lastTimestamp = timestamp;
    update(deltaMs);
    requestAnimationFrame(gameLoop);
  }

  requestAnimationFrame(gameLoop);
})();
