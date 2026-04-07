(function () {
  'use strict';

  const LAB_WIDTH = 640;
  const LAB_HEIGHT = 480;
  const PLAYER_WIDTH = 64;
  const PLAYER_HEIGHT = 80;
  const INTERACT_DISTANCE = 60;
  const MOVE_SPEED_PC = 0.5;
  const MOVE_SPEED_MOBILE = 1.6;

  const labRoom = document.getElementById('labRoom');
  const player = document.getElementById('player');
  const playerSprite = player.querySelector('.player-sprite');
  const introOverlay = document.getElementById('introOverlay');
  const introEmu = document.getElementById('introEmu');
  const introEmuText = document.getElementById('introEmuText');
  const introControls = document.getElementById('introControls');
  const introLoadingImg = document.querySelector('.intro-loading');
  const dialogOverlay = document.getElementById('dialogOverlay');
  const dialogText = document.getElementById('dialogText');
  const optionPrimary = document.getElementById('optionPrimary');
  const optionSecondary = document.getElementById('optionSecondary');
  const optionCancel = document.getElementById('optionCancel');
  const panelOverlay = document.getElementById('panelOverlay');
  const panelContent = document.getElementById('panelContent');
  const panelClose = document.getElementById('panelClose');
  const trainerOverlay = document.getElementById('trainerOverlay');
  const touchControls = document.getElementById('touchControls');
  const touchInteract = document.getElementById('touchInteract');
  const touchTrainer = document.getElementById('touchTrainer');
  const gameContainer = document.querySelector('.game-container');
  const zoomInBtn = document.getElementById('zoomInBtn');
  const zoomOutBtn = document.getElementById('zoomOutBtn');
  const zoomLabel = document.getElementById('zoomLabel');

  const pokeballs = [
    { el: document.getElementById('pokeball1'), option: 'projects', primary: 'Check Projects' },
    { el: document.getElementById('pokeball2'), option: 'experience', primary: 'Check Work Experience' },
    { el: document.getElementById('pokeball3'), option: 'resume', primary: 'Check Resume' }
  ];

  let playerX = LAB_WIDTH / 2 - PLAYER_WIDTH / 2;
  let playerY = 16;
  let keys = {};
  let currentPokeball = null;
  const BASE_ZOOM = 0.8; // Treat previous 80% as the new "100%"
  const MIN_ZOOM = 0.75;
  const MAX_ZOOM = 1.25;
  const ZOOM_STEP = 0.05;
  let playerZoom = 1;
  // Intro stages:
  // 0 = Emulating screen
  // 1 = Controls screen
  // 2 = Finished (lab active)
  let introStage = 0;
  let inputEnabled = false;
  let introTransitioning = false; // prevent multiple intro transitions from rapid clicks
  let trainerOpen = false;
  let touchMovementActive = false;
  function setTouchControlsEnabled(enabled) {
    if (!touchControls) return;
    touchControls.style.display = enabled ? '' : 'none';
    touchControls.setAttribute('aria-hidden', enabled ? 'false' : 'true');
  }
  // Keep touch controls hidden until intro/loading/control screens are finished.
  setTouchControlsEnabled(false);
  function toggleTrainerCard() {
    trainerOpen = !trainerOpen;
    if (trainerOverlay) trainerOverlay.hidden = !trainerOpen;
  }

  function tryInteract() {
    if (!inputEnabled) return;
    if (!dialogOverlay.hidden || !panelOverlay.hidden || currentPokeball || trainerOpen) return;

    const closest = getClosestPokeball();
    if (closest) {
      showDialog(closest);
      return;
    }

    if (facing === 'up' && isAtTopWallControlsSpot()) {
      currentPokeball = null;
      optionSecondary.hidden = true;
      optionCancel.hidden = true;
      optionPrimary.hidden = true;
      optionPrimary.textContent = 'Read';
      typeDialogText(
        'This clipboard seems to have some instructions on it.',
        18,
        function () {
          optionPrimary.hidden = false;
          optionCancel.hidden = false;
          allowDialogSkip = true;
        }
      );
      allowDialogSkip = false;
      dialogOverlay.hidden = false;

      optionPrimary.onclick = function () {
        optionPrimary.onclick = null;
        optionCancel.hidden = false;
        openPanel('controls');
      };
      return;
    }

    if (isAtLeftBookshelf()) {
      // Flavor text when examining the left bookshelf
      currentPokeball = null;

      // Only show a single Close button for this interaction
      optionSecondary.hidden = true;
      optionCancel.hidden = true;
      optionPrimary.hidden = true;
      optionPrimary.textContent = 'Close';
      typeDialogText(
        'These shelves are packed with Jurassic Park and Jurassic World DVDs... I could rewatch that series forever!',
        18,
        function () {
          optionPrimary.hidden = false;
          allowDialogSkip = true;
        }
      );
      allowDialogSkip = false;
      dialogOverlay.hidden = false;

      // Make the primary button just close the dialog in this mode
      optionPrimary.onclick = function () {
        dialogOverlay.hidden = true;
        optionPrimary.onclick = null;
        optionCancel.hidden = false; // restore cancel visibility for next dialogs
      };
      return;
    }

    if (isAtPc()) {
      // PC interaction: two-step message
      currentPokeball = null;

      optionSecondary.hidden = true;
      optionCancel.hidden = true;
      optionPrimary.hidden = true;
      optionPrimary.textContent = 'Next';
      typeDialogText('Booting up the PC...', 18, function () {
        optionPrimary.hidden = false;
        allowDialogSkip = true;
      });
      allowDialogSkip = false;
      dialogOverlay.hidden = false;

      optionPrimary.onclick = function () {
        optionPrimary.hidden = true;
        typeDialogText(
          'There are games installed: Pokémon, Roblox, and Valorant... but the Valorant client looks out of date.',
          18,
          function () {
            optionPrimary.hidden = false;
            allowDialogSkip = true;
          }
        );
        allowDialogSkip = false;
        optionPrimary.textContent = 'Close';

        optionPrimary.onclick = function () {
          dialogOverlay.hidden = true;
          optionPrimary.onclick = null;
          optionCancel.hidden = false;
        };
      };
      return;
    }

    if (isAtRightBookshelf()) {
      // Flavor text when examining the right bookshelf
      currentPokeball = null;

      // Only show a single Close button for this interaction
      optionSecondary.hidden = true;
      optionCancel.hidden = true;
      optionPrimary.hidden = true;
      optionPrimary.textContent = 'Close';
      typeDialogText(
        'Looks like a whole shelf of weightlifting and training manuals... I should probably follow a routine like this someday.',
        18,
        function () {
          optionPrimary.hidden = false;
          allowDialogSkip = true;
        }
      );
      allowDialogSkip = false;
      dialogOverlay.hidden = false;

      optionPrimary.onclick = function () {
        dialogOverlay.hidden = true;
        optionPrimary.onclick = null;
        optionCancel.hidden = false;
      };
      return;
    }

    if (isAtGenerator()) {
      // Flavor text when examining the generator (egg incubator)
      currentPokeball = null;

      optionSecondary.hidden = true;
      optionCancel.hidden = true;
      optionPrimary.hidden = true;
      optionPrimary.textContent = 'Close';
      typeDialogText(
        'It looks like a high-tech egg incubator... the label says “Latios.” Whatever is inside must be incredibly special.',
        18,
        function () {
          optionPrimary.hidden = false;
          allowDialogSkip = true;
        }
      );
      allowDialogSkip = false;
      dialogOverlay.hidden = false;

      optionPrimary.onclick = function () {
        dialogOverlay.hidden = true;
        optionPrimary.onclick = null;
        optionCancel.hidden = false;
      };
    }
  }
  let facing = 'up';
  let frameIndex = 1; // 0,1,2 => 1,2,3
  let frameTimer = 0;
  let lastMoveTime = performance.now();
  let idleHintShown = false;
  let idleHintDialogOpen = false;
  // Match CSS initial frame so first updatePlayerSprite() does not reset backgroundImage
  let lastSpritePath = 'assets/movingup2.png';
  let dialogTypeTimer = null;
  let dialogTypeFullText = '';
  let dialogTypeIdx = 0;
  let dialogTypeOnDone = null;
  let allowDialogSkip = true;

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

  (function preloadPlayerSprites() {
    const urls = new Set();
    Object.keys(SPRITES).forEach(function (dir) {
      SPRITES[dir].forEach(function (url) {
        urls.add(url);
      });
    });
    urls.forEach(function (url) {
      const img = new Image();
      img.src = url;
    });
  })();

  function setPlayerPosition(x, y) {
    playerX = Math.max(0, Math.min(LAB_WIDTH - PLAYER_WIDTH, x));
    playerY = Math.max(0, Math.min(LAB_HEIGHT - PLAYER_HEIGHT, y));
    player.style.left = playerX + 'px';
    player.style.bottom = playerY + 'px';

    // Update last movement time whenever the player position actually changes
    lastMoveTime = performance.now();
    idleHintShown = false;
  }

  function getPlayerFeet() {
    return {
      x: playerX + PLAYER_WIDTH / 2,
      y: playerY
    };
  }

  function getPlayerCenter() {
    return {
      x: playerX + PLAYER_WIDTH / 2,
      y: LAB_HEIGHT - playerY - PLAYER_HEIGHT / 2
    };
  }

  function logPlayerPosition(label) {
    const feet = getPlayerFeet();
    const center = getPlayerCenter();
    console.log('[player-pos]' + (label ? ' ' + label : ''), {
      x: +playerX.toFixed(2),
      y: +playerY.toFixed(2),
      feetX: +feet.x.toFixed(2),
      feetY: +feet.y.toFixed(2),
      centerX: +center.x.toFixed(2),
      centerY: +center.y.toFixed(2),
      facing: facing
    });
  }

  // Handy for designing new interaction hitboxes in the lab.
  window.__labDebug = {
    getPlayerPosition: function () {
      return {
        x: playerX,
        y: playerY,
        feet: getPlayerFeet(),
        center: getPlayerCenter(),
        facing: facing
      };
    },
    logPlayerPosition: logPlayerPosition
  };

  // Helper to check if the player is standing in front of the left bookshelf
  function isAtLeftBookshelf() {
    // Use the player's feet position (same coordinate system as BLOCKERS)
    const footX = playerX + PLAYER_WIDTH / 2;
    const footY = playerY;

    // Front row in front of left bookshelf:
    // Loosened bounds so it's easier to trigger when you're
    // pressed up against the shelves.
    const FRONT_MIN_X = 0;
    const FRONT_MAX_X = 260;
    const FRONT_MIN_Y = 80;
    const FRONT_MAX_Y = 140;

    return (
      footX >= FRONT_MIN_X &&
      footX <= FRONT_MAX_X &&
      footY >= FRONT_MIN_Y &&
      footY <= FRONT_MAX_Y
    );
  }

  // Helper to check if the player is standing in front of the right bookshelf
  function isAtRightBookshelf() {
    const footX = playerX + PLAYER_WIDTH / 2;
    const footY = playerY;

    // Front row in front of right bookshelf: tuned to right blocker region
    const FRONT_MIN_X = 380;
    const FRONT_MAX_X = LAB_WIDTH;
    const FRONT_MIN_Y = 80;
    const FRONT_MAX_Y = 140;

    return (
      footX >= FRONT_MIN_X &&
      footX <= FRONT_MAX_X &&
      footY >= FRONT_MIN_Y &&
      footY <= FRONT_MAX_Y
    );
  }

  // Helper to check if the player is standing in front of the generator (egg incubator)
  function isAtGenerator() {
    const footX = playerX + PLAYER_WIDTH / 2;
    const footY = playerY;

    // Front row in front of the generator area
    // Based loosely on the generator BLOCKER (x 0–150.8, y 255.4–366.4)
    const FRONT_MIN_X = 40;
    const FRONT_MAX_X = 160;
    const FRONT_MIN_Y = 220;
    const FRONT_MAX_Y = 260;

    return (
      footX >= FRONT_MIN_X &&
      footX <= FRONT_MAX_X &&
      footY >= FRONT_MIN_Y &&
      footY <= FRONT_MAX_Y
    );
  }

  // Helper to check if the player is standing at the top PC area
  function isAtPc() {
    const footX = playerX + PLAYER_WIDTH / 2;
    const footY = playerY;

    // Centered around player pos: 109.2, 400 with generous leniency
    // so it's easy to trigger when up against the top counter.
    const MIN_X = 110;  // narrowed another 10px from the left
    const MAX_X = 170;  // extended another 10px further to the right
    const MIN_Y = 385;  // raised bottom edge by another 5
    const MAX_Y = 430;

    return (
      footX >= MIN_X &&
      footX <= MAX_X &&
      footY >= MIN_Y &&
      footY <= MAX_Y
    );
  }

  // Debug/utility interaction: a spot on the top wall that opens a controls panel.
  // Calibrated from logged positions:
  // { feetX: 294..330, feetY: 400 } when facing the top wall.
  function isAtTopWallControlsSpot() {
    const footX = playerX + PLAYER_WIDTH / 2;
    const footY = playerY;

    const MIN_X = 292;
    const MAX_X = 332;
    const MIN_Y = 395;
    const MAX_Y = 410;

    return (
      footX >= MIN_X &&
      footX <= MAX_X &&
      footY >= MIN_Y &&
      footY <= MAX_Y
    );
  }

  function distance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function stopDialogTyping() {
    if (dialogTypeTimer) {
      clearInterval(dialogTypeTimer);
      dialogTypeTimer = null;
    }
  }

  function typeDialogText(text, stepMs = 18, onDone = null) {
    stopDialogTyping();
    dialogTypeFullText = text;
    dialogTypeIdx = 0;
    dialogTypeOnDone = onDone;
    dialogText.textContent = '';

    dialogTypeTimer = setInterval(function () {
      if (dialogTypeIdx >= dialogTypeFullText.length) {
        stopDialogTyping();
        if (dialogTypeOnDone) {
          const done = dialogTypeOnDone;
          dialogTypeOnDone = null;
          done();
        }
        return;
      }
      dialogText.textContent += dialogTypeFullText.charAt(dialogTypeIdx);
      dialogTypeIdx += 1;
    }, stepMs);
  }

  function finishDialogTyping() {
    if (!dialogTypeTimer) return false;
    stopDialogTyping();
    dialogText.textContent = dialogTypeFullText;
    if (dialogTypeOnDone) {
      const done = dialogTypeOnDone;
      dialogTypeOnDone = null;
      done();
    }
    return true;
  }

  // Rectangular "no-walk" zones in room coordinates (bottom/left origin).
  const BLOCKERS = [
    // Left bookshelf region (already tuned and "perfect")
    // Top edge:    y ≈ 188.8
    // Bottom edge: y ≈ 97.2
    // Left edge:   x = 0 (left wall)
    // Right edge:  x ≈ 245.2
    {
      left: 0,
      bottom: 97.2,
      width: 245.2,
      height: 188.8 - 97.2
    },
    // Right bookshelf region based on your new measurements:
    // Bottom edge: y ≈ 96.8
    // Top edge:    y ≈ 189.2
    // Left edge:   x ≈ 384.6
    // Right edge:  room right border (LAB_WIDTH)
    {
      left: 384.6,
      bottom: 96.8,
      width: LAB_WIDTH - 384.6,
      height: 189.2 - 96.8
    },
    // Generator area:
    // Top edge:    y ≈ 366.4
    // Bottom edge: y ≈ 255.4
    // Left edge:   x = 0
    // Right edge:  x ≈ 150.8
    {
      left: 0,
      bottom: 255.4,
      width: 150.8,
      height: 366.4 - 255.4
    },
    // Small block above the generator (left side)
    // Right edge: x ≈ 53.0
    // Left edge:  x = 0
    // Bottom:     y ≈ 366.4 (same as generator top)
    // Top:        y ≈ 392.2
    {
      left: 0,
      bottom: 366.4,
      width: 53.0,
      height: 392.2 - 366.4
    },
    // Poké Ball table area:
    // Top edge:    y ≈ 338.4 (raised 2px)
    // Bottom edge: y ≈ 265.0 (raised another 10px)
    // Left edge:   x ≈ 386.2 (nudged 2px right)
    // Right edge:  x ≈ 517.6 (increased another 2px)
    {
      left: 386.2,
      bottom: 265.0,
      width: 517.6 - 386.2,
      height: 338.4 - 265.0
    }
  ];

  function rectsIntersect(a, b) {
    return !(
      a.left + a.width <= b.left ||
      a.left >= b.left + b.width ||
      a.bottom + a.height <= b.bottom ||
      a.bottom >= b.bottom + b.height
    );
  }

  function isBlocked(nextX, nextY) {
    // Use a smaller hitbox at the player's feet so hair/hat
    // can overlap furniture without blocking movement.
    const FOOT_HITBOX_HEIGHT = 10;
    const playerRect = {
      left: nextX + PLAYER_WIDTH * 0.25,
      bottom: nextY,
      width: PLAYER_WIDTH * 0.5,
      height: FOOT_HITBOX_HEIGHT
    };
    for (const block of BLOCKERS) {
      if (rectsIntersect(playerRect, block)) return true;
    }
    return false;
  }

  function updatePlayerSprite() {
    const frames = SPRITES[facing] || SPRITES.up;
    const framePath = frames[frameIndex] || frames[1];
    // Only update the sprite when the actual frame image changes.
    // This avoids unnecessary repaints that can cause flicker.
    if (framePath !== lastSpritePath) {
      lastSpritePath = framePath;
      playerSprite.style.backgroundImage = "url('" + framePath + "')";
    }
  }

  function getPokeballCenter(pokeballEl) {
    const rect = pokeballEl.getBoundingClientRect();
    const roomRect = labRoom.getBoundingClientRect();
    const scaleX = roomRect.width / LAB_WIDTH || 1;
    const scaleY = roomRect.height / LAB_HEIGHT || 1;
    return {
      // Convert screen pixels back into room coordinates so distance checks
      // stay accurate regardless of container zoom level.
      x: (rect.left - roomRect.left + rect.width / 2) / scaleX,
      y: (rect.top - roomRect.top + rect.height / 2) / scaleY
    };
  }

  function getClosestPokeball() {
    const center = getPlayerCenter();
    let closest = null;
    let closestDist = Infinity;

    for (const pb of pokeballs) {
      const ballCenter = getPokeballCenter(pb.el);
      const d = distance(center, ballCenter);
      if (d <= INTERACT_DISTANCE && d < closestDist) {
        closestDist = d;
        closest = pb;
      }
    }

    return closest;
  }

  const POKEBALL_ANIMATION_MS = 500;

  function showDialog(pokeball) {
    currentPokeball = pokeball;
    optionPrimary.textContent = pokeball.primary;
    optionPrimary.hidden = false;
    // Reset dialog state so it doesn't reuse custom handlers/visibility
    optionPrimary.onclick = null;      // use default listener for Poké Balls
    optionCancel.hidden = false;
    optionSecondary.hidden = true;
    dialogTypeFullText = 'Choose an option.';
    dialogText.textContent = ''; // will type when shown

    if (pokeball.option === 'resume') {
      optionSecondary.textContent = 'Download Resume';
      optionSecondary.hidden = false;
    } else {
      optionSecondary.hidden = true;
    }
    allowDialogSkip = true;
    pokeball.el.classList.add('pokeball--open');
    setTimeout(function () {
      if (currentPokeball === pokeball) {
        dialogOverlay.hidden = false;
        typeDialogText(dialogTypeFullText);
      }
    }, POKEBALL_ANIMATION_MS);
  }

  function hideDialog() {
    stopDialogTyping();
    dialogOverlay.hidden = true;
    if (currentPokeball) {
      currentPokeball.el.classList.remove('pokeball--open');
    }
    currentPokeball = null;
    // Restore default button state so the next dialog isn't affected
    optionPrimary.onclick = null;
    optionPrimary.hidden = false;
    optionCancel.hidden = false;
    allowDialogSkip = true;
    idleHintDialogOpen = false;
  }

  function applyContainerScale() {
    if (!gameContainer) return;
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;
    const fitScale = Math.min(viewportW / LAB_WIDTH, viewportH / LAB_HEIGHT);
    const totalScale = fitScale * BASE_ZOOM * playerZoom;
    // Snap to small increments to reduce fractional-scale blur artifacts.
    const snappedScale = Math.round(totalScale * 20) / 20;
    gameContainer.style.transform = 'scale(' + snappedScale.toFixed(2) + ')';
  }

  function updateZoomUI() {
    applyContainerScale();
    if (zoomLabel) {
      zoomLabel.textContent = Math.round(playerZoom * 100) + '%';
    }
    if (zoomInBtn) zoomInBtn.disabled = playerZoom >= MAX_ZOOM;
    if (zoomOutBtn) zoomOutBtn.disabled = playerZoom <= MIN_ZOOM;
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
    if (currentPokeball.option === 'resume') {
      window.open('assets/resume.pdf', '_blank');
      hideDialog();
      return;
    }
    openPanel(currentPokeball.option);
  });

  optionSecondary.addEventListener('click', function () {
    if (!currentPokeball || currentPokeball.option !== 'resume') return;
    // Force a download of the PDF using a temporary anchor
    const link = document.createElement('a');
    link.href = 'assets/resume.pdf';
    link.download = 'Martin_Tran_Resume.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    hideDialog();
  });

  optionCancel.addEventListener('click', hideDialog);

  panelClose.addEventListener('click', closePanel);

  panelOverlay.addEventListener('click', function (e) {
    if (e.target === panelOverlay) closePanel();
  });

  const ZOOM_HOLD_DELAY_MS = 350;
  const ZOOM_HOLD_INTERVAL_MS = 90;
  let zoomHoldTimeout = null;
  let zoomHoldInterval = null;

  function clearZoomHold() {
    if (zoomHoldTimeout !== null) {
      clearTimeout(zoomHoldTimeout);
      zoomHoldTimeout = null;
    }
    if (zoomHoldInterval !== null) {
      clearInterval(zoomHoldInterval);
      zoomHoldInterval = null;
    }
  }

  function bumpZoomIn() {
    playerZoom = Math.min(MAX_ZOOM, +(playerZoom + ZOOM_STEP).toFixed(2));
    updateZoomUI();
  }

  function bumpZoomOut() {
    playerZoom = Math.max(MIN_ZOOM, +(playerZoom - ZOOM_STEP).toFixed(2));
    updateZoomUI();
  }

  function attachZoomHold(btn, dir) {
    if (!btn) return;
    const bump = dir > 0 ? bumpZoomIn : bumpZoomOut;
    const atLimit = function () {
      return dir > 0 ? playerZoom >= MAX_ZOOM : playerZoom <= MIN_ZOOM;
    };

    btn.addEventListener('click', function (e) {
      if (e.detail !== 0) return;
      if (atLimit()) return;
      bump();
    });

    btn.addEventListener('pointerdown', function (e) {
      if (e.button !== 0 && e.button !== -1) return;
      e.preventDefault();
      if (atLimit()) return;
      bump();
      clearZoomHold();
      zoomHoldTimeout = setTimeout(function () {
        zoomHoldTimeout = null;
        zoomHoldInterval = setInterval(function () {
          if (atLimit()) {
            clearZoomHold();
            return;
          }
          bump();
        }, ZOOM_HOLD_INTERVAL_MS);
      }, ZOOM_HOLD_DELAY_MS);
    });

    function endZoomHold() {
      clearZoomHold();
    }
    btn.addEventListener('pointerup', endZoomHold);
    btn.addEventListener('pointercancel', endZoomHold);
    btn.addEventListener('pointerleave', endZoomHold);
  }

  attachZoomHold(zoomInBtn, 1);
  attachZoomHold(zoomOutBtn, -1);

  window.addEventListener('blur', clearZoomHold);
  window.addEventListener('resize', applyContainerScale);

  function advanceIntro() {
    if (!introOverlay) {
      inputEnabled = true;
      setTouchControlsEnabled(true);
      return;
    }

    // If a transition animation between intro screens is already running,
    // ignore additional clicks/keys until it finishes.
    if (introTransitioning) return;

    if (introStage === 0) {
      // Emulating -> effect -> Controls screen
      if (introEmu) introEmu.hidden = true;
      introTransitioning = true;

      // Add centered expanding Poké Ball effect
      const effect = document.createElement('img');
      effect.src = 'assets/Loading.png';
      effect.alt = '';
      effect.className = 'intro-effect';
      introOverlay.appendChild(effect);

      setTimeout(function () {
        // Remove effect and show controls, as long as intro not already finished.
        if (effect.parentNode) {
          effect.parentNode.removeChild(effect);
        }
        if (!introOverlay.hidden && introControls) {
          introControls.hidden = false;
          introStage = 1;
        }
        introTransitioning = false;
      }, 1000); // effect duration (1s), < 3s total
    } else if (introStage === 1) {
      // Controls -> game
      introOverlay.hidden = true;
      introStage = 2;
      inputEnabled = true;
      setTouchControlsEnabled(true);
    }
  }

  if (introOverlay) {
    // Prevent dragging the loading icon during the intro/transition.
    if (introLoadingImg) {
      introLoadingImg.addEventListener('dragstart', function (e) {
        e.preventDefault();
      });
    }

    introOverlay.addEventListener('click', advanceIntro);
    // Typewriter effect for "Emulating..."
    if (introEmuText) {
      const full = 'Emulating...';
      const stepMs = 120;
      const holdMs = 1000;

      function runTypewriter() {
        introEmuText.textContent = '';
        let idx = 0;
        const timer = setInterval(function () {
          if (idx >= full.length) {
            clearInterval(timer);
            // After the full text is shown, wait a bit, then restart.
            setTimeout(function () {
              // Only loop while we're still on the Emulating screen.
              if (introStage === 0 && introOverlay && !introOverlay.hidden) {
                runTypewriter();
              }
            }, holdMs);
            return;
          }
          introEmuText.textContent += full.charAt(idx);
          idx += 1;
        }, stepMs);
      }

      runTypewriter();
    }
  } else {
    inputEnabled = true;
    setTouchControlsEnabled(true);
  }

  // If the user clicks the dialog while it's typing, finish instantly (Pokémon-style).
  if (dialogOverlay) {
    dialogOverlay.addEventListener('click', function (e) {
      // Don't interfere with button clicks; only handle background/text clicks.
      if (e.target && e.target.closest && e.target.closest('button')) return;
      if (!allowDialogSkip) return;
      finishDialogTyping();
    });
  }

  document.addEventListener('keydown', function (e) {
    // While intro is active, only allow advancing it.
    if (!inputEnabled) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'e' || e.key === 'E') {
        e.preventDefault();
        advanceIntro();
      }
      return;
    }

    // Debug: log player position (press P).
    if (e.key === 'p' || e.key === 'P') {
      e.preventDefault();
      logPlayerPosition('manual');
      return;
    }

    // Toggle Trainer Card (Q), or dismiss idle-hint dialog and show card (user isn't AFK)
    if (e.key === 'q' || e.key === 'Q') {
      e.preventDefault();
      if (idleHintDialogOpen) {
        hideDialog();
        trainerOpen = true;
        if (trainerOverlay) trainerOverlay.hidden = false;
        return;
      }
      toggleTrainerCard();
      return;
    }

    // If Trainer Card is open, block all other gameplay interactions.
    if (trainerOpen) {
      if (e.key === 'Escape' && trainerOverlay) {
        trainerOpen = false;
        trainerOverlay.hidden = true;
      }
      e.preventDefault();
      return;
    }

    keys[e.key.toLowerCase()] = true;
    if (e.key === 'e' || e.key === 'E') {
      e.preventDefault();
      tryInteract();
    }
    if (e.key === 'Escape') {
      if (!panelOverlay.hidden) closePanel();
      else if (!dialogOverlay.hidden) hideDialog();
    }
  });

  // Touch controls (mobile)
  if (touchControls) {
    const dpadButtons = touchControls.querySelectorAll('[data-key]');

    function setKey(key, isDown) {
      keys[key] = isDown;
    }

    dpadButtons.forEach(function (btn) {
      const key = btn.getAttribute('data-key');
      const down = function (e) {
        e.preventDefault();
        if (!inputEnabled || trainerOpen) return;
        touchMovementActive = true;
        setKey(key, true);
      };
      const up = function (e) {
        e.preventDefault();
        touchMovementActive = false;
        setKey(key, false);
      };

      btn.addEventListener('pointerdown', down);
      btn.addEventListener('pointerup', up);
      btn.addEventListener('pointercancel', up);
      btn.addEventListener('pointerleave', up);
    });

    if (touchInteract) {
      touchInteract.addEventListener('pointerdown', function (e) {
        e.preventDefault();
        tryInteract();
      });
    }

    if (touchTrainer) {
      touchTrainer.addEventListener('pointerdown', function (e) {
        e.preventDefault();
        if (!inputEnabled) return;
        if (idleHintDialogOpen) {
          hideDialog();
          trainerOpen = true;
          if (trainerOverlay) trainerOverlay.hidden = false;
          return;
        }
        toggleTrainerCard();
      });
    }
  }

  document.addEventListener('keyup', function (e) {
    if (!inputEnabled) return;
    keys[e.key.toLowerCase()] = false;
  });

  function update(deltaMs) {
    // Freeze movement while intro is active, while any dialog/panel is open,
    // or while a Poké Ball interaction is in progress (during its opening animation).
    if (trainerOpen || !inputEnabled || !dialogOverlay.hidden || !panelOverlay.hidden || currentPokeball) return;

    let dx = 0;
    let dy = 0;
    const activeMoveSpeed = touchMovementActive ? MOVE_SPEED_MOBILE : MOVE_SPEED_PC;
    if (keys['w']) dy += activeMoveSpeed;
    if (keys['s']) dy -= activeMoveSpeed;
    if (keys['a']) dx -= activeMoveSpeed;
    if (keys['d']) dx += activeMoveSpeed;

    const isMoving = dx !== 0 || dy !== 0;

    if (isMoving) {
      // Determine facing based on movement direction
      if (Math.abs(dy) >= Math.abs(dx)) {
        facing = dy > 0 ? 'up' : 'down';
      } else {
        facing = dx < 0 ? 'left' : 'right';
      }

      const nextX = playerX + dx;
      const nextY = playerY + dy;
      if (!isBlocked(nextX, nextY)) {
        setPlayerPosition(nextX, nextY);
      }

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
    const rawDelta = timestamp - lastTimestamp;
    lastTimestamp = timestamp;
    const deltaMs = rawDelta <= 0 ? 0 : Math.min(rawDelta, 100);

    // Check for idle hint: if the player hasn't moved in 2 minutes
    // and no dialog/panel is open, show a one-time textbox.
    const now = performance.now();
    if (
      dialogOverlay.hidden &&
      panelOverlay.hidden &&
      !idleHintShown &&
      now - lastMoveTime > 120000
    ) {
      idleHintShown = true;
      currentPokeball = null;

      optionSecondary.hidden = true;
      optionCancel.hidden = true;
      optionPrimary.hidden = true;
      optionPrimary.textContent = 'Close';
      typeDialogText('I hope I find a job soon...', 18, function () {
        optionPrimary.hidden = false;
        allowDialogSkip = true;
      });
      allowDialogSkip = false;
      dialogOverlay.hidden = false;
      idleHintDialogOpen = true;

      optionPrimary.onclick = function () {
        hideDialog();
      };
    }

    update(deltaMs);
    requestAnimationFrame(gameLoop);
  }

  requestAnimationFrame(gameLoop);
  updateZoomUI();
})();
