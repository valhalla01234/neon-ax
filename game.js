(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;

  const playerRadius = 14;
  const enemyRadius = 18;
  const keyRadius = 10;
  const playerSpeed = 3;

  const menu = document.getElementById('menu');
  const startBtn = document.getElementById('startBtn');
  const startInfo = document.getElementById('startInfo');
  const infoBar = document.getElementById('info');
  const colorSelect = document.getElementById('colorSelect');
  const modeSelect = document.getElementById('modeSelect');
  const timerDisplay = document.getElementById('timer');
  const menuHighScore = document.getElementById('menuHighScore');
  const newRecordMsg = document.getElementById('newRecordMsg');

  const gameOverDiv = document.getElementById('gameOver');
  const levelUpDiv = document.getElementById('levelUp');
  const confirmQuitDiv = document.getElementById('confirmQuit');

  let player = { x: width/2, y: height/2, dirX:0, dirY:0 };
  let enemies = [];
  let keys = [];

  let keysPressed = {};
  let score = 0;
  let highScores = { classic: 0, timed: 0 };
  let level = 1;
  let gameOver = false;
  let levelUp = false;
  let invulnerable = true;
  let movedOnce = false;
  let inMenu = true;
  let collectedKeys = 0;
  let recordBeaten = false;

  let currentMode = 'classic';
  let timedModeTime = 30; // seconds
  let timedModeTimer = timedModeTime;
  let timedInterval = null;

  // For menu option selection indexes
  let gameOverSelection = 0;
  let levelUpSelection = 0;
  let confirmQuitSelection = 0;

  // Player customization state
  let playerColor = 'blue';

  // Load all high scores from localStorage
  function loadHighScores() {
    const classicScore = localStorage.getItem('neonEscapeHighScore_classic');
    const timedScore = localStorage.getItem('neonEscapeHighScore_timed');
    highScores.classic = classicScore ? parseInt(classicScore) : 0;
    highScores.timed = timedScore ? parseInt(timedScore) : 0;
    updateMenuHighScore();
    updateInfoHighScore();
  }

  // Update high score display in menu for current mode
  function updateMenuHighScore() {
    const scoreVal = highScores[currentMode] || 0;
    menuHighScore.innerText = "High Score: " + scoreVal;
  }

  // Update high score display in info bar for current mode
  function updateInfoHighScore() {
    const scoreVal = highScores[currentMode] || 0;
    document.getElementById('highScore').innerText = scoreVal;
  }

  // Save high score for current mode
  function saveHighScore() {
    if(score > (highScores[currentMode] || 0)) {
      highScores[currentMode] = score;
      localStorage.setItem('neonEscapeHighScore_' + currentMode, score);
      updateMenuHighScore();
      updateInfoHighScore();
      recordBeaten = true;
    } else {
      recordBeaten = false;
    }
  }

  function distance(x1,y1,x2,y2) {
    return Math.hypot(x2-x1, y2-y1);
  }
  function randomSpeed() {
    let s = Math.random()*2 + 1;
    return Math.random() < 0.5 ? s : -s;
  }

  // Spawn enemies
  function spawnEnemies(count) {
    enemies = [];
    for(let i=0; i<count; i++) {
      let ex, ey;
      let tries=0;
      do {
        ex = Math.random()*(width-2*enemyRadius)+enemyRadius;
        ey = Math.random()*(height-2*enemyRadius)+enemyRadius;
        tries++;
        if(tries>500) break;
      } while(
        distance(ex, ey, player.x, player.y) < 120 || 
        keys.some(c => distance(ex, ey, c.x, c.y) < 60)
      );
      enemies.push({
        x: ex,
        y: ey,
        speedX: randomSpeed(),
        speedY: randomSpeed(),
        radius: enemyRadius,
      });
    }
  }
  // Spawn keys
  function spawnKeys(count) {
    keys = [];
    collectedKeys = 0;
    for(let i=0; i<count; i++) {
      let kx, ky;
      let tries = 0;
      do {
        kx = Math.random()*(width-2*keyRadius)+keyRadius;
        ky = Math.random()*(height-2*keyRadius)+keyRadius;
        tries++;
        if(tries>500) break;
      } while(
        distance(kx, ky, player.x, player.y) < 80 || 
        keys.some(c => distance(kx, ky, c.x, c.y) < 60) ||
        enemies.some(e => distance(kx, ky, e.x, e.y) < 60)
      );
      keys.push({x: kx, y: ky, radius: keyRadius});
    }
    updateCollectedKeys();
  }
  // Spawn single key (for Timed mode)
  function spawnSingleKey() {
    keys = [];
    let kx, ky;
    let tries = 0;
    do {
      kx = Math.random()*(width-2*keyRadius)+keyRadius;
      ky = Math.random()*(height-2*keyRadius)+keyRadius;
      tries++;
      if(tries>500) break;
    } while(
      distance(kx, ky, player.x, player.y) < 80 || 
      enemies.some(e => distance(kx, ky, e.x, e.y) < 60)
    );
    keys.push({x: kx, y: ky, radius: keyRadius});
    updateCollectedKeys();
  }

  // Player movement
  function movePlayer() {
    if(gameOver || levelUp || inMenu) return;
    player.dirX = 0; player.dirY = 0;
    if(keysPressed['arrowup'] || keysPressed['w']) player.dirY = -1;
    if(keysPressed['arrowdown'] || keysPressed['s']) player.dirY = 1;
    if(keysPressed['arrowleft'] || keysPressed['a']) player.dirX = -1;
    if(keysPressed['arrowright'] || keysPressed['d']) player.dirX = 1;
    if(player.dirX !== 0 || player.dirY !== 0) {
      if(!movedOnce) {
        movedOnce = true;
        invulnerable = false;
        hideStartInfo();
      }
      let len = Math.hypot(player.dirX, player.dirY);
      player.dirX /= len;
      player.dirY /= len;
      let nx = player.x + player.dirX * playerSpeed;
      let ny = player.y + player.dirY * playerSpeed;
      if(nx-playerRadius < 0) nx = playerRadius;
      if(nx+playerRadius > width) nx = width - playerRadius;
      if(ny-playerRadius < 0) ny = playerRadius;
      if(ny+playerRadius > height) ny = height - playerRadius;
      player.x = nx;
      player.y = ny;
    }
  }

  // Move enemies randomly
  function moveEnemies() {
    if(gameOver || levelUp || inMenu) return;
    enemies.forEach(e => {
      if(Math.random() < 0.02) {
        e.speedX = randomSpeed();
        e.speedY = randomSpeed();
      }
      e.x += e.speedX;
      e.y += e.speedY;
      if(e.x - enemyRadius < 0) { e.x = enemyRadius; e.speedX *= -1; }
      if(e.x + enemyRadius > width) { e.x = width - enemyRadius; e.speedX *= -1; }
      if(e.y - enemyRadius < 0) { e.y = enemyRadius; e.speedY *= -1; }
      if(e.y + enemyRadius > height) { e.y = height - enemyRadius; e.speedY *= -1; }
    });
  }

  // Collision detection
  function checkCollisions() {
    if(gameOver || levelUp || inMenu) return;

    if(!invulnerable) {
      for(let e of enemies) {
        if(distance(player.x, player.y, e.x, e.y) < playerRadius + e.radius) {
          triggerGameOver();
          return;
        }
      }
    }

    for(let i=keys.length-1; i>=0; i--) {
      if(distance(player.x, player.y, keys[i].x, keys[i].y) < playerRadius + keys[i].radius) {
        keys.splice(i,1);
        score += 10;
        collectedKeys++;
        updateScore();
        updateCollectedKeys();

        if(currentMode === 'classic') {
          if(collectedKeys >= 5) {
            triggerLevelUp();
          }
        } else if(currentMode === 'timed') {
          spawnSingleKey();
          timedModeTimer = timedModeTime;
          updateTimerDisplay();
        }
      }
    }
  }

  // Draw player with simple eyes and customizable color
  function drawPlayer() {
    ctx.save();
    ctx.translate(player.x, player.y);

    // Player body
    ctx.fillStyle = playerColor;
    ctx.shadowColor = playerColor;
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(0, 0, playerRadius, 0, Math.PI*2);
    ctx.fill();

    // Eyes - simple white circles
    ctx.fillStyle = '#fff';
    ctx.shadowColor = '#fff';
    ctx.shadowBlur = 5;
    const eyeRadius = 5;
    const eyeSpacing = 10;
    ctx.beginPath();
    ctx.ellipse(-eyeSpacing/2, 0, eyeRadius, eyeRadius*1.2, 0, 0, Math.PI*2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(eyeSpacing/2, 0, eyeRadius, eyeRadius*1.2, 0, 0, Math.PI*2);
    ctx.fill();

    ctx.restore();
  }

  // Draw enemies as neon purple circles (space alien style)
  function drawEnemies() {
    enemies.forEach(e => {
      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.fillStyle = '#a200ff';
      ctx.shadowColor = '#a200ff';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(0, 0, e.radius, 0, Math.PI*2);
      ctx.fill();
      ctx.restore();
    });
  }

  // Draw keys (green squares)
  function drawKeys() {
    keys.forEach(k => {
      ctx.save();
      ctx.translate(k.x, k.y);
      ctx.fillStyle = '#0f0';
      ctx.shadowColor = '#0f0';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      const size = k.radius * 2;
      ctx.fillRect(-k.radius, -k.radius, size, size);
      ctx.restore();
    });
  }

  function clearScreen() {
    ctx.clearRect(0, 0, width, height);
  }

  // Update displayed score, level, collected keys
  function updateScore() {
    document.getElementById('score').innerText = score;
    updateInfoHighScore();
  }
  function updateLevel() {
    document.getElementById('level').innerText = level;
  }
  function updateCollectedKeys() {
    document.getElementById('collected').innerText = collectedKeys;
  }
  function updateTimerDisplay() {
    timerDisplay.innerText = "Time: " + timedModeTimer;
  }

  // Show start info overlay
  function showStartInfo() {
    startInfo.style.display = 'block';
  }
  function hideStartInfo() {
    startInfo.style.display = 'none';
  }

  // Reset game for current mode
  function resetGame() {
    currentMode = modeSelect.value;
    playerColor = colorSelect.value;
    recordBeaten = false;

    score = 0;
    level = 1;
    collectedKeys = 0;
    movedOnce = false;
    invulnerable = true;
    player.x = width/2;
    player.y = height/2;
    player.dirX = 0;
    player.dirY = 0;

    if(currentMode === 'classic') {
      spawnEnemies(level + 2);
      spawnKeys(5);
      timerDisplay.style.display = 'none';
      if(timedInterval) {
        clearInterval(timedInterval);
        timedInterval = null;
      }
    } else if(currentMode === 'timed') {
      spawnEnemies(15);
      spawnSingleKey();
      timedModeTimer = timedModeTime;
      timerDisplay.style.display = 'inline-block';
      startTimedModeTimer();
    }

    gameOver = false;
    levelUp = false;
    inMenu = false;
    updateScore();
    updateLevel();
    updateCollectedKeys();
    updateMenuHighScore();

    showStartInfo();

    // Focus canvas for controls
    canvas.focus();
  }

  // Timed mode countdown
  function startTimedModeTimer() {
    if(timedInterval) clearInterval(timedInterval);
    timedInterval = setInterval(() => {
      if(gameOver || levelUp || inMenu) {
        clearInterval(timedInterval);
        timedInterval = null;
        return;
      }
      timedModeTimer--;
      updateTimerDisplay();
      if(timedModeTimer <= 0) {
        triggerGameOver();
      }
    }, 1000);
  }

  // Level up handler
  function triggerLevelUp() {
    levelUp = true;
    inMenu = true;
    levelUpSelection = 0;
    levelUpDiv.style.display = 'block';
    infoBar.style.display = 'none';
    startInfo.style.display = 'none';
    gameOverDiv.style.display = 'none';
    confirmQuitDiv.style.display = 'none';

    saveHighScore();

    updateLevel();
  }

  // Game over handler
  function triggerGameOver() {
    gameOver = true;
    inMenu = true;
    gameOverSelection = 0;
    gameOverDiv.style.display = 'block';
    infoBar.style.display = 'none';
    startInfo.style.display = 'none';
    levelUpDiv.style.display = 'none';
    confirmQuitDiv.style.display = 'none';

    saveHighScore();

    if(recordBeaten) {
      newRecordMsg.style.display = 'block';
    } else {
      newRecordMsg.style.display = 'none';
    }

    if(timedInterval) {
      clearInterval(timedInterval);
      timedInterval = null;
    }
  }

  // Draw everything
  function draw() {
    clearScreen();

    // Draw keys
    drawKeys();

    // Draw enemies
    drawEnemies();

    // Draw player
    drawPlayer();
  }

  // Main game loop
  function gameLoop() {
    if(!gameOver && !levelUp && !inMenu) {
      movePlayer();
      moveEnemies();
      checkCollisions();
    }
    draw();
    requestAnimationFrame(gameLoop);
  }

  // Menu key navigation helper
  function updateSelectionHighlight(container, selectedIndex) {
    const options = container.querySelectorAll('.option');
    options.forEach((opt, idx) => {
      if(idx === selectedIndex) opt.classList.add('selected');
      else opt.classList.remove('selected');
    });
  }

  // Handle keyboard input
  document.addEventListener('keydown', e => {
    if(inMenu) {
      if(gameOverDiv.style.display === 'block') {
        // Game Over menu navigation
        if(e.key === 'ArrowUp') {
          e.preventDefault();
          gameOverSelection = (gameOverSelection + 1) % 2;
          updateSelectionHighlight(gameOverDiv, gameOverSelection);
        } else if(e.key === 'ArrowDown') {
          e.preventDefault();
          gameOverSelection = (gameOverSelection + 1) % 2;
          updateSelectionHighlight(gameOverDiv, gameOverSelection);
        } else if(e.key === 'Enter') {
          e.preventDefault();
          const options = gameOverDiv.querySelectorAll('.option');
          const action = options[gameOverSelection].dataset.action;
          if(action === 'retry') {
            gameOverDiv.style.display = 'none';
            resetGame();
            infoBar.style.display = 'block';
            startInfo.style.display = 'block';
          } else if(action === 'menu') {
            gameOverDiv.style.display = 'none';
            showMenu();
          }
        }
      } else if(levelUpDiv.style.display === 'block') {
        // Level Up menu navigation
        if(e.key === 'ArrowUp') {
          e.preventDefault();
          levelUpSelection = (levelUpSelection + 1) % 2;
          updateSelectionHighlight(levelUpDiv, levelUpSelection);
        } else if(e.key === 'ArrowDown') {
          e.preventDefault();
          levelUpSelection = (levelUpSelection + 1) % 2;
          updateSelectionHighlight(levelUpDiv, levelUpSelection);
        } else if(e.key === 'Enter') {
          e.preventDefault();
          const options = levelUpDiv.querySelectorAll('.option');
          const action = options[levelUpSelection].dataset.action;
          if(action === 'next') {
            levelUpDiv.style.display = 'none';
            level++;
            spawnEnemies(level + 2);
            spawnKeys(5);
            collectedKeys = 0;
            score += 50; // bonus for level up
            updateScore();
            updateLevel();
            levelUp = false;
            inMenu = false;
            invulnerable = true;
            movedOnce = false;
            player.x = width/2;
            player.y = height/2;
            player.dirX = 0;
            player.dirY = 0;
            showStartInfo();
            infoBar.style.display = 'block';
            if(currentMode === 'timed') {
              timedModeTimer = timedModeTime;
              updateTimerDisplay();
              startTimedModeTimer();
            } else {
              timerDisplay.style.display = 'none';
              if(timedInterval) {
                clearInterval(timedInterval);
                timedInterval = null;
              }
            }
          } else if(action === 'menu') {
            levelUpDiv.style.display = 'none';
            showMenu();
          }
        }
      } else if(confirmQuitDiv.style.display === 'block') {
        if(e.key === 'ArrowUp' || e.key === 'ArrowDown') {
          e.preventDefault();
          confirmQuitSelection = 1 - confirmQuitSelection;
          updateSelectionHighlight(confirmQuitDiv, confirmQuitSelection);
        } else if(e.key === 'Enter') {
          e.preventDefault();
          const options = confirmQuitDiv.querySelectorAll('.option');
          const action = options[confirmQuitSelection].dataset.action;
          if(action === 'yes') {
            confirmQuitDiv.style.display = 'none';
            showMenu();
          } else {
            confirmQuitDiv.style.display = 'none';
            inMenu = false;
            infoBar.style.display = 'block';
            if(currentMode === 'timed' && timedInterval === null) {
              startTimedModeTimer();
            }
          }
        }
      }
    } else {
      // Gameplay key controls for movement and quitting
      if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d'].includes(e.key.toLowerCase())) {
        keysPressed[e.key.toLowerCase()] = true;
      }
      if(e.key === 'Escape') {
        e.preventDefault();
        pauseAndConfirmQuit();
      }
    }
  });

  document.addEventListener('keyup', e => {
    if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d'].includes(e.key.toLowerCase())) {
      keysPressed[e.key.toLowerCase()] = false;
    }
  });

  // Start button click
  startBtn.addEventListener('click', () => {
    hideMenu();
    resetGame();
    infoBar.style.display = 'block';
    startInfo.style.display = 'block';
    canvas.focus();
  });

  // Mode select change updates menu high score display and player color
  modeSelect.addEventListener('change', () => {
    currentMode = modeSelect.value;
    updateMenuHighScore();
    updateInfoHighScore();
  });
  colorSelect.addEventListener('change', () => {
    playerColor = colorSelect.value;
  });

  // Show menu
  function showMenu() {
    inMenu = true;
    menu.style.display = 'block';
    gameOverDiv.style.display = 'none';
    levelUpDiv.style.display = 'none';
    confirmQuitDiv.style.display = 'none';
    infoBar.style.display = 'none';
    startInfo.style.display = 'none';
    updateMenuHighScore();
  }
  // Hide menu
  function hideMenu() {
    inMenu = false;
    menu.style.display = 'none';
  }

  // Pause game and show confirm quit
  function pauseAndConfirmQuit() {
    if(inMenu || gameOver || levelUp) return;
    inMenu = true;
    confirmQuitSelection = 0;
    confirmQuitDiv.style.display = 'block';
    infoBar.style.display = 'none';
    startInfo.style.display = 'none';
    if(timedInterval) {
      clearInterval(timedInterval);
      timedInterval = null;
    }
  }

  // Initialize
  loadHighScores();
  showMenu();

  // Start the game loop
  gameLoop();

})();
