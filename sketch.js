let Engine = Matter.Engine;
let World = Matter.World;
let Bodies = Matter.Bodies;
let Body = Matter.Body;
let Events = Matter.Events;
let engine;
let world;
let walls = [];
let player;
let bullets = [];
let fishes = [];
let pirates = [];
let bosses = [];
let gameState = 'intro';
let startButton;
let level = 1;
let fishCount = 0;
let pirateCount = 0;
let maxAmmo = 50;
let ammo = maxAmmo;
let playerHealth = 20;
let bossActive = false;
let scoreTargetFish = 20;
let scoreTargetPirates = 20;
let fishThisLevel = 0;
let piratesThisLevel = 0;
let levelTarget = 20;
let radarSize = 180;
let lastSpawn = 0;
let spawnInterval = 120;
let levelText = '';
let nextLevelText = '';
let continueButton;
let pendingLevelChange = null;
let bossSpawned = false;
let canvasWidth = 1000;
let canvasHeight = 650;

function setup() {
  let canvas = createCanvas(windowWidth, windowHeight);
  canvas.parent('game-container');
  engine = Engine.create();
  world = engine.world;
  world.gravity.y = 0;
  createBoundaries();
  setupPlayer();
  resetGame();
  updateStartButton();
  Events.on(engine, 'collisionStart', handleCollisions);
}

function createBoundaries() {
  if (walls.length) {
    World.remove(world, walls);
  }
  walls = [
    Bodies.rectangle(width / 2, -10, width, 20, { isStatic: true, label: 'wall', restitution: 1 }),
    Bodies.rectangle(width / 2, height + 10, width, 20, { isStatic: true, label: 'wall', restitution: 1 }),
    Bodies.rectangle(-10, height / 2, 20, height, { isStatic: true, label: 'wall', restitution: 1 }),
    Bodies.rectangle(width + 10, height / 2, 20, height, { isStatic: true, label: 'wall', restitution: 1 }),
  ];
  World.add(world, walls);
}

function setupPlayer() {
  player = Bodies.rectangle(width / 2, height / 2, 50, 50, { label: 'player', frictionAir: 0.2, restitution: 0.8 });
  player.health = playerHealth;
  player.score = 0;
  player.catchRadius = 80;
  player.netRadius = 110;
  player.lastShot = 0;
  World.add(world, player);
}

function resetGame() {
  fishCount = 0;
  pirateCount = 0;
  fishThisLevel = 0;
  piratesThisLevel = 0;
  ammo = maxAmmo;
  playerHealth = 20;
  player.health = playerHealth;
  level = 1;
  fishes = [];
  pirates = [];
  bosses = [];
  bullets = [];
  bossActive = false;
  bossSpawned = false;
  spawnInterval = 120;
  levelText = 'Level 1: Catch 20 fish AND defeat 15 pirates';
  while (world.bodies.length > walls.length + 1) {
    let body = world.bodies[world.bodies.length - 1];
    World.remove(world, body);
  }
}

function touchStarted() {
  if (gameState === 'intro' && mouseX >= startButton.x && mouseX <= startButton.x + startButton.w && mouseY >= startButton.y && mouseY <= startButton.y + startButton.h) {
    gameState = 'play';
    let startSound = document.getElementById('startSound');
    if (startSound) {
      startSound.currentTime = 0;
      startSound.play().catch(err => console.log('Sound play failed:', err));
    }
  }

  if (gameState === 'levelComplete' && continueButton && mouseX >= continueButton.x && mouseX <= continueButton.x + continueButton.w && mouseY >= continueButton.y && mouseY <= continueButton.y + continueButton.h) {
    continueToNextLevel();
  }

  return false;
}

function mousePressed() {
  return touchStarted();
}

function draw() {
  background(8, 27, 45);
  if (gameState === 'intro') {
    drawIntro();
    return;
  }

  if (gameState === 'gameOver') {
    drawGameOver();
    return;
  }

  if (gameState === 'victory') {
    drawVictory();
    return;
  }

  if (gameState === 'levelComplete') {
    drawLevelComplete();
    return;
  }

  Engine.update(engine);
  drawPlayArea();
  handleInput();
  spawnEntities();
  updateEntities();
  drawRadar();
  drawUI();
  checkLevelProgress();
}

function drawIntro() {
  updateStartButton();
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(52);
  text('Oshin Mission', width / 2, height / 2 - 80);
  textSize(20);
  text('Touch or click START to sail and catch fish while fighting pirates.', width / 2, height / 2 - 30);
  fill(4, 132, 255);
  rect(startButton.x, startButton.y, startButton.w, startButton.h, 12);
  fill(255);
  textSize(28);
  text('START', width / 2, startButton.y + startButton.h / 2);
}

function drawGameOver() {
  fill(255, 80, 80);
  textAlign(CENTER, CENTER);
  textSize(52);
  text('Game Over', width / 2, height / 2 - 30);
  textSize(24);
  text('Refresh to play again.', width / 2, height / 2 + 20);
}

function drawLevelComplete() {
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(48);
  text('Level Complete!', width / 2, height / 2 - 80);
  textSize(24);
  text(nextLevelText, width / 2, height / 2 - 30);

  continueButton = {
    x: width / 2 - 130,
    y: height / 2 + 20,
    w: 260,
    h: 60,
  };

  fill(4, 132, 255);
  rect(continueButton.x, continueButton.y, continueButton.w, continueButton.h, 12);
  fill(255);
  textSize(28);
  text('Continue', width / 2, continueButton.y + continueButton.h / 2);
}

function drawVictory() {
  fill(144, 255, 140);
  textAlign(CENTER, CENTER);
  textSize(48);
  text('Victory!', width / 2, height / 2 - 20);
  textSize(22);
  text('You have defeated the bosses and completed the mission.', width / 2, height / 2 + 30);
}

function drawPlayArea() {
  fill(12, 37, 70);
  noStroke();
  rect(0, 0, width, height);

  fill(20, 56, 103, 120);
  for (let x = 0; x < width; x += 30) {
    line(x, 0, x, height);
  }
  for (let y = 0; y < height; y += 30) {
    line(0, y, width, y);
  }
}

function handleInput() {
  let moveSpeed = 0.06;
  if (keyIsDown(LEFT_ARROW)) {
    Body.applyForce(player, player.position, { x: -moveSpeed, y: 0 });
  }
  if (keyIsDown(RIGHT_ARROW)) {
    Body.applyForce(player, player.position, { x: moveSpeed, y: 0 });
  }
  if (keyIsDown(UP_ARROW)) {
    Body.applyForce(player, player.position, { x: 0, y: -moveSpeed });
  }
  if (keyIsDown(DOWN_ARROW)) {
    Body.applyForce(player, player.position, { x: 0, y: moveSpeed });
  }
  if ((keyIsDown(32) || keyWentDown(32)) && frameCount - player.lastShot > 12 && ammo > 0) {
    fireBullet();
  }
}

function keyWentDown(keyCode) {
  return keyIsPressed && keyCode === keyCode && keyIsDown(keyCode);
}

function fireBullet() {
  let bullet = Bodies.circle(player.position.x, player.position.y, 6, {
    label: 'bullet',
    restitution: 0.9,
    frictionAir: 0.005,
  });
  bullet.time = 0;
  bullet.bounced = false;
  let speed = 24;
  let angle;
  if (abs(player.velocity.x) < 0.2 && abs(player.velocity.y) < 0.2) {
    angle = -PI / 2;
  } else {
    angle = atan2(player.velocity.y, player.velocity.x);
  }
  Body.setVelocity(bullet, { x: cos(angle) * speed, y: sin(angle) * speed });
  bullets.push(bullet);
  World.add(world, bullet);
  ammo -= 1;
  player.lastShot = frameCount;
  // play shooting sound if available
  let s = document.getElementById('shootSound');
  if (s) {
    s.currentTime = 0;
    s.play().catch(err => console.log('Shoot sound failed:', err));
  }
}

function spawnEntities() {
  if (frameCount - lastSpawn > spawnInterval && !bossActive) {
    lastSpawn = frameCount;
    if (random() < 0.55) {
      spawnFish();
    } else {
      spawnPirate();
    }
  }
}

function spawnFish() {
  let pos = randomSpawnPosition();
  let fish = Bodies.circle(pos.x, pos.y, 14, { label: 'fish', frictionAir: 0.03, restitution: 0.8 });
  fish.hp = level === 1 ? 1 : 5;
  fish.isBoss = false;
  fish.speed = level === 1 ? 1.0 : 1.3;
  fish.canAttack = level >= 2;
  fish.detected = false;
  fishes.push(fish);
  World.add(world, fish);
}

function spawnPirate() {
  let pos = randomSpawnPosition();
  let pirate = Bodies.circle(pos.x, pos.y, 18, { label: 'pirate', frictionAir: 0.02, restitution: 0.8 });
  pirate.hp = 1;
  pirate.shootTimer = 0;
  pirate.detected = false;
  pirates.push(pirate);
  World.add(world, pirate);
}

function randomSpawnPosition() {
  let margin = 80;
  let edge = floor(random(4));
  switch (edge) {
    case 0: return { x: random(margin, width - margin), y: margin };
    case 1: return { x: random(margin, width - margin), y: height - margin };
    case 2: return { x: margin, y: random(margin, height - margin) };
    default: return { x: width - margin, y: random(margin, height - margin) };
  }
}

function updateEntities() {
  drawPlayer();
  updateFish();
  updatePirates();
  updateBosses();
  updateBullets();
  detectFishingNet();
  enforcePlayerBounds();
}

function drawPlayer() {
  push();
  translate(player.position.x, player.position.y);
  rotate(player.angle);
  fill(255, 205, 60);
  rectMode(CENTER);
  rect(0, 0, 50, 50, 8);
  fill(12, 56, 115);
  triangle(-22, 10, 22, 10, 0, 28);
  pop();

  noFill();
  stroke(120, 240, 255, 120);
  strokeWeight(2);
  circle(player.position.x, player.position.y, player.netRadius * 2);
}

function updateFish() {
  for (let i = fishes.length - 1; i >= 0; i--) {
    let fish = fishes[i];
    let d = dist(fish.position.x, fish.position.y, player.position.x, player.position.y);
    if (fish.canAttack && d < 260) {
      let force = Matter.Vector.normalise({ x: player.position.x - fish.position.x, y: player.position.y - fish.position.y });
      Body.applyForce(fish, fish.position, { x: force.x * 0.0004 * fish.speed, y: force.y * 0.0004 * fish.speed });
    } else {
      let wander = p5.Vector.random2D().mult(0.00015);
      Body.applyForce(fish, fish.position, { x: wander.x, y: wander.y });
    }
    drawFish(fish);
    if (fish.position.x < -100 || fish.position.x > width + 100 || fish.position.y < -100 || fish.position.y > height + 100) {
      World.remove(world, fish);
      fishes.splice(i, 1);
    }
  }
}

function drawFish(fish) {
  push();
  translate(fish.position.x, fish.position.y);
  rotate(fish.angle);
  fill(110, 210, 255);
  ellipse(0, 0, 26, 16);
  fill(255);
  ellipse(6, -4, 6, 6);
  fill(15, 55, 88);
  ellipse(7, -4, 3, 3);
  pop();
}

function updatePirates() {
  for (let i = pirates.length - 1; i >= 0; i--) {
    let pirate = pirates[i];
    let d = dist(pirate.position.x, pirate.position.y, player.position.x, player.position.y);
    let direction = Matter.Vector.normalise({ x: player.position.x - pirate.position.x, y: player.position.y - pirate.position.y });
    Body.applyForce(pirate, pirate.position, { x: direction.x * 0.00035, y: direction.y * 0.00035 });
    if (d < 240 && pirate.shootTimer < frameCount) {
      pirateShoot(pirate);
      pirate.shootTimer = frameCount + 90;
    }
    drawPirate(pirate);
    if (pirate.position.x < -100 || pirate.position.x > width + 100 || pirate.position.y < -100 || pirate.position.y > height + 100) {
      World.remove(world, pirate);
      pirates.splice(i, 1);
    }
  }
}

function pirateShoot(pirate) {
  let bullet = Bodies.circle(pirate.position.x, pirate.position.y, 6, { label: 'pirateBullet', restitution: 0.8, frictionAir: 0.01 });
  let direction = Matter.Vector.normalise({ x: player.position.x - pirate.position.x, y: player.position.y - pirate.position.y });
  Body.setVelocity(bullet, { x: direction.x * 9, y: direction.y * 9 });
  bullets.push(bullet);
  World.add(world, bullet);
}

function drawPirate(pirate) {
  push();
  translate(pirate.position.x, pirate.position.y);
  rotate(pirate.angle);
  fill(255, 80, 80);
  ellipse(0, 0, 36, 36);
  fill(30, 30, 30);
  rectMode(CENTER);
  rect(0, 0, 22, 12, 4);
  pop();
}

function updateBosses() {
  if (level >= 3 && bosses.length === 0) {
    spawnBosses();
  }
  for (let i = bosses.length - 1; i >= 0; i--) {
    let boss = bosses[i];
    let direction = Matter.Vector.normalise({ x: player.position.x - boss.position.x, y: player.position.y - boss.position.y });
    // boss.speed controls movement force; default stronger than regular pirates
    let speedFactor = boss.speed || 0.0008;
    Body.applyForce(boss, boss.position, { x: direction.x * speedFactor, y: direction.y * speedFactor });

    // boss shooting: fire triple shots with a spread
    if (!boss.shootTimer) boss.shootTimer = 0;
    if (!boss.shootInterval) boss.shootInterval = 120;
    if (frameCount > boss.shootTimer) {
      bossShoot(boss);
      boss.shootTimer = frameCount + boss.shootInterval;
    }

    drawBoss(boss);
    if (boss.position.x < -200 || boss.position.x > width + 200 || boss.position.y < -200 || boss.position.y > height + 200) {
      World.remove(world, boss);
      bosses.splice(i, 1);
    }
  }
}

function spawnBosses() {
  bossActive = true;
  bossSpawned = true;
  bosses = [];
  if (level === 3) {
    let boss = Bodies.circle(width / 2, 80, 40, { label: 'bossPirate', frictionAir: 0.01, restitution: 0.8 });
    boss.hp = 25;
    boss.speed = 0.0012; // faster movement
    boss.shootInterval = 90; // faster shooting rhythm
    bosses.push(boss);
    World.add(world, boss);
    levelText = 'Boss 1: Hit the pirate 25 times';
  } else if (level === 4) {
    let boss = Bodies.circle(width / 2, 80, 42, { label: 'bossPirate2', frictionAir: 0.01, restitution: 0.8 });
    boss.hp = 25;
    boss.speed = 0.0010;
    boss.shootInterval = 100;
    bosses.push(boss);
    let bossFish = Bodies.circle(width / 2, height - 80, 42, { label: 'bossFish', frictionAir: 0.01, restitution: 0.8 });
    bossFish.hp = 25;
    bossFish.speed = 0.0009;
    bossFish.shootInterval = 140;
    bosses.push(bossFish);
    World.add(world, boss);
    World.add(world, bossFish);
    levelText = 'Boss 2: Defeat the pirate and giant fish';
  }
  bossSpawned = true;
}

function drawBoss(boss) {
  push();
  translate(boss.position.x, boss.position.y);
  rotate(boss.angle);
  if (boss.label.includes('bossPirate')) {
    fill(220, 60, 60);
    ellipse(0, 0, boss.circleRadius * 2, boss.circleRadius * 2);
    fill(0);
    rect(-16, 0, 32, 18, 6);
  } else {
    fill(90, 220, 170);
    ellipse(0, 0, boss.circleRadius * 2, boss.circleRadius * 2);
    fill(255);
    ellipse(12, -8, 10, 10);
    fill(0);
    ellipse(13, -8, 5, 5);
  }
  // draw health bar above boss
  noStroke();
  let barW = boss.circleRadius * 2.4;
  let barH = 8;
  let hp = boss.hp || 0;
  let maxHp = 25;
  let pct = constrain(hp / maxHp, 0, 1);
  push();
  translate(0, -boss.circleRadius - 18);
  fill(80);
  rectMode(CENTER);
  rect(0, 0, barW, barH, 4);
  fill(200, 40, 40);
  rectMode(CORNER);
  let filledW = (barW - 4) * pct; // small padding
  rect(-barW / 2 + 2, -barH / 2 + 2, filledW, barH - 4, 3);
  pop();
  pop();
}

// Boss shooting helper: fires 3 bullets in a spread towards player
function bossShoot(boss) {
  if (!boss || !player) return;
  // don't spam if boss already dead
  if (boss.hp <= 0) return;
  let baseDir = Matter.Vector.normalise({ x: player.position.x - boss.position.x, y: player.position.y - boss.position.y });
  let angle = Math.atan2(baseDir.y, baseDir.x);
  let spread = 0.35; // radians between bullets
  let angles = [angle - spread, angle, angle + spread];
  for (let a of angles) {
    let bx = boss.position.x + Math.cos(a) * (boss.circleRadius + 10);
    let by = boss.position.y + Math.sin(a) * (boss.circleRadius + 10);
    let bullet = Bodies.circle(bx, by, 6, { label: 'pirateBullet', restitution: 0.8, frictionAir: 0.01 });
    Body.setVelocity(bullet, { x: Math.cos(a) * 9, y: Math.sin(a) * 9 });
    bullets.push(bullet);
    World.add(world, bullet);
  }
}

function updateBullets() {
  for (let i = bullets.length - 1; i >= 0; i--) {
    let bullet = bullets[i];
    bullet.time += 1;
    if (bullet.position.x < -30 || bullet.position.x > width + 30 || bullet.position.y < -30 || bullet.position.y > height + 30) {
      World.remove(world, bullet);
      bullets.splice(i, 1);
      continue;
    }
    push();
    if (bullet.label === 'pirateBullet') {
      fill(0);
    } else {
      fill(255, 230, 120);
    }
    noStroke();
    ellipse(bullet.position.x, bullet.position.y, 12);
    pop();
  }
}

function detectFishingNet() {
  for (let i = fishes.length - 1; i >= 0; i--) {
    let fish = fishes[i];
    let d = dist(player.position.x, player.position.y, fish.position.x, fish.position.y);
    if (d < player.catchRadius) {
      fishCount += 1;
      fishThisLevel += 1;
      World.remove(world, fish);
      fishes.splice(i, 1);
    }
  }
}

function enforcePlayerBounds() {
  let x = constrain(player.position.x, 24, width - 24);
  let y = constrain(player.position.y, 24, height - 24);
  Body.setPosition(player, { x: x, y: y });
}

function handleCollisions(event) {
  let pairs = event.pairs;
  for (let pair of pairs) {
    let a = pair.bodyA;
    let b = pair.bodyB;
    if (a.label === 'bullet' && b.label === 'wall') a.bounced = true;
    if (b.label === 'bullet' && a.label === 'wall') b.bounced = true;
    if (a.label === 'bullet' && b.label === 'pirate') {
      damagePirate(b, a);
    }
    if (b.label === 'bullet' && a.label === 'pirate') {
      damagePirate(a, b);
    }
    if (a.label === 'bullet' && b.label === 'fish' && level >= 2) {
      damageFish(b, a);
    }
    if (b.label === 'bullet' && a.label === 'fish' && level >= 2) {
      damageFish(a, b);
    }
    if (a.label === 'bullet' && b.label === 'bossPirate') {
      damageBoss(b, a);
    }
    if (b.label === 'bullet' && a.label === 'bossPirate') {
      damageBoss(a, b);
    }
    if (a.label === 'bullet' && b.label === 'bossPirate2') {
      damageBoss(b, a);
    }
    if (b.label === 'bullet' && a.label === 'bossPirate2') {
      damageBoss(a, b);
    }
    if (a.label === 'bullet' && b.label === 'bossFish') {
      damageBoss(b, a);
    }
    if (b.label === 'bullet' && a.label === 'bossFish') {
      damageBoss(a, b);
    }
    if (a.label === 'player' && b.label === 'pirate') {
      touchDamage(0.3);
    }
    if (b.label === 'player' && a.label === 'pirate') {
      touchDamage(0.3);
    }
    if (a.label === 'player' && b.label === 'fish' && level >= 2) {
      touchDamage(0.1);
    }
    if (b.label === 'player' && a.label === 'fish' && level >= 2) {
      touchDamage(0.1);
    }
    if (a.label === 'player' && b.label === 'pirateBullet') {
      touchDamage(1);
      destroyBullet(b);
    }
    if (b.label === 'player' && a.label === 'pirateBullet') {
      touchDamage(1);
      destroyBullet(a);
    }
  }
}

function damagePirate(pirate, bullet) {
  pirate.hp -= 1;
  destroyBullet(bullet);
  if (pirate.hp <= 0) {
    pirateCount += 1;
    piratesThisLevel += 1;
    World.remove(world, pirate);
    pirates = pirates.filter((p) => p !== pirate);
  }
}

function damageFish(fish, bullet) {
  fish.hp -= 1;
  destroyBullet(bullet);
  if (fish.hp <= 0) {
    fishCount += 1;
    fishThisLevel += 1;
    World.remove(world, fish);
    fishes = fishes.filter((f) => f !== fish);
  }
}

function damageBoss(boss, bullet) {
  boss.hp -= 1;
  destroyBullet(bullet);
  if (boss.hp <= 0) {
    World.remove(world, boss);
    bosses = bosses.filter((b) => b !== boss);
    if (level === 3 && boss.label === 'bossPirate' && bosses.length === 0) {
      // immediately advance to level 4 and spawn final bosses
      level = 4;
      fishThisLevel = 0;
      piratesThisLevel = 0;
      ammo = maxAmmo;
      player.health = playerHealth;
      bossActive = false;
      levelText = 'Level 4: Final Boss! Defeat the Big Pirate AND Big Fish!';
      spawnBosses();
    }
  }
}

function touchDamage(value) {
  player.health -= value;
  if (player.health <= 0) {
    gameState = 'gameOver';
  }
}

function destroyBullet(bullet) {
  World.remove(world, bullet);
  bullets = bullets.filter((b) => b !== bullet);
}

function continueToNextLevel() {
  if (!pendingLevelChange) return;
  const nextLevel = pendingLevelChange.targetLevel;

  fishCount = 0;
  pirateCount = 0;
  player.score = 0;

  if (nextLevel === 2) {
    level = 2;
    fishThisLevel = 0;
    piratesThisLevel = 0;
    ammo = maxAmmo;
    player.health = playerHealth;
    spawnInterval = 90;
    levelText = 'Level 2: Fish can attack! Catch 25 fish AND defeat 20 pirates';
  } else if (nextLevel === 3) {
    level = 3;
    fishThisLevel = 0;
    piratesThisLevel = 0;
    ammo = maxAmmo;
    player.health = playerHealth;
    bossActive = false;
    bossSpawned = false;
    levelText = 'Level 3: Boss incoming - Defeat the Big Pirate!';
    spawnBosses();
  } else if (nextLevel === 4) {
    level = 4;
    fishThisLevel = 0;
    piratesThisLevel = 0;
    ammo = maxAmmo;
    player.health = playerHealth;
    bossActive = false;
    levelText = 'Level 4: Final Boss! Defeat the Big Pirate AND Big Fish!';
    spawnBosses();
  }

  pendingLevelChange = null;
  gameState = 'play';
}

function checkLevelProgress() {
  if (gameState !== 'play') return;

  // Level 1 completion
  if (level === 1 && fishThisLevel >= 20 && piratesThisLevel >= 15) {
    pendingLevelChange = {
      targetLevel: 2,
      message: 'Level 1 complete! Continue to Level 2',
    };
    nextLevelText = 'Level complete! Tap to continue to Level 2';
    gameState = 'levelComplete';
    return;
  }

  // Level 2 completion -> immediately go to level 3 and spawn boss
  if (level === 2 && fishThisLevel >= 25 && piratesThisLevel >= 20) {
    level = 3;
    fishThisLevel = 0;
    piratesThisLevel = 0;
    ammo = maxAmmo;
    player.health = playerHealth;
    bossActive = false;
    levelText = 'Level 3: Boss incoming - Defeat the Big Pirate!';
    spawnBosses();
    return;
  }

  // Victory when level 4 bosses cleared
  if (level === 4 && bosses.length === 0) {
    gameState = 'victory';
  }
}

function drawRadar() {
  let x = width - radarSize - 20;
  let y = 20;
  fill(5, 50, 90, 200);
  rect(x, y, radarSize, radarSize, 12);
  fill(90, 190, 255);
  textSize(14);
  textAlign(LEFT, TOP);
  text('Radar', x + 10, y + 10);
  push();
  translate(x + radarSize / 2, y + radarSize / 2 + 8);
  stroke(100, 240, 255);
  noFill();
  circle(0, 0, radarSize - 50);
  line(-radarSize / 4, 0, radarSize / 4, 0);
  line(0, -radarSize / 4, 0, radarSize / 4);
  fill(80, 255, 140);
  noStroke();
  circle(0, 0, 8);
  drawRadarDots(fishes, 0, 190, 255, x, y);
  drawRadarDots(pirates, 255, 120, 120, x, y);
  drawRadarDots(bosses, 255, 180, 100, x, y);
  pop();
}

function drawRadarDots(entities, r, g, b, x, y) {
  for (let entity of entities) {
    let dx = entity.position.x - player.position.x;
    let dy = entity.position.y - player.position.y;
    let maxDistance = 320;
    if (abs(dx) < maxDistance && abs(dy) < maxDistance) {
      let rx = map(dx, -maxDistance, maxDistance, -radarSize / 2 + 20, radarSize / 2 - 20);
      let ry = map(dy, -maxDistance, maxDistance, -radarSize / 2 + 20, radarSize / 2 - 20);
      fill(r, g, b);
      noStroke();
      circle(rx, ry, 8);
    }
  }
}

function drawUI() {
  fill(255);
  textAlign(LEFT, TOP);
  textSize(16);
  text(`Level: ${level}`, 20, 20);
  text(`Health: ${floor(player.health)}`, 20, 44);
  text(`Ammo: ${ammo}`, 20, 68);
  text(`Fish Caught: ${fishCount}`, 20, 92);
  text(`Pirates Defeated: ${pirateCount}`, 20, 116);
  text(levelText, 20, 146);
  text(`Fish near net: ${countNearbyFishes()}`, 20, 170);
}

function countNearbyFishes() {
  let count = 0;
  for (let fish of fishes) {
    let d = dist(fish.position.x, fish.position.y, player.position.x, player.position.y);
    if (d < player.netRadius) count++;
  }
  return count;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  createBoundaries();
  updateStartButton();
}

function updateStartButton() {
  startButton = {
    x: width / 2 - 100,
    y: height / 2 + 50,
    w: 200,
    h: 60,
  };
}
