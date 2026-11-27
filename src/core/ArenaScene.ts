import Phaser from 'phaser';

// ─── Gear / Loot types ───────────────────────────────────────────────────────

export type ItemRarity = 'COMMON' | 'RARE' | 'EXOTIC';
export type ItemSlot   = 'WEAPON' | 'ARMOR' | 'INJECTOR';

export interface LootItem {
  id: number;
  name: string;
  rarity: ItemRarity;
  slot: ItemSlot;
  /** Flat stat deltas applied when equipped */
  stats: {
    damage?: number;       // WEAPON: +damage per shot
    fireRate?: number;     // WEAPON: attack interval reduction (ms)
    maxHp?: number;        // ARMOR:  +max HP
    damageReduction?: number; // ARMOR:  fraction (0-1) damage reduction
    energyRegen?: number;  // INJECTOR: +energy/s bonus
    lifestealOnKill?: number; // INJECTOR: HP healed per kill
  };
}

export interface EquippedGear {
  WEAPON?: LootItem;
  ARMOR?: LootItem;
  INJECTOR?: LootItem;
}

export interface SomaticUpgrades {
  bruteForce: number;
  flexibleMass: number;
  isotopeCore: number;
}

export interface HudSnapshot {
  hp: number;
  maxHp: number;
  energy: number;
  maxEnergy: number;
  heat: number;
  meltdownActive: boolean;
  xp: number;
  xpToNext: number;
  level: number;
  dnaPoints: number;
  packNumber: number;
  enemiesRemaining: number;
  cooldowns: { slam: number; dash: number };
  upgrades: SomaticUpgrades;
  inventory: LootItem[];
  equipped: EquippedGear;
}

// ─── Internal entity interfaces ──────────────────────────────────────────────

interface EnemyEntity {
  id: number;
  sprite: Phaser.GameObjects.Sprite;
  shadow: Phaser.GameObjects.Ellipse;
  hpBarBg: Phaser.GameObjects.Rectangle;
  hpBarFill: Phaser.GameObjects.Rectangle;
  label?: Phaser.GameObjects.Text;
  hp: number;
  maxHp: number;
  speed: number;
  damage: number;
  xpValue: number;
  isElite: boolean;
  isBoss?: boolean;
  affix?: 'ARMORED' | 'FAST' | 'VOLATILE' | 'TITAN';
  hitCooldown: number;
}

interface ProjectileEntity {
  shape: Phaser.GameObjects.Arc;
  glow: Phaser.GameObjects.Arc;
  vx: number;
  vy: number;
  damage: number;
  life: number;
}

interface LootOrb {
  item: LootItem;
  orb: Phaser.GameObjects.Arc;
  glow: Phaser.GameObjects.Arc;
  label: Phaser.GameObjects.Text;
}

interface WallRect { x: number; y: number; w: number; h: number }

// ─── Constants ───────────────────────────────────────────────────────────────

const WORLD_WIDTH  = 2800;
const WORLD_HEIGHT = 2100;
const CAMERA_ZOOM  = 0.68;
const MAX_INVENTORY = 12;

const RARITY_COLOR: Record<ItemRarity, number> = {
  COMMON:  0x94a3b8,
  RARE:    0x60a5fa,
  EXOTIC:  0xf59e0b,
};
const RARITY_HEX: Record<ItemRarity, string> = {
  COMMON:  '#94a3b8',
  RARE:    '#60a5fa',
  EXOTIC:  '#f59e0b',
};

// ─── Loot tables ─────────────────────────────────────────────────────────────

const LOOT_TABLE: Omit<LootItem, 'id'>[] = [
  { name: 'Mk-I Bio-Pistol',      rarity: 'COMMON', slot: 'WEAPON',   stats: { damage: 8,  fireRate: 20 } },
  { name: 'Plasma Repeater',      rarity: 'RARE',   slot: 'WEAPON',   stats: { damage: 18, fireRate: 45 } },
  { name: 'Null-Phase Cannon',    rarity: 'EXOTIC', slot: 'WEAPON',   stats: { damage: 36, fireRate: 80 } },
  { name: 'Chitin Plate',         rarity: 'COMMON', slot: 'ARMOR',    stats: { maxHp: 30, damageReduction: 0.05 } },
  { name: 'Ferrofluid Vest',      rarity: 'RARE',   slot: 'ARMOR',    stats: { maxHp: 70, damageReduction: 0.12 } },
  { name: 'Exo-Membrane Shell',   rarity: 'EXOTIC', slot: 'ARMOR',    stats: { maxHp: 130, damageReduction: 0.22 } },
  { name: 'Stim-Injector I',      rarity: 'COMMON', slot: 'INJECTOR', stats: { energyRegen: 5, lifestealOnKill: 8 } },
  { name: 'Mutagenic Syringe',    rarity: 'RARE',   slot: 'INJECTOR', stats: { energyRegen: 12, lifestealOnKill: 18 } },
  { name: 'Isotope Catalyst',     rarity: 'EXOTIC', slot: 'INJECTOR', stats: { energyRegen: 22, lifestealOnKill: 35 } },
];

// ─── Scene ───────────────────────────────────────────────────────────────────

export class ArenaScene extends Phaser.Scene {
  private onHudUpdate?: (snapshot: HudSnapshot) => void;

  // Visual objects
  private player!: Phaser.GameObjects.Sprite;
  private playerShadow!: Phaser.GameObjects.Ellipse;
  private playerLight!: Phaser.GameObjects.Arc;
  private meltdownAura!: Phaser.GameObjects.Arc;
  private minimapGraphics!: Phaser.GameObjects.Graphics;

  // Input
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
    Q: Phaser.Input.Keyboard.Key;
    SPACE: Phaser.Input.Keyboard.Key;
  };

  // World
  private walls: WallRect[] = [];

  // Entities
  private enemies: EnemyEntity[] = [];
  private projectiles: ProjectileEntity[] = [];
  private lootOrbs: LootOrb[] = [];
  private nextEnemyId = 1;
  private nextItemId = 1;

  // Player stats
  private hp = 150;
  private maxHp = 150;
  private energy = 100;
  private maxEnergy = 100;
  private heat = 20;
  private meltdownTimer = 0;
  private xp = 0;
  private xpToNext = 100;
  private level = 1;
  private dnaPoints = 1;
  private waveNumber = 1;

  private upgrades: SomaticUpgrades = { bruteForce: 0, flexibleMass: 0, isotopeCore: 0 };

  // Gear
  private inventory: LootItem[] = [];
  private equipped: EquippedGear = {};

  // Cooldowns (ms)
  private primaryCd = 0;
  private slamCd = 0;
  private dashCd = 0;
  private hudEmitTimer = 0;
  private waveClearCooldown = 0;

  constructor() { super('ArenaScene'); }

  // ── Public API called from React ──────────────────────────────────────────

  public setHudCallback(cb: (snapshot: HudSnapshot) => void) {
    this.onHudUpdate = cb;
    this.emitHud();
  }

  public applyUpgrade(key: keyof SomaticUpgrades) {
    if (this.dnaPoints <= 0) return;
    this.dnaPoints -= 1;
    this.upgrades[key] += 1;
    if (key === 'bruteForce') {
      this.maxHp += 35;
      this.hp = Math.min(this.maxHp, this.hp + 35);
    }
    this.cameras.main.flash(140, 56, 189, 248, false);
    this.emitHud();
  }

  public equipItem(itemId: number) {
    const idx = this.inventory.findIndex(i => i.id === itemId);
    if (idx === -1) return;
    const item = this.inventory[idx];

    // Unequip existing in that slot → back into inventory
    const prev = this.equipped[item.slot];
    if (prev) this.inventory.push(prev);

    // Remove item from inventory and equip it
    this.inventory.splice(idx, 1);
    this.equipped[item.slot] = item;

    // Recalculate derived stats
    this.recalcGearStats();
    this.cameras.main.flash(140, 56, 189, 248, false);
    this.showFloatingText(this.player.x, this.player.y - 36, `EQUIPPED: ${item.name}`, RARITY_HEX[item.rarity]);
    this.emitHud();
  }

  public salvageItem(itemId: number) {
    const idx = this.inventory.findIndex(i => i.id === itemId);
    if (idx === -1) return;
    const item = this.inventory[idx];
    const xpGain = item.rarity === 'EXOTIC' ? 120 : item.rarity === 'RARE' ? 55 : 20;
    this.inventory.splice(idx, 1);
    this.xp += xpGain;
    this.checkLevelUp();
    this.showFloatingText(this.player.x, this.player.y - 36, `SALVAGE +${xpGain} XP`, '#a855f7');
    this.emitHud();
  }

  // ── Phaser lifecycle ──────────────────────────────────────────────────────

  create() {
    this.cameras.main.setBackgroundColor('#0b101b');
    this.generatePixelArtTextures();

    // Tiled dungeon floor (use '__DEFAULT' fallback if texture creation failed)
    const floorKey = this.textures.exists('dungeon_tile') ? 'dungeon_tile' : '__DEFAULT';
    this.add.tileSprite(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, WORLD_WIDTH, WORLD_HEIGHT, floorKey).setDepth(0);

    this.buildDungeonLayout();

    // Lights
    this.playerLight  = this.add.circle(460, 460, 170, 0x38bdf8, 0.06).setDepth(2);
    this.meltdownAura = this.add.circle(460, 460, 120, 0xf97316, 0.16).setDepth(3).setVisible(false);

    // Player
    this.playerShadow = this.add.ellipse(460, 474, 24, 10, 0x020617, 0.65).setDepth(9);
    this.player = this.add.sprite(460, 460,
      this.textures.exists('player_pixel') ? 'player_pixel' : '__DEFAULT'
    ).setScale(2).setDepth(10);

    // Camera
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setZoom(CAMERA_ZOOM);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

    // Input
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = {
      W: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      Q: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.Q),
      SPACE: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
    };

    this.input.mouse?.disableContextMenu();
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const worldPt = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      if (pointer.rightButtonDown()) {
        this.triggerStretchSlam();
      } else if (pointer.leftButtonDown() && this.primaryCd <= 0) {
        this.fireBioShot(worldPt.x, worldPt.y);
      }
    });

    // Screen-space HUD text (compensated for zoom)
    const viewW   = this.scale.width  || 960;
    const viewH   = this.scale.height || 680;
    const invZoom = 1 / CAMERA_ZOOM;
    const offsetX = (viewW  * (1 - invZoom)) / 2;
    const offsetY = (viewH * (1 - invZoom)) / 2;

    this.add
      .text(offsetX + 18, offsetY + 16, 'SECTOR 04 // SUB-LEVEL RUINS (ZOOM 0.68x)', {
        fontSize: '15px', color: '#94a3b8', fontFamily: 'monospace',
      })
      .setScrollFactor(0).setDepth(50);

    this.add
      .text(offsetX + 18, offsetY + viewH * invZoom - 28,
        'WASD: Move | LMB: Bio-Shot | RMB: Stretch-Slam | Q: Phase Dash | SPACE: Meltdown | Walk over loot to pick up',
        { fontSize: '13px', color: '#64748b', fontFamily: 'monospace' }
      )
      .setScrollFactor(0).setDepth(50);

    this.minimapGraphics = this.add.graphics().setScrollFactor(0).setDepth(60);

    // Starter loot orb near spawn
    this.spawnLootOrb(560, 460, this.rollLootItem('COMMON'));

    this.spawnAllSectorPacks();
    this.emitHud();
  }

  update(_time: number, delta: number) {
    const dt = delta / 1000;

    this.primaryCd = Math.max(0, this.primaryCd - delta);
    this.slamCd    = Math.max(0, this.slamCd    - delta);
    this.dashCd    = Math.max(0, this.dashCd    - delta);

    // Energy regen (base + gear bonus)
    const energyRegenBonus = this.equipped.INJECTOR?.stats.energyRegen ?? 0;
    this.energy = Math.min(this.maxEnergy, this.energy + (14 + energyRegenBonus) * dt);

    // Meltdown
    if (this.meltdownTimer > 0) {
      this.meltdownTimer = Math.max(0, this.meltdownTimer - delta);
      this.heat = Math.max(0, (this.meltdownTimer / (4500 + this.upgrades.isotopeCore * 800)) * 100);
      this.meltdownAura.setVisible(true).setPosition(this.player.x, this.player.y);
      this.applyMeltdownAuraDamage(dt);
    } else {
      this.meltdownAura.setVisible(false);
      this.heat = Math.max(0, this.heat - 4 * dt);
    }

    // Movement
    let vx = 0, vy = 0;
    if (this.cursors.left.isDown  || this.wasd.A.isDown) vx -= 1;
    if (this.cursors.right.isDown || this.wasd.D.isDown) vx += 1;
    if (this.cursors.up.isDown    || this.wasd.W.isDown) vy -= 1;
    if (this.cursors.down.isDown  || this.wasd.S.isDown) vy += 1;

    if (vx !== 0 || vy !== 0) {
      const len   = Math.hypot(vx, vy);
      const speed = 265 + this.upgrades.flexibleMass * 22;
      this.moveWithWallSlide(this.player, (vx / len) * speed * dt, (vy / len) * speed * dt, 15);
      if (vx < 0) this.player.setFlipX(true);
      if (vx > 0) this.player.setFlipX(false);
    }

    this.playerShadow.setPosition(this.player.x, this.player.y + 14);
    this.playerLight.setPosition(this.player.x, this.player.y);

    // Phase dash
    if (Phaser.Input.Keyboard.JustDown(this.wasd.Q) && this.dashCd <= 0 && this.energy >= 20) {
      this.triggerPhaseDash(vx, vy);
    }

    // Meltdown activation
    if (Phaser.Input.Keyboard.JustDown(this.wasd.SPACE) && this.heat >= 80 && this.meltdownTimer <= 0) {
      this.triggerMeltdown();
    }

    // Continuous fire
    if (this.input.activePointer.leftButtonDown() && this.primaryCd <= 0) {
      const worldPt = this.cameras.main.getWorldPoint(this.input.activePointer.x, this.input.activePointer.y);
      this.fireBioShot(worldPt.x, worldPt.y);
    }

    this.updateProjectiles(dt);
    this.updateEnemies(dt);
    this.updateLootOrbs(dt);
    this.drawMinimap();

    // Wave clear
    if (this.enemies.length === 0) {
      this.waveClearCooldown += delta;
      if (this.waveClearCooldown > 2000) {
        this.waveClearCooldown = 0;
        this.waveNumber += 1;
        this.spawnAllSectorPacks();
        this.showFloatingText(this.player.x, this.player.y - 44, `SECTOR BREACH // WAVE ${this.waveNumber}`, '#38bdf8');
      }
    }

    this.hudEmitTimer += delta;
    if (this.hudEmitTimer >= 100) {
      this.hudEmitTimer = 0;
      this.emitHud();
    }
  }

  // ── Texture generation ────────────────────────────────────────────────────

  private generatePixelArtTextures() {
    if (this.textures.exists('dungeon_tile')) return;

    // 48×48 dungeon floor tile
    const tileCanvas = this.textures.createCanvas('dungeon_tile', 48, 48);
    if (tileCanvas) {
      const tCtx = tileCanvas.getContext();
      tCtx.fillStyle = '#16202e'; tCtx.fillRect(0, 0, 48, 48);
      tCtx.fillStyle = '#0f1722'; tCtx.fillRect(0, 46, 48, 2); tCtx.fillRect(46, 0, 2, 48);
      tCtx.fillStyle = '#1e2b3d'; tCtx.fillRect(0, 0, 46, 2); tCtx.fillRect(0, 0, 2, 46);
      tCtx.strokeStyle = '#111926'; tCtx.lineWidth = 2; tCtx.strokeRect(10, 10, 26, 26);
      tCtx.strokeStyle = '#223145'; tCtx.strokeRect(12, 12, 22, 22);
      tileCanvas.refresh();
    }

    const makePixelSprite = (key: string, grid: string[], palette: Record<string, string>) => {
      const h = grid.length, w = grid[0].length;
      const c = this.textures.createCanvas(key, w, h);
      if (!c) return;
      const ctx = c.getContext();
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) {
          const ch = grid[y][x];
          if (ch !== '.' && palette[ch]) { ctx.fillStyle = palette[ch]; ctx.fillRect(x, y, 1, 1); }
        }
      c.refresh();
    };

    // Player (16×16 Hyper Light Drifter style)
    makePixelSprite('player_pixel', [
      '.....CCCCCC.....',
      '....CCCCCCCC....',
      '....CCWWWWCC....',
      '.....CCCCCC.....',
      '...RRRRRRRRRR...',
      '..RRRRRRRRRRRR..',
      '.RRRRDDDDDDRRRR.',
      '.RRRRDDDDDDRRRR.',
      '.RRRR.DDDD.RRRR.',
      '..RR..DDDD..RR..',
      '..RR..BBBB..RR..',
      '......BBBB......',
      '.....BB..BB.....',
      '.....BB..BB.....',
      '....BB....BB....',
      '....DD....DD....',
    ], { C: '#38bdf8', W: '#e0f2fe', R: '#f43f5e', D: '#1e293b', B: '#64748b' });

    // Minion (16×12)
    makePixelSprite('enemy_minion', [
      '.....KKKKKK.....',
      '....KSSSSSSK....',
      '....KSESESEK....',
      '....KSSSSSSK....',
      '...RRRRRRRRRR...',
      '..RRRRDDDDDRRR..',
      '.RRR.DDDDDDD.RRR',
      '.RR..DDDDDDD..RR',
      '.....DDDDDDD....',
      '.....DD...DD....',
      '....DD.....DD...',
      '....KK.....KK...',
    ], { K: '#0f172a', S: '#e2e8f0', E: '#ef4444', R: '#991b1b', D: '#334155' });

    // Elite (20×12)
    makePixelSprite('enemy_elite', [
      '......GGGGGGGG......',
      '.....GMMMMMMMMG.....',
      '....GMYYYYYYYYMG....',
      '...GGMMMMMMMMMMGG...',
      '..GGGGMMMMMMMMGGGG..',
      '.GGGG.MMMMMMMM.GGGG.',
      '.GGGG.MMRRRRMM.GGGG.',
      '.GGGG.MMMMMMMM.GGGG.',
      '..GG..MMMMMMMM..GG..',
      '......MMM..MMM......',
      '.....MMM....MMM.....',
      '....GGG......GGG....',
    ], { G: '#f59e0b', M: '#334155', Y: '#fef08a', R: '#ef4444' });

    // Sector Warden boss (32×19 teal mech)
    makePixelSprite('boss_warden', [
      '..........TTTTTTTTTTTT..........',
      '........TTTTTTTTTTTTTTTT........',
      '.......TTTTTTTTTTTTTTTTTT.......',
      '......TTTTDDDDDDDDDDDDTTTT......',
      '..TTTTTTTDDDDDDDDDDDDDDTTTTTTT..',
      '.TTTTTTTTDDDRRDDDDDDRRDDDTTTTTTT',
      '.TTTTTTTTDDDDDDDDDDDDDDDDTTTTTTT',
      '.TTTTDDDDDDDDDDDDDDDDDDDDDDTTTT.',
      '.TTTTDDDDDDTTTTTTTTTTDDDDDDTTTT.',
      '.TTTTDDDDDDDDDDDDDDDDDDDDDDTTTT.',
      '.DDDD.DDDDDDDDDDDDDDDDDDDD.DDDD.',
      '.DDDD..DDDDDDDDDDDDDDDDDD..DDDD.',
      'DDDDDD..DDDDDDDDDDDDDDDD..DDDDDD',
      'DD.DDD...DDDDDD..DDDDDD...DDD.DD',
      'DD..DD...DDDDD....DDDDD...DD..DD',
      '.........DDDD......DDDD.........',
      '........DDDD........DDDD........',
      '.......DDDDD........DDDDD.......',
      '......DDDDDD........DDDDDD......',
    ], { T: '#2dd4bf', D: '#1e1b2e', R: '#fb7185' });
  }

  // ── Dungeon layout ────────────────────────────────────────────────────────

  private buildDungeonLayout() {
    this.walls = [
      // Outer perimeter
      { x: 0,                y: 0,                w: WORLD_WIDTH,    h: 64 },
      { x: 0,                y: WORLD_HEIGHT - 64, w: WORLD_WIDTH,   h: 64 },
      { x: 0,                y: 0,                w: 64,             h: WORLD_HEIGHT },
      { x: WORLD_WIDTH - 64, y: 0,                w: 64,             h: WORLD_HEIGHT },
      // NW Spawn Courtyard
      { x: 820, y: 64,   w: 56, h: 360 }, { x: 820, y: 580, w: 56, h: 340 },
      { x: 64,  y: 860,  w: 420, h: 56 }, { x: 640, y: 860, w: 236, h: 56 },
      // Central Reactor pillars
      { x: 1220, y: 760,  w: 96, h: 96 }, { x: 1520, y: 760,  w: 96, h: 96 },
      { x: 1220, y: 1120, w: 96, h: 96 }, { x: 1520, y: 1120, w: 96, h: 96 },
      // NE Lab Wing
      { x: 1860, y: 64,  w: 56, h: 440 }, { x: 1860, y: 680, w: 56, h: 240 },
      { x: 1860, y: 864, w: 420, h: 56 },
      // SW Ruined Barracks
      { x: 820,  y: 1180, w: 56, h: 420 }, { x: 260, y: 1420, w: 340, h: 56 },
      // SE Warden Chamber
      { x: 1860, y: 1160, w: 360, h: 56 }, { x: 2420, y: 1160, w: 316, h: 56 },
      { x: 1860, y: 1160, w: 56,  h: 480 },
    ];

    const wallGraphics = this.add.graphics().setDepth(5);
    for (const w of this.walls) {
      // Drop shadow
      wallGraphics.fillStyle(0x020617, 0.55);
      wallGraphics.fillRect(w.x + 8, w.y + 14, w.w, w.h);
      // Top cap
      wallGraphics.fillStyle(0x273549, 1);
      wallGraphics.fillRect(w.x, w.y, w.w, w.h);
      // 2.5D extruded face
      const faceH = Math.min(18, w.h * 0.4);
      wallGraphics.fillStyle(0x131c29, 1);
      wallGraphics.fillRect(w.x, w.y + w.h - faceH, w.w, faceH);
      // Highlight bevel
      wallGraphics.lineStyle(2, 0x475569, 0.9);
      wallGraphics.strokeRect(w.x, w.y, w.w, w.h);
      // Red beacon on pillars
      if (w.w <= 120 && w.h <= 120 && w.x > 100) {
        wallGraphics.fillStyle(0xef4444, 1);
        wallGraphics.fillRect(w.x + w.w / 2 - 4, w.y + w.h - faceH + 5, 8, 5);
        this.add.circle(w.x + w.w / 2, w.y + w.h - 8, 28, 0xef4444, 0.12).setDepth(4);
      }
    }
  }

  // ── Loot system ───────────────────────────────────────────────────────────

  private rollLootItem(minRarity?: ItemRarity): LootItem {
    let pool = [...LOOT_TABLE];
    if (minRarity === 'RARE')   pool = pool.filter(i => i.rarity !== 'COMMON');
    if (minRarity === 'EXOTIC') pool = pool.filter(i => i.rarity === 'EXOTIC');
    const template = pool[Math.floor(Math.random() * pool.length)];
    return { ...template, id: this.nextItemId++ };
  }

  private spawnLootOrb(x: number, y: number, item: LootItem) {
    const color = RARITY_COLOR[item.rarity];
    const glow = this.add.circle(x, y, 22, color, 0.18).setDepth(6);
    const orb  = this.add.circle(x, y, 9,  color, 0.95).setDepth(7);
    const label = this.add
      .text(x, y - 20, item.name, {
        fontSize: '10px', color: RARITY_HEX[item.rarity],
        fontFamily: 'monospace', fontStyle: 'bold',
      })
      .setOrigin(0.5).setDepth(8);

    // Floating bob tween
    this.tweens.add({ targets: [orb, glow, label], y: `-=6`, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    // Glow pulse
    this.tweens.add({ targets: glow, alpha: 0.08, duration: 600, yoyo: true, repeat: -1 });

    this.lootOrbs.push({ item, orb, glow, label });
  }

  private updateLootOrbs(dt: number) {
    for (let i = this.lootOrbs.length - 1; i >= 0; i--) {
      const lo = this.lootOrbs[i];
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, lo.orb.x, lo.orb.y);

      // Magnetic attraction at 160px
      if (dist < 160 && dist > 1) {
        const angle = Math.atan2(this.player.y - lo.orb.y, this.player.x - lo.orb.x);
        const pull  = Phaser.Math.Lerp(0, 420, 1 - dist / 160);
        const nx = lo.orb.x + Math.cos(angle) * pull * dt;
        const ny = lo.orb.y + Math.sin(angle) * pull * dt;
        lo.orb.setPosition(nx, ny);
        lo.glow.setPosition(nx, ny);
        lo.label.setPosition(nx, ny - 20);
      }

      // Pick up at 20px
      if (dist < 20) {
        if (this.inventory.length < MAX_INVENTORY) {
          this.inventory.push(lo.item);
          this.showFloatingText(this.player.x, this.player.y - 32,
            `LOOT: ${lo.item.name}`, RARITY_HEX[lo.item.rarity]);
          this.emitHud();
        } else {
          this.showFloatingText(this.player.x, this.player.y - 32, 'INVENTORY FULL!', '#f43f5e');
        }
        lo.orb.destroy(); lo.glow.destroy(); lo.label.destroy();
        this.lootOrbs.splice(i, 1);
      }
    }
  }

  private recalcGearStats() {
    // Reset to base + somatic upgrade bonuses
    this.maxHp = 150 + this.upgrades.bruteForce * 35
      + (this.equipped.ARMOR?.stats.maxHp ?? 0);
    this.hp    = Math.min(this.hp, this.maxHp);
  }

  // ── Collision helpers ─────────────────────────────────────────────────────

  private isInsideWall(x: number, y: number, radius: number): boolean {
    for (const w of this.walls) {
      const cx = Phaser.Math.Clamp(x, w.x, w.x + w.w);
      const cy = Phaser.Math.Clamp(y, w.y, w.y + w.h);
      if ((x - cx) ** 2 + (y - cy) ** 2 < radius * radius) return true;
    }
    return false;
  }

  private moveWithWallSlide(obj: Phaser.GameObjects.Sprite, dx: number, dy: number, radius: number) {
    const nx = Phaser.Math.Clamp(obj.x + dx, radius + 68, WORLD_WIDTH  - radius - 68);
    if (!this.isInsideWall(nx, obj.y, radius)) obj.x = nx;
    const ny = Phaser.Math.Clamp(obj.y + dy, radius + 68, WORLD_HEIGHT - radius - 68);
    if (!this.isInsideWall(obj.x, ny, radius)) obj.y = ny;
  }

  // ── Combat: player abilities ──────────────────────────────────────────────

  private fireBioShot(targetX: number, targetY: number) {
    const weaponBonus = this.equipped.WEAPON?.stats.fireRate ?? 0;
    const attackInterval = Math.max(130, 300 - this.upgrades.flexibleMass * 28 - weaponBonus);
    this.primaryCd = attackInterval;

    const angle = Math.atan2(targetY - this.player.y, targetX - this.player.x);
    this.player.setFlipX(Math.cos(angle) < 0);

    const weaponDmg = this.equipped.WEAPON?.stats.damage ?? 0;
    const baseDamage = 24 + this.upgrades.isotopeCore * 9 + weaponDmg;
    const multiplier = this.meltdownTimer > 0 ? 1.65 : 1;

    const glow   = this.add.circle(this.player.x, this.player.y, 11, 0x38bdf8, 0.25).setDepth(11);
    const bullet = this.add.circle(this.player.x, this.player.y, 5,  0xe0f2fe).setDepth(12);

    this.projectiles.push({
      shape: bullet, glow,
      vx: Math.cos(angle) * 640,
      vy: Math.sin(angle) * 640,
      damage: Math.round(baseDamage * multiplier),
      life: 1.5,
    });

    this.energy = Math.min(this.maxEnergy, this.energy + 8);
    this.heat   = Math.min(100, this.heat + 6);
  }

  private triggerStretchSlam() {
    if (this.slamCd > 0 || this.energy < 25) return;
    this.energy -= 25;
    this.slamCd  = 1600;
    this.heat    = Math.min(100, this.heat + 18);

    const radius = 135 + this.upgrades.bruteForce * 14;
    const damage = Math.round((58 + this.upgrades.bruteForce * 22) * (this.meltdownTimer > 0 ? 1.5 : 1));

    const ring = this.add.circle(this.player.x, this.player.y, radius, 0xf43f5e, 0.26).setDepth(8);
    ring.setStrokeStyle(3, 0xfb7185);
    this.tweens.add({ targets: ring, alpha: 0, scale: 1.15, duration: 260, onComplete: () => ring.destroy() });
    this.cameras.main.shake(120, 0.008);

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.sprite.x, enemy.sprite.y);
      if (dist <= radius + (enemy.isBoss ? 36 : 16)) {
        if (!enemy.isBoss) {
          const pushAngle = Math.atan2(enemy.sprite.y - this.player.y, enemy.sprite.x - this.player.x);
          this.moveWithWallSlide(enemy.sprite, Math.cos(pushAngle) * 44, Math.sin(pushAngle) * 44, enemy.isElite ? 20 : 14);
        }
        this.damageEnemy(enemy, damage, true);
      }
    }
  }

  private triggerPhaseDash(vx: number, vy: number) {
    const worldPt = this.cameras.main.getWorldPoint(this.input.activePointer.x, this.input.activePointer.y);
    const angle = (vx !== 0 || vy !== 0)
      ? Math.atan2(vy, vx)
      : Math.atan2(worldPt.y - this.player.y, worldPt.x - this.player.x);

    let destX: number | null = null, destY: number | null = null;
    for (const dist of [190, 250, 130, 85]) {
      const tx = Phaser.Math.Clamp(this.player.x + Math.cos(angle) * dist, 84, WORLD_WIDTH  - 84);
      const ty = Phaser.Math.Clamp(this.player.y + Math.sin(angle) * dist, 84, WORLD_HEIGHT - 84);
      if (!this.isInsideWall(tx, ty, 15)) { destX = tx; destY = ty; break; }
    }
    if (destX === null || destY === null) return;

    this.energy -= 20;
    this.dashCd  = Math.max(900, 2100 - this.upgrades.flexibleMass * 220);

    const ghost = this.add.sprite(this.player.x, this.player.y, 'player_pixel').setScale(2).setAlpha(0.55).setTint(0x38bdf8).setDepth(9);
    this.tweens.add({ targets: ghost, alpha: 0, duration: 260, onComplete: () => ghost.destroy() });

    this.player.setPosition(destX, destY);
    this.showFloatingText(this.player.x, this.player.y - 26, 'PHASE SHIFT', '#38bdf8');
  }

  private triggerMeltdown() {
    this.meltdownTimer = 4500 + this.upgrades.isotopeCore * 800;
    this.cameras.main.flash(220, 249, 115, 22, false);
    this.cameras.main.shake(180, 0.01);
    this.showFloatingText(this.player.x, this.player.y - 34, 'NUCLEAR MELTDOWN!', '#fb923c');
  }

  private applyMeltdownAuraDamage(dt: number) {
    const auraDps = 45 + this.upgrades.isotopeCore * 15;
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.sprite.x, enemy.sprite.y) <= 125) {
        this.damageEnemy(enemy, auraDps * dt, false);
      }
    }
  }

  // ── Update loops ──────────────────────────────────────────────────────────

  private updateProjectiles(dt: number) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      proj.life -= dt;
      proj.shape.x += proj.vx * dt;
      proj.shape.y += proj.vy * dt;
      proj.glow.setPosition(proj.shape.x, proj.shape.y);

      if (this.isInsideWall(proj.shape.x, proj.shape.y, 5)) {
        proj.shape.destroy(); proj.glow.destroy();
        this.projectiles.splice(i, 1); continue;
      }

      let hit = false;
      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const enemy = this.enemies[j];
        const hitR  = enemy.isBoss ? 44 : enemy.isElite ? 24 : 18;
        if (Phaser.Math.Distance.Between(proj.shape.x, proj.shape.y, enemy.sprite.x, enemy.sprite.y) <= hitR) {
          this.damageEnemy(enemy, proj.damage, true); hit = true; break;
        }
      }

      if (hit || proj.life <= 0) {
        proj.shape.destroy(); proj.glow.destroy();
        this.projectiles.splice(i, 1);
      }
    }
  }

  private updateEnemies(dt: number) {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      enemy.hitCooldown = Math.max(0, enemy.hitCooldown - dt);

      const distToPlayer = Phaser.Math.Distance.Between(enemy.sprite.x, enemy.sprite.y, this.player.x, this.player.y);
      if (distToPlayer < (enemy.isBoss ? 680 : 580)) {
        const angle = Math.atan2(this.player.y - enemy.sprite.y, this.player.x - enemy.sprite.x);
        this.moveWithWallSlide(enemy.sprite, Math.cos(angle) * enemy.speed * dt, Math.sin(angle) * enemy.speed * dt,
          enemy.isBoss ? 36 : enemy.isElite ? 20 : 14);
        enemy.sprite.setFlipX(Math.cos(angle) < 0);
      }

      const shadowOffY = enemy.isBoss ? 38 : enemy.isElite ? 18 : 13;
      enemy.shadow.setPosition(enemy.sprite.x, enemy.sprite.y + shadowOffY);

      const barY = enemy.sprite.y - (enemy.isBoss ? 52 : enemy.isElite ? 28 : 22);
      enemy.hpBarBg.setPosition(enemy.sprite.x, barY);
      enemy.hpBarFill.setPosition(enemy.sprite.x - (enemy.hpBarBg.width - enemy.hpBarFill.width) / 2, barY);
      enemy.label?.setPosition(enemy.sprite.x, barY - 14);

      const meleeR = enemy.isBoss ? 54 : enemy.isElite ? 34 : 28;
      if (distToPlayer <= meleeR && enemy.hitCooldown <= 0) {
        enemy.hitCooldown = 0.85;
        const reduction = this.equipped.ARMOR?.stats.damageReduction ?? 0;
        this.damagePlayer(Math.round(enemy.damage * (1 - reduction)));
      }
    }
  }

  // ── Damage resolution ─────────────────────────────────────────────────────

  private damagePlayer(amount: number) {
    this.hp = Math.max(0, this.hp - amount);
    this.cameras.main.shake(90, 0.006);
    this.showFloatingText(this.player.x, this.player.y - 24, `-${amount}`, '#f43f5e');
    if (this.hp <= 0) {
      this.hp = this.maxHp; this.energy = this.maxEnergy;
      this.player.setPosition(460, 460);
      this.showFloatingText(this.player.x, this.player.y - 36, 'CLONE RESTORED AT SPAWN', '#34d399');
    }
  }

  private damageEnemy(enemy: EnemyEntity, amount: number, showNumber: boolean) {
    const rawDamage = (enemy.affix === 'ARMORED' || enemy.isBoss) ? amount * 0.78 : amount;
    enemy.hp -= rawDamage;
    enemy.hpBarFill.width = enemy.hpBarBg.width * Math.max(0, enemy.hp / enemy.maxHp);

    if (showNumber && Math.round(rawDamage) >= 1) {
      this.showFloatingText(enemy.sprite.x, enemy.sprite.y - 20, `${Math.round(rawDamage)}`,
        enemy.isBoss ? '#2dd4bf' : enemy.isElite ? '#fbbf24' : '#e2e8f0');
    }

    if (enemy.hp <= 0) this.killEnemy(enemy);
  }

  private killEnemy(enemy: EnemyEntity) {
    const idx = this.enemies.indexOf(enemy);
    if (idx !== -1) this.enemies.splice(idx, 1);

    // VOLATILE death explosion
    if (enemy.affix === 'VOLATILE') {
      const blast = this.add.circle(enemy.sprite.x, enemy.sprite.y, 100, 0xf97316, 0.35).setDepth(15);
      this.tweens.add({ targets: blast, alpha: 0, scale: 1.2, duration: 300, onComplete: () => blast.destroy() });
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.sprite.x, enemy.sprite.y) <= 100) {
        const reduction = this.equipped.ARMOR?.stats.damageReduction ?? 0;
        this.damagePlayer(Math.round(18 * (1 - reduction)));
      }
    }

    // XP gain
    this.xp += enemy.xpValue;
    this.checkLevelUp();

    // Lifesteal on kill (Injector)
    const lifesteal = this.equipped.INJECTOR?.stats.lifestealOnKill ?? 0;
    if (lifesteal > 0) {
      this.hp = Math.min(this.maxHp, this.hp + lifesteal);
      this.showFloatingText(this.player.x, this.player.y - 18, `+${lifesteal} HP`, '#34d399');
    }

    // Drop loot
    const roll = Math.random();
    const rarity: ItemRarity = enemy.isBoss ? 'EXOTIC' : enemy.isElite
      ? (roll < 0.45 ? 'RARE' : 'COMMON')
      : (roll < 0.12 ? 'RARE' : roll < 0.02 ? 'EXOTIC' : 'COMMON');

    if (enemy.isBoss || enemy.isElite || roll < 0.4) {
      this.spawnLootOrb(enemy.sprite.x + Phaser.Math.Between(-20, 20),
                        enemy.sprite.y + Phaser.Math.Between(-20, 20),
                        this.rollLootItem(rarity));
    }

    enemy.sprite.destroy(); enemy.shadow.destroy();
    enemy.hpBarBg.destroy(); enemy.hpBarFill.destroy();
    enemy.label?.destroy();
    this.emitHud();
  }

  // ── Spawning ──────────────────────────────────────────────────────────────

  private spawnAllSectorPacks() {
    const scale = 1 + (this.waveNumber - 1) * 0.25;

    const packs: Array<{ cx: number; cy: number; count: number; affix: 'ARMORED' | 'FAST' | 'VOLATILE' }> = [
      { cx: 1120, cy: 420,  count: 4, affix: 'FAST' },
      { cx: 2240, cy: 480,  count: 5, affix: 'ARMORED' },
      { cx: 1380, cy: 940,  count: 5, affix: 'VOLATILE' },
      { cx: 460,  cy: 1620, count: 5, affix: 'FAST' },
    ];

    for (const pack of packs) {
      for (let i = 0; i < pack.count; i++) {
        const isElite = i === 0;
        const angle   = (Math.PI * 2 * i) / pack.count;
        let x = pack.cx + (isElite ? 0 : Math.cos(angle) * 85);
        let y = pack.cy + (isElite ? 0 : Math.sin(angle) * 85);
        if (this.isInsideWall(x, y, 22)) { x = pack.cx; y = pack.cy; }
        this.createEnemyEntity(x, y, isElite, false, isElite ? pack.affix : undefined, scale);
      }
    }

    // SE Sector Warden boss
    this.createEnemyEntity(2280, 1620, true, true, 'TITAN', scale);
  }

  private createEnemyEntity(
    x: number, y: number,
    isElite: boolean, isBoss: boolean,
    affix: 'ARMORED' | 'FAST' | 'VOLATILE' | 'TITAN' | undefined,
    scale: number
  ) {
    const texture     = isBoss ? 'boss_warden' : isElite ? 'enemy_elite' : 'enemy_minion';
    const safeTexture = this.textures.exists(texture) ? texture : '__DEFAULT';
    const spriteScale = isBoss ? 3.2 : isElite ? 2.1 : 1.9;

    const shadow = this.add
      .ellipse(x, y + (isBoss ? 38 : 15), isBoss ? 86 : isElite ? 34 : 24, isBoss ? 28 : 10, 0x020617, 0.7)
      .setDepth(8);

    if (isBoss) {
      const bossSpot = this.add.circle(x, y, 130, 0x2dd4bf, 0.14).setDepth(3);
      this.tweens.add({ targets: bossSpot, alpha: 0.06, duration: 1500, yoyo: true, repeat: -1 });
      this.events.on('update', () => {
        if (bossSpot.active && sprite.active) bossSpot.setPosition(sprite.x, sprite.y);
        else if (bossSpot.active)             bossSpot.destroy();
      });
    }

    const sprite = this.add.sprite(x, y, safeTexture).setScale(spriteScale).setDepth(10);
    const barW   = isBoss ? 96 : isElite ? 48 : 30;

    const hpBarBg   = this.add.rectangle(x, y - 24, barW, 5, 0x0f172a).setDepth(15);
    const hpBarFill = this.add.rectangle(x, y - 24, barW, 5,
      isBoss ? 0x2dd4bf : isElite ? 0xfbbf24 : 0xf43f5e).setDepth(16);

    const label = isElite
      ? this.add.text(x, y - 38, isBoss ? '☠ SECTOR WARDEN [TITAN]' : `★ ${affix}`, {
          fontSize: isBoss ? '13px' : '11px',
          color: isBoss ? '#5eead4' : '#fde047',
          fontStyle: 'bold', fontFamily: 'monospace',
        }).setOrigin(0.5).setDepth(17)
      : undefined;

    const baseHp = isBoss ? 850 : isElite ? 220 : 68;

    this.enemies.push({
      id: this.nextEnemyId++,
      sprite, shadow, hpBarBg, hpBarFill, label,
      hp: Math.round(baseHp * scale), maxHp: Math.round(baseHp * scale),
      speed:   isBoss ? 88 : affix === 'FAST' ? 172 : isElite ? 108 : 136,
      damage:  Math.round((isBoss ? 28 : isElite ? 18 : 9) * scale),
      xpValue: isBoss ? 220 : isElite ? 65 : 22,
      isElite, isBoss, affix, hitCooldown: 0,
    });
  }

  // ── Level up ──────────────────────────────────────────────────────────────

  private checkLevelUp() {
    while (this.xp >= this.xpToNext) {
      this.xp -= this.xpToNext;
      this.level    += 1;
      this.dnaPoints += 1;
      this.xpToNext  = Math.round(this.xpToNext * 1.35);
      this.hp = this.maxHp;
      this.showFloatingText(this.player.x, this.player.y - 44, `LEVEL UP! +1 DNA POINT`, '#c084fc');
    }
  }

  // ── Minimap ───────────────────────────────────────────────────────────────

  private drawMinimap() {
    const viewW   = this.scale.width  || 960;
    const viewH   = this.scale.height || 680;
    const invZoom = 1 / CAMERA_ZOOM;
    const offsetX = (viewW * (1 - invZoom)) / 2;
    const offsetY = (viewH * (1 - invZoom)) / 2;

    const mapW = 190, mapH = 142;
    const padX = offsetX + viewW * invZoom - mapW - 18;
    const padY = offsetY + 18;
    const scX  = mapW / WORLD_WIDTH;
    const scY  = mapH / WORLD_HEIGHT;

    this.minimapGraphics.clear();
    this.minimapGraphics.fillStyle(0x020617, 0.85);
    this.minimapGraphics.fillRect(padX, padY, mapW, mapH);
    this.minimapGraphics.lineStyle(1.5, 0x334155, 1);
    this.minimapGraphics.strokeRect(padX, padY, mapW, mapH);

    this.minimapGraphics.fillStyle(0x475569, 0.9);
    for (const w of this.walls)
      this.minimapGraphics.fillRect(padX + w.x * scX, padY + w.y * scY, Math.max(2, w.w * scX), Math.max(2, w.h * scY));

    // Loot orbs on minimap
    for (const lo of this.lootOrbs) {
      this.minimapGraphics.fillStyle(RARITY_COLOR[lo.item.rarity], 1);
      this.minimapGraphics.fillRect(padX + lo.orb.x * scX - 1, padY + lo.orb.y * scY - 1, 2, 2);
    }

    for (const enemy of this.enemies) {
      this.minimapGraphics.fillStyle(enemy.isBoss ? 0x2dd4bf : enemy.isElite ? 0xf59e0b : 0xf43f5e, 1);
      const dot = enemy.isBoss ? 6 : enemy.isElite ? 4 : 2.5;
      this.minimapGraphics.fillRect(padX + enemy.sprite.x * scX - dot / 2, padY + enemy.sprite.y * scY - dot / 2, dot, dot);
    }

    this.minimapGraphics.fillStyle(0x38bdf8, 1);
    this.minimapGraphics.fillCircle(padX + this.player.x * scX, padY + this.player.y * scY, 4);
  }

  // ── Floating text ─────────────────────────────────────────────────────────

  private showFloatingText(x: number, y: number, text: string, color: string) {
    const label = this.add.text(x, y, text, {
      fontSize: '14px', fontStyle: 'bold', color, fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(40);
    this.tweens.add({ targets: label, y: y - 30, alpha: 0, duration: 650, onComplete: () => label.destroy() });
  }

  // ── HUD emission ──────────────────────────────────────────────────────────

  private emitHud() {
    if (!this.onHudUpdate) return;
    this.onHudUpdate({
      hp: Math.round(this.hp), maxHp: this.maxHp,
      energy: Math.round(this.energy), maxEnergy: this.maxEnergy,
      heat: Math.round(this.heat),
      meltdownActive: this.meltdownTimer > 0,
      xp: this.xp, xpToNext: this.xpToNext,
      level: this.level, dnaPoints: this.dnaPoints,
      packNumber: this.waveNumber,
      enemiesRemaining: this.enemies.length,
      cooldowns: {
        slam: Number((this.slamCd / 1000).toFixed(1)),
        dash: Number((this.dashCd / 1000).toFixed(1)),
      },
      upgrades: { ...this.upgrades },
      inventory: [...this.inventory],
      equipped: { ...this.equipped },
    });
  }
}
