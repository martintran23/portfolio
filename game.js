(function () {
  'use strict';

  const LAB_WIDTH = 640;
  const LAB_HEIGHT = 480;
  const PLAYER_WIDTH = 24;
  const PLAYER_HEIGHT = 32;
  const INTERACT_DISTANCE = 60;
  const MOVE_SPEED = 4;

  const labRoom = document.getElementById('labRoom');
  const player = document.getElementById('player');
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

  function showDialog(pokeball) {
    currentPokeball = pokeball;
    optionPrimary.textContent = pokeball.primary;
    optionCancel.textContent = 'Cancel';
    dialogOverlay.hidden = false;
  }

  function hideDialog() {
    dialogOverlay.hidden = true;
    currentPokeball = null;
  }

  function openPanel(sectionId) {
    const template = document.getElementById(sectionId + 'Content');
    if (template && template.content) {
      panelContent.innerHTML = '';
      panelContent.appendChild(template.content.cloneNode(true));
    }
    panelOverlay.hidden = false;
    hideDialog();
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

  function update() {
    if (!dialogOverlay.hidden || !panelOverlay.hidden) return;

    let dx = 0;
    let dy = 0;
    if (keys['w']) dy += MOVE_SPEED;
    if (keys['s']) dy -= MOVE_SPEED;
    if (keys['a']) dx -= MOVE_SPEED;
    if (keys['d']) dx += MOVE_SPEED;

    if (dx !== 0 || dy !== 0) {
      setPlayerPosition(playerX + dx, playerY + dy);
      player.classList.toggle('facing-left', dx < 0);
      player.classList.toggle('facing-right', dx > 0);
    }
  }

  setPlayerPosition(playerX, playerY);
  setInterval(update, 1000 / 60);
})();
