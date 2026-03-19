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

  const pokeballs = [
    { el: document.getElementById('pokeball1'), option: 'projects', primary: 'Check Projects' },
    { el: document.getElementById('pokeball2'), option: 'experience', primary: 'Check Work Experience' },
    { el: document.getElementById('pokeball3'), option: 'resume', primary: 'Check Resume' }
  ];

  let playerX = LAB_WIDTH / 2 - PLAYER_WIDTH / 2;
  let playerY = 16;
  let keys = {};
  let currentPokeball = null;
  // Intro stages:
  // 0 = Emulating screen
  // 1 = Controls screen
  // 2 = Finished (lab active)
  let introStage = 0;
  let inputEnabled = false;
  let introTransitioning = false; // prevent multiple intro transitions from rapid clicks
  let trainerOpen = false;
  let facing = 'up';
  let frameIndex = 1; // 0,1,2 => 1,2,3
  let frameTimer = 0;
  let lastMoveTime = performance.now();
  let idleHintShown = false;
  let lastSpritePath = '';
  let dialogTypeTimer = null;
  let dialogTypeFullText = '';
  let dialogTypeIdx = 0;

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

    // Debug: log player coordinates for tuning collision/blockers
    console.log('player pos:', playerX, playerY);

    // Update last movement time whenever the player position actually changes
    lastMoveTime = performance.now();
    idleHintShown = false;
  }

  function getPlayerCenter() {
    return {
      x: playerX + PLAYER_WIDTH / 2,
      y: LAB_HEIGHT - playerY - PLAYER_HEIGHT / 2
    };
  }

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

  function distance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function stopDialogTyping() {
    if (dialogTypeTimer) {
      clearInterval(dialogTypeTimer);
      dialogTypeTimer = null;
    }
  }

  function typeDialogText(text, stepMs = 18) {
    stopDialogTyping();
    dialogTypeFullText = text;
    dialogTypeIdx = 0;
    dialogText.textContent = '';

    dialogTypeTimer = setInterval(function () {
      if (dialogTypeIdx >= dialogTypeFullText.length) {
        stopDialogTyping();
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
    return {
      x: rect.left - roomRect.left + rect.width / 2,
      y: rect.top - roomRect.top + rect.height / 2
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

  const POKEBALL_ANIMATION_MS = 600;

  function showDialog(pokeball) {
    currentPokeball = pokeball;
    optionPrimary.textContent = pokeball.primary;
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
    optionCancel.hidden = false;
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

  function advanceIntro() {
    if (!introOverlay) {
      inputEnabled = true;
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
  }

  // If the user clicks the dialog while it's typing, finish instantly (Pokémon-style).
  if (dialogOverlay) {
    dialogOverlay.addEventListener('click', function (e) {
      // Don't interfere with button clicks; only handle background/text clicks.
      if (e.target && e.target.closest && e.target.closest('button')) return;
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

    // Toggle Trainer Card (Q)
    if (e.key === 'q' || e.key === 'Q') {
      e.preventDefault();
      trainerOpen = !trainerOpen;
      if (trainerOverlay) trainerOverlay.hidden = !trainerOpen;
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
      if (dialogOverlay.hidden) {
        const closest = getClosestPokeball();
        if (closest) {
          showDialog(closest);
        } else if (isAtLeftBookshelf()) {
          // Flavor text when examining the left bookshelf
          currentPokeball = null;

          // Only show a single Close button for this interaction
          optionSecondary.hidden = true;
          optionCancel.hidden = true;
          optionPrimary.textContent = 'Close';
          typeDialogText(
            'These shelves are packed with Jurassic Park and Jurassic World DVDs... I could rewatch that series forever!'
          );
          dialogOverlay.hidden = false;

          // Make the primary button just close the dialog in this mode
          optionPrimary.onclick = function () {
            dialogOverlay.hidden = true;
            optionPrimary.onclick = null;
            optionCancel.hidden = false; // restore cancel visibility for next dialogs
          };
        } else if (isAtPc()) {
          // PC interaction: two-step message
          currentPokeball = null;

          optionSecondary.hidden = true;
          optionCancel.hidden = true;
          optionPrimary.textContent = 'Next';
          typeDialogText('Booting up the PC...');
          dialogOverlay.hidden = false;

          optionPrimary.onclick = function () {
            typeDialogText(
              'There are games installed: Pokémon, Roblox, and Valorant... but the Valorant client looks out of date.'
            );
            optionPrimary.textContent = 'Close';

            optionPrimary.onclick = function () {
              dialogOverlay.hidden = true;
              optionPrimary.onclick = null;
              optionCancel.hidden = false;
            };
          };
        } else if (isAtRightBookshelf()) {
          // Flavor text when examining the right bookshelf
          currentPokeball = null;

          // Only show a single Close button for this interaction
          optionSecondary.hidden = true;
          optionCancel.hidden = true;
          optionPrimary.textContent = 'Close';
          typeDialogText(
            'Looks like a whole shelf of weightlifting and training manuals... I should probably follow a routine like this someday.'
          );
          dialogOverlay.hidden = false;

          optionPrimary.onclick = function () {
            dialogOverlay.hidden = true;
            optionPrimary.onclick = null;
            optionCancel.hidden = false;
          };
        } else if (isAtGenerator()) {
          // Flavor text when examining the generator (egg incubator)
          currentPokeball = null;

          optionSecondary.hidden = true;
          optionCancel.hidden = true;
          optionPrimary.textContent = 'Close';
          typeDialogText(
            'It looks like a high-tech egg incubator... the label says “Latios.” Whatever is inside must be incredibly special.'
          );
          dialogOverlay.hidden = false;

          optionPrimary.onclick = function () {
            dialogOverlay.hidden = true;
            optionPrimary.onclick = null;
            optionCancel.hidden = false;
          };
        }
      }
    }
    if (e.key === 'Escape') {
      if (!panelOverlay.hidden) closePanel();
      else if (!dialogOverlay.hidden) hideDialog();
    }
  });

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
    const deltaMs = timestamp - lastTimestamp;
    lastTimestamp = timestamp;

    // Check for idle hint: if the player hasn't moved in 60 seconds
    // and no dialog/panel is open, show a one-time textbox.
    const now = performance.now();
    if (
      dialogOverlay.hidden &&
      panelOverlay.hidden &&
      !idleHintShown &&
      now - lastMoveTime > 60000
    ) {
      idleHintShown = true;
      currentPokeball = null;

      optionSecondary.hidden = true;
      optionCancel.hidden = true;
      optionPrimary.textContent = 'Close';
      typeDialogText('I hope I find a job soon...');
      dialogOverlay.hidden = false;

      optionPrimary.onclick = function () {
        dialogOverlay.hidden = true;
        optionPrimary.onclick = null;
        optionCancel.hidden = false;
      };
    }

    update(deltaMs);
    requestAnimationFrame(gameLoop);
  }

  requestAnimationFrame(gameLoop);
})();
