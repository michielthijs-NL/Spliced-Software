import Phaser from 'phaser';

export interface SomaticUpgrades {
  bruteForce: number;
  flexibleMass: number;
  isotopeCore: number;
}

export type ItemRarity = 'COMMON' | 'RARE' | 'EXOTIC';
export type ItemSlot = 'WEAPON' | 'ARMOR' | 'INJECTOR';

export interface LootItem {
  id: string;
  name: string;
  slot: ItemSlot;
  rarity: ItemRarity;
  stats: {
    damageBonus?: number;
    attackSpeedPct?: number;
    maxHpBonus?: number;
    damageReductionPct?: number;
    energyRegenBonus?: number;
    lifestealOnKill?: number;
  };
  description: string;
}

export interface EquippedGear {
  WEAPON: LootItem | null;
  ARMOR: LootItem | null;
  INJECTOR: LootItem | null;
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
  cooldowns: {
    slam: number;
    dash: number;
  };
  upgrades: SomaticUpgrades;
  equipped: EquippedGear;
  inventory: LootItem[];
}

interface GroundDrop {
  item: LootItem;
  orb: Phaser.GameObjects.Arc;
  ring: Phaser.GameObjects.Arc;
  label: Phaser.GameObjects.Text;
  bobOffset: number;
}

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

interface WallRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const WORLD_WIDTH = 2800;
const WORLD_HEIGHT = 2100;
const CAMERA_ZOOM = 0.68;

const POINT_A = { x: 240, y: 260 };
const POINT_B = { x: 2520, y: 1840 };

const LOOT_POOL: Array<Omit<LootItem, 'id'>> = [
  {
    name: 'Scrap Plasma Emitter',
    slot: 'WEAPON',
    rarity: 'COMMON',
    stats: { damageBonus: 6 },
    description: '+6 Bio-Shot Damage',
  },
  {
    name: 'Reinforced Kevlar Weave',
    slot: 'ARMOR',
    rarity: 'COMMON',
    stats: { maxHpBonus: 30 },
    description: '+30 Max Vitality (HP)',
  },
  {
    name: 'Basic Glucose Syringe',
    slot: 'INJECTOR',
    rarity: 'COMMON',
    stats: { energyRegenBonus: 5 },
    description: '+5 Energy Regen / sec',
  },
  {
    name: 'Overclocked Ion Coil',
    slot: 'WEAPON',
    rarity: 'RARE',
    stats: { damageBonus: 12, attackSpeedPct: 14 },
    description: '+12 Damage, +14% Fire Rate',
  },
  {
    name: 'Mutated Chitin Carapace',
    slot: 'ARMOR',
    rarity: 'RARE',
    stats: { maxHpBonus: 65, damageReductionPct: 12 },
    description: '+65 Max HP, -12% Damage Taken',
  },
  {
    name: 'Adrenal Splicer Module',
    slot: 'INJECTOR',
    rarity: 'RARE',
    stats: { energyRegenBonus: 9, lifestealOnKill: 6 },
    description: '+9 Energy/s, +6 HP per Kill',
  },
  {
    name: 'Warden Singularity Core',
    slot: 'WEAPON',
    rarity: 'EXOTIC',
    stats: { damageBonus: 24, attackSpeedPct: 24 },
    description: '+24 Damage, +24% Fire Rate',
  },
  {
    name: 'Aegis Symbiote Exosuit',
    slot: 'ARMOR',
    rarity: 'EXOTIC',
    stats: { maxHpBonus: 120, damageReductionPct: 22 },
    description: '+120 Max HP, -22% Damage Taken',
  },
  {
    name: 'Crimson Vampiric Catalyst',
    slot: 'INJECTOR',
    rarity: 'EXOTIC',
    stats: { energyRegenBonus: 15, lifestealOnKill: 14 },
    description: '+15 Energy/s, +14 HP per Kill',
  },
];

export class ArenaScene extends Phaser.Scene {
  private onHudUpdate?: (snapshot: HudSnapshot) => void;

  private player!: Phaser.GameObjects.Sprite;
  private playerShadow!: Phaser.GameObjects.Ellipse;
  private playerLight!: Phaser.GameObjects.Arc;
  private meltdownAura!: Phaser.GameObjects.Arc;

  private exitPortalOuter!: Phaser.GameObjects.Arc;
  private exitPortalInner!: Phaser.GameObjects.Arc;
  private exitPortalLabel!: Phaser.GameObjects.Text;
  private portalUnlocked = false;
  private sectorTransitionLock = false;

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
    Q: Phaser.Input.Keyboard.Key;
    SPACE: Phaser.Input.Keyboard.Key;
  };

  private walls: WallRect[] = [];
  private minimapGraphics!: Phaser.GameObjects.Graphics;

  private enemies: EnemyEntity[] = [];
  private projectiles: ProjectileEntity[] = [];
  private groundDrops: GroundDrop[] = [];
  private nextEnemyId = 1;
  private nextItemId = 1;

  private baseMaxHp = 150;
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

  private upgrades: SomaticUpgrades = {
    bruteForce: 0,
    flexibleMass: 0,
    isotopeCore: 0,
  };

  private equipped: EquippedGear = {
    WEAPON: null,
    ARMOR: null,
    INJECTOR: null,
  };

  private inventory: LootItem[] = [];

  private primaryCd = 0;
  private slamCd = 0;
  private dashCd = 0;
  private hudEmitTimer = 0;

  constructor() {
    super('ArenaScene');
  }

  public setHudCallback(cb: (snapshot: HudSnapshot) => void) {
    this.onHudUpdate = cb;
    this.emitHud();
  }

  public applyUpgrade(key: keyof SomaticUpgrades) {
    if (this.dnaPoints <= 0) return;
    this.dnaPoints -= 1;
    this.upgrades[key] += 1;

    if (key === 'bruteForce') {
      this.baseMaxHp += 35;
      this.recalculateStats(35);
    }

    this.cameras.main.flash(140, 56, 189, 248, false);
    this.emitHud();
  }

  public equipItem(itemId: string) {
    const idx = this.inventory.findIndex((i) => i.id === itemId);
    if (idx === -1) return;

    const item = this.inventory[idx];
    const previousEquipped = this.equipped[item.slot];

    this.inventory.splice(idx, 1);
    if (previousEquipped) {
      this.inventory.push(previousEquipped);
    }
    this.equipped[item.slot] = item;

    const prevMaxHp = this.maxHp;
    this.recalculateStats(0);
    const hpDiff = Math.max(0, this.maxHp - prevMaxHp);
    if (hpDiff > 0) {
      this.hp = Math.min(this.maxHp, this.hp + hpDiff);
    }

    this.showFloatingText(this.player.x, this.player.y - 34, `EQUIPPED: ${item.name}`, '#38bdf8');
    this.emitHud();
  }

  public salvageItem(itemId: string) {
    const idx = this.inventory.findIndex((i) => i.id === itemId);
    if (idx === -1) return;

    const [removed] = this.inventory.splice(idx, 1);
    const xpGain = removed.rarity === 'EXOTIC' ? 60 : removed.rarity === 'RARE' ? 30 : 15;
    this.grantXp(xpGain);
    this.showFloatingText(this.player.x, this.player.y - 28, `SALVAGED (+${xpGain} XP)`, '#94a3b8');
    this.emitHud();
  }

  private recalculateStats(healDelta: number) {
    const armorHp = this.equipped.ARMOR?.stats.maxHpBonus ?? 0;
    this.maxHp = this.baseMaxHp + armorHp;
    this.hp = Math.min(this.maxHp, this.hp + healDelta);
  }

  create() {
    this.cameras.main.setBackgroundColor('#0b101b');
    this.generatePixelArtTextures();

    const floor = this.add.tileSprite(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, WORLD_WIDTH, WORLD_HEIGHT, 'dungeon_tile');
    floor.setDepth(0);

    this.buildLinearMazeLayout();
    this.createMarkersAndPortal();

    this.playerLight = this.add.circle(POINT_A.x, POINT_A.y, 175, 0x38bdf8, 0.07).setDepth(2);
    this.meltdownAura = this.add.circle(POINT_A.x, POINT_A.y, 120, 0xf97316, 0.16).setDepth(3).setVisible(false);

    this.playerShadow = this.add.ellipse(POINT_A.x, POINT_A.y + 14, 24, 10, 0x020617, 0.65).setDepth(9);
    this.player = this.add.sprite(POINT_A.x, POINT_A.y, 'player_pixel').setScale(2).setDepth(10);

    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setZoom(CAMERA_ZOOM);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

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

    const viewW = this.scale.width || 960;
    const viewH = this.scale.height || 680;
    const invZoom = 1 / CAMERA_ZOOM;
    const offsetX = (viewW * (1 - invZoom)) / 2;
    const offsetY = (viewH * (1 - invZoom)) / 2;

    this.add
      .text(offsetX + 18, offsetY + 16, 'SECTOR 04 // LINEAR LABYRINTH (POINT A -> POINT B)', {
        fontSize: '15px',
        color: '#94a3b8',
        fontFamily: 'monospace',
      })
      .setScrollFactor(0)
      .setDepth(50);

    this.add
      .text(
        offsetX + 18,
        offsetY + viewH * invZoom - 28,
        'WASD: Bewegen | LMB: Bio-Shot | RMB: Stretch-Slam | Q: Phase Dash | SPACE: Meltdown | Versla Warden voor Portal B',
        {
          fontSize: '13px',
          color: '#64748b',
          fontFamily: 'monospace',
        }
      )
      .setScrollFactor(0)
      .setDepth(50);

    this.minimapGraphics = this.add.graphics().setScrollFactor(0).setDepth(60);

    this.setupSectorRun();
    this.emitHud();
  }

  private createMarkersAndPortal() {
    // Point A: Entry Pad
    const entryPad = this.add.circle(POINT_A.x, POINT_A.y, 44, 0x38bdf8, 0.14).setDepth(1);
    entryPad.setStrokeStyle(2, 0x38bdf8, 0.7);
    this.add
      .text(POINT_A.x, POINT_A.y - 56, '[POINT A] ENTRY AIRLOCK', {
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#7dd3fc',
        fontFamily: 'monospace',
      })
      .setOrigin(0.5)
      .setDepth(4);

    // Point B: Extraction Portal
    this.exitPortalOuter = this.add.circle(POINT_B.x, POINT_B.y, 56, 0xf43f5e, 0.18).setDepth(2);
    this.exitPortalOuter.setStrokeStyle(3, 0xf43f5e, 0.9);
    this.exitPortalInner = this.add.circle(POINT_B.x, POINT_B.y, 28, 0x881337, 0.65).setDepth(3);
    this.exitPortalLabel = this.add
      .text(POINT_B.x, POINT_B.y - 72, '[POINT B] PORTAL LOCKED (KILL WARDEN)', {
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#fda4af',
        backgroundColor: '#020617cc',
        padding: { x: 6, y: 2 },
        fontFamily: 'monospace',
      })
      .setOrigin(0.5)
      .setDepth(20);
  }

  private setPortalState(unlocked: boolean) {
    this.portalUnlocked = unlocked;
    if (unlocked) {
      this.exitPortalOuter.setFillStyle(0x2dd4bf, 0.25);
      this.exitPortalOuter.setStrokeStyle(3, 0x5eead4, 1);
      this.exitPortalInner.setFillStyle(0x38bdf8, 0.8);
      this.exitPortalLabel.setText('[POINT B] PORTAL OPEN — STEP IN!');
      this.exitPortalLabel.setColor('#5eead4');
    } else {
      this.exitPortalOuter.setFillStyle(0xf43f5e, 0.18);
      this.exitPortalOuter.setStrokeStyle(3, 0xf43f5e, 0.9);
      this.exitPortalInner.setFillStyle(0x881337, 0.65);
      this.exitPortalLabel.setText('[POINT B] PORTAL LOCKED (KILL WARDEN)');
      this.exitPortalLabel.setColor('#fda4af');
    }
  }

  private setupSectorRun() {
    this.sectorTransitionLock = false;
    this.setPortalState(false);

    // Starter drop near Point A + 2 secret alcove loot drops along the maze
    this.spawnLootDrop(POINT_A.x + 120, POINT_A.y, 'COMMON');
    this.spawnLootDrop(2480, 240, 'RARE');   // Alcove 1 (North-East dead-end)
    this.spawnLootDrop(260, 1840, 'EXOTIC'); // Alcove 2 (South-West dead-end)

    this.spawnLinearMazeEnemies();
  }

  private generatePixelArtTextures() {
    if (this.textures.exists('dungeon_tile')) return;

    const tileCanvas = this.textures.createCanvas('dungeon_tile', 48, 48)!;
    const tCtx = tileCanvas.getContext();
    tCtx.fillStyle = '#16202e';
    tCtx.fillRect(0, 0, 48, 48);
    tCtx.fillStyle = '#0f1722';
    tCtx.fillRect(0, 46, 48, 2);
    tCtx.fillRect(46, 0, 2, 48);
    tCtx.fillStyle = '#1e2b3d';
    tCtx.fillRect(0, 0, 46, 2);
    tCtx.fillRect(0, 0, 2, 46);
    tCtx.strokeStyle = '#111926';
    tCtx.lineWidth = 2;
    tCtx.strokeRect(10, 10, 26, 26);
    tCtx.strokeStyle = '#223145';
    tCtx.strokeRect(12, 12, 22, 22);
    tileCanvas.refresh();

    const makePixelSprite = (key: string, grid: string[], palette: Record<string, string>) => {
      const h = grid.length;
      const w = grid[0].length;
      const c = this.textures.createCanvas(key, w, h)!;
      const ctx = c.getContext();
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const ch = grid[y][x];
          if (ch !== '.' && palette[ch]) {
            ctx.fillStyle = palette[ch];
            ctx.fillRect(x, y, 1, 1);
          }
        }
      }
      c.refresh();
    };

    makePixelSprite(
      'player_pixel',
      [
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
      ],
      {
        C: '#38bdf8',
        W: '#e0f2fe',
        R: '#f43f5e',
        D: '#1e293b',
        B: '#64748b',
      }
    );

    makePixelSprite(
      'enemy_minion',
      [
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
      ],
      {
        K: '#0f172a',
        S: '#e2e8f0',
        E: '#ef4444',
        R: '#991b1b',
        D: '#334155',
      }
    );

    makePixelSprite(
      'enemy_elite',
      [
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
      ],
      {
        G: '#f59e0b',
        M: '#334155',
        Y: '#fef08a',
        R: '#ef4444',
      }
    );

    makePixelSprite(
      'boss_warden',
      [
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
      ],
      {
        T: '#2dd4bf',
        D: '#1e1b2e',
        R: '#fb7185',
      }
    );
  }

  private buildLinearMazeLayout() {
    // Winding labyrinth from Point A (top-left) -> East -> South-West -> South-East Boss Chamber (Point B)
    this.walls = [
      // Outer perimeter
      { x: 0, y: 0, w: WORLD_WIDTH, h: 64 },
      { x: 0, y: WORLD_HEIGHT - 64, w: WORLD_WIDTH, h: 64 },
      { x: 0, y: 0, w: 64, h: WORLD_HEIGHT },
      { x: WORLD_WIDTH - 64, y: 0, w: 64, h: WORLD_HEIGHT },

      // Corridor 1 bottom wall (forces player East from Point A, with choke-pillars)
      { x: 64, y: 460, w: 1860, h: 64 },
      { x: 640, y: 64, w: 56, h: 170 },
      { x: 1180, y: 290, w: 56, h: 170 },
      { x: 1720, y: 64, w: 56, h: 170 },

      // Divider between NE loot alcove (y < 460, x > 2180) and Corridor 2
      { x: 2180, y: 460, w: 556, h: 64 },

      // Corridor 2 (runs West from x=2180 back to x=280)
      { x: 520, y: 740, w: 2216, h: 64 },
      { x: 1620, y: 524, w: 56, h: 100 },
      { x: 1040, y: 640, w: 56, h: 100 },

      // Corridor 3 (runs East from x=280 across middle-south to x=2220)
      { x: 64, y: 1040, w: 1920, h: 64 },
      { x: 760, y: 804, w: 56, h: 110 },
      { x: 1420, y: 930, w: 56, h: 110 },

      // Corridor 4 (runs West from x=2220 to x=520, leading to SW Secret Alcove & Final Gate)
      { x: 520, y: 1340, w: 2216, h: 64 },
      { x: 1820, y: 1104, w: 56, h: 110 },
      { x: 1120, y: 1230, w: 56, h: 110 },

      // South-West Secret Alcove barrier (keeps alcove at x < 460, y > 1580 tucked away)
      { x: 460, y: 1600, w: 64, h: 436 },
      { x: 64, y: 1600, w: 210, h: 56 },

      // Final Boss Chamber Gate (narrow entry at x=1680 into SE Boss Arena)
      { x: 1680, y: 1404, w: 64, h: 320 },
      { x: 1680, y: 1920, w: 64, h: 116 },

      // Cover pillars inside Boss Chamber
      { x: 2040, y: 1580, w: 72, h: 72 },
      { x: 2040, y: 1840, w: 72, h: 72 },
    ];

    const wallGraphics = this.add.graphics().setDepth(5);
    for (const w of this.walls) {
      wallGraphics.fillStyle(0x020617, 0.55);
      wallGraphics.fillRect(w.x + 8, w.y + 14, w.w, w.h);

      wallGraphics.fillStyle(0x273549, 1);
      wallGraphics.fillRect(w.x, w.y, w.w, w.h);

      const faceHeight = Math.min(18, w.h * 0.4);
      wallGraphics.fillStyle(0x131c29, 1);
      wallGraphics.fillRect(w.x, w.y + w.h - faceHeight, w.w, faceHeight);

      wallGraphics.lineStyle(2, 0x475569, 0.9);
      wallGraphics.strokeRect(w.x, w.y, w.w, w.h);

      if (w.w <= 120 && w.h <= 180 && w.x > 100) {
        wallGraphics.fillStyle(0xef4444, 1);
        wallGraphics.fillRect(w.x + w.w / 2 - 4, w.y + w.h - faceHeight + 5, 8, 5);
        this.add.circle(w.x + w.w / 2, w.y + w.h - 8, 28, 0xef4444, 0.12).setDepth(4);
      }
    }
  }

  private isInsideWall(x: number, y: number, radius: number): boolean {
    for (const w of this.walls) {
      const closestX = Phaser.Math.Clamp(x, w.x, w.x + w.w);
      const closestY = Phaser.Math.Clamp(y, w.y, w.y + w.h);
      const dx = x - closestX;
      const dy = y - closestY;
      if (dx * dx + dy * dy < radius * radius) {
        return true;
      }
    }
    return false;
  }

  private moveWithWallSlide(obj: Phaser.GameObjects.Sprite, dx: number, dy: number, radius: number) {
    const nextX = Phaser.Math.Clamp(obj.x + dx, radius + 68, WORLD_WIDTH - radius - 68);
    if (!this.isInsideWall(nextX, obj.y, radius)) {
      obj.x = nextX;
    }

    const nextY = Phaser.Math.Clamp(obj.y + dy, radius + 68, WORLD_HEIGHT - radius - 68);
    if (!this.isInsideWall(obj.x, nextY, radius)) {
      obj.y = nextY;
    }
  }

  update(time: number, delta: number) {
    const dt = delta / 1000;

    this.primaryCd = Math.max(0, this.primaryCd - delta);
    this.slamCd = Math.max(0, this.slamCd - delta);
    this.dashCd = Math.max(0, this.dashCd - delta);

    const regenBonus = this.equipped.INJECTOR?.stats.energyRegenBonus ?? 0;
    this.energy = Math.min(this.maxEnergy, this.energy + (14 + regenBonus) * dt);

    if (this.meltdownTimer > 0) {
      this.meltdownTimer = Math.max(0, this.meltdownTimer - delta);
      this.heat = Math.max(0, (this.meltdownTimer / (4500 + this.upgrades.isotopeCore * 800)) * 100);
      this.meltdownAura.setVisible(true);
      this.meltdownAura.setPosition(this.player.x, this.player.y);
      this.applyMeltdownAuraDamage(dt);
    } else {
      this.meltdownAura.setVisible(false);
      this.heat = Math.max(0, this.heat - 4 * dt);
    }

    let vx = 0;
    let vy = 0;
    if (this.cursors.left.isDown || this.wasd.A.isDown) vx -= 1;
    if (this.cursors.right.isDown || this.wasd.D.isDown) vx += 1;
    if (this.cursors.up.isDown || this.wasd.W.isDown) vy -= 1;
    if (this.cursors.down.isDown || this.wasd.S.isDown) vy += 1;

    if (vx !== 0 || vy !== 0) {
      const len = Math.hypot(vx, vy);
      const speed = 265 + this.upgrades.flexibleMass * 22;
      this.moveWithWallSlide(this.player, (vx / len) * speed * dt, (vy / len) * speed * dt, 15);
      if (vx < 0) this.player.setFlipX(true);
      if (vx > 0) this.player.setFlipX(false);
    }

    this.playerShadow.setPosition(this.player.x, this.player.y + 14);
    this.playerLight.setPosition(this.player.x, this.player.y);

    if (Phaser.Input.Keyboard.JustDown(this.wasd.Q) && this.dashCd <= 0 && this.energy >= 20) {
      this.triggerPhaseDash(vx, vy);
    }

    if (Phaser.Input.Keyboard.JustDown(this.wasd.SPACE) && this.heat >= 80 && this.meltdownTimer <= 0) {
      this.triggerMeltdown();
    }

    if (this.input.activePointer.leftButtonDown() && this.primaryCd <= 0) {
      const worldPt = this.cameras.main.getWorldPoint(this.input.activePointer.x, this.input.activePointer.y);
      this.fireBioShot(worldPt.x, worldPt.y);
    }

    this.updateProjectiles(dt);
    this.updateEnemies(dt);
    this.updateGroundDrops(time, dt);
    this.updateExtractionPortal(time);
    this.drawMinimap();

    this.hudEmitTimer += delta;
    if (this.hudEmitTimer >= 100) {
      this.hudEmitTimer = 0;
      this.emitHud();
    }
  }

  private updateExtractionPortal(time: number) {
    const pulse = 1 + Math.sin(time / 240) * 0.08;
    this.exitPortalOuter.setScale(pulse);

    if (!this.portalUnlocked || this.sectorTransitionLock) return;

    const distToPortal = Phaser.Math.Distance.Between(this.player.x, this.player.y, POINT_B.x, POINT_B.y);
    if (distToPortal <= 54) {
      this.sectorTransitionLock = true;
      this.waveNumber += 1;

      // Clear leftover enemies & old ground drops before starting next sector run
      for (const e of this.enemies) {
        e.sprite.destroy();
        e.shadow.destroy();
        e.hpBarBg.destroy();
        e.hpBarFill.destroy();
        e.label?.destroy();
      }
      this.enemies = [];

      for (const d of this.groundDrops) {
        d.orb.destroy();
        d.ring.destroy();
        d.label.destroy();
      }
      this.groundDrops = [];

      this.player.setPosition(POINT_A.x, POINT_A.y);
      this.hp = this.maxHp;
      this.energy = this.maxEnergy;
      this.cameras.main.flash(260, 45, 212, 191, false);
      this.showFloatingText(POINT_A.x, POINT_A.y - 44, `SECTOR DEPTH ${this.waveNumber} // NEW RUN`, '#2dd4bf');

      this.setupSectorRun();
      this.emitHud();
    }
  }

  private spawnLootDrop(x: number, y: number, forcedRarity?: ItemRarity) {
    const roll = Math.random();
    const rarity: ItemRarity =
      forcedRarity ?? (roll < 0.14 ? 'EXOTIC' : roll < 0.48 ? 'RARE' : 'COMMON');

    const candidates = LOOT_POOL.filter((item) => item.rarity === rarity);
    const template = candidates[Math.floor(Math.random() * candidates.length)];

    const item: LootItem = {
      ...template,
      id: `item_${this.nextItemId++}`,
    };

    const colorHex = rarity === 'EXOTIC' ? 0xf59e0b : rarity === 'RARE' ? 0x38bdf8 : 0x34d399;
    const textColor = rarity === 'EXOTIC' ? '#fbbf24' : rarity === 'RARE' ? '#7dd3fc' : '#6ee7b7';

    const ring = this.add.circle(x, y, 18, colorHex, 0.22).setDepth(7);
    const orb = this.add.circle(x, y, 8, colorHex, 1).setDepth(8);
    orb.setStrokeStyle(2, 0xffffff);

    const label = this.add
      .text(x, y - 22, `[${rarity}] ${item.name}`, {
        fontSize: '11px',
        fontStyle: 'bold',
        color: textColor,
        backgroundColor: '#020617cc',
        padding: { x: 4, y: 2 },
        fontFamily: 'monospace',
      })
      .setOrigin(0.5)
      .setDepth(25);

    this.groundDrops.push({
      item,
      orb,
      ring,
      label,
      bobOffset: Math.random() * Math.PI * 2,
    });
  }

  private updateGroundDrops(time: number, dt: number) {
    for (let i = this.groundDrops.length - 1; i >= 0; i--) {
      const drop = this.groundDrops[i];
      const bob = Math.sin(time / 220 + drop.bobOffset) * 3;
      drop.orb.y += bob * dt * 4;
      drop.ring.setPosition(drop.orb.x, drop.orb.y);
      drop.label.setPosition(drop.orb.x, drop.orb.y - 24);

      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, drop.orb.x, drop.orb.y);

      if (dist < 130 && this.inventory.length < 12) {
        drop.orb.x = Phaser.Math.Linear(drop.orb.x, this.player.x, Math.min(1, 6 * dt));
        drop.orb.y = Phaser.Math.Linear(drop.orb.y, this.player.y, Math.min(1, 6 * dt));
      }

      if (dist <= 36) {
        if (this.inventory.length >= 12) {
          continue;
        }
        this.inventory.push(drop.item);
        const color = drop.item.rarity === 'EXOTIC' ? '#fbbf24' : drop.item.rarity === 'RARE' ? '#38bdf8' : '#34d399';
        this.showFloatingText(this.player.x, this.player.y - 34, `+ ${drop.item.name}`, color);

        drop.orb.destroy();
        drop.ring.destroy();
        drop.label.destroy();
        this.groundDrops.splice(i, 1);
        this.emitHud();
      }
    }
  }

  private drawMinimap() {
    const viewW = this.scale.width || 960;
    const invZoom = 1 / CAMERA_ZOOM;
    const offsetX = (viewW * (1 - invZoom)) / 2;
    const offsetY = ((this.scale.height || 680) * (1 - invZoom)) / 2;

    const mapW = 190;
    const mapH = 142;
    const padX = offsetX + viewW * invZoom - mapW - 18;
    const padY = offsetY + 18;
    const scaleX = mapW / WORLD_WIDTH;
    const scaleY = mapH / WORLD_HEIGHT;

    this.minimapGraphics.clear();
    this.minimapGraphics.fillStyle(0x020617, 0.88);
    this.minimapGraphics.fillRect(padX, padY, mapW, mapH);
    this.minimapGraphics.lineStyle(1.5, 0x334155, 1);
    this.minimapGraphics.strokeRect(padX, padY, mapW, mapH);

    // Maze walls
    this.minimapGraphics.fillStyle(0x475569, 0.95);
    for (const w of this.walls) {
      this.minimapGraphics.fillRect(
        padX + w.x * scaleX,
        padY + w.y * scaleY,
        Math.max(2, w.w * scaleX),
        Math.max(2, w.h * scaleY)
      );
    }

    // Point A marker (blue ring)
    this.minimapGraphics.lineStyle(1.5, 0x38bdf8, 1);
    this.minimapGraphics.strokeCircle(padX + POINT_A.x * scaleX, padY + POINT_A.y * scaleY, 4);

    // Point B Extraction Portal marker (teal when open, red when locked)
    this.minimapGraphics.fillStyle(this.portalUnlocked ? 0x2dd4bf : 0xf43f5e, 1);
    this.minimapGraphics.fillCircle(padX + POINT_B.x * scaleX, padY + POINT_B.y * scaleY, 5);

    // Loot orbs
    for (const drop of this.groundDrops) {
      this.minimapGraphics.fillStyle(drop.item.rarity === 'EXOTIC' ? 0xfbbf24 : 0x34d399, 1);
      this.minimapGraphics.fillCircle(padX + drop.orb.x * scaleX, padY + drop.orb.y * scaleY, 2.5);
    }

    // Enemies
    for (const enemy of this.enemies) {
      this.minimapGraphics.fillStyle(enemy.isBoss ? 0x2dd4bf : enemy.isElite ? 0xf59e0b : 0xf43f5e, 1);
      const dotSize = enemy.isBoss ? 6 : enemy.isElite ? 4 : 2.5;
      this.minimapGraphics.fillRect(
        padX + enemy.sprite.x * scaleX - dotSize / 2,
        padY + enemy.sprite.y * scaleY - dotSize / 2,
        dotSize,
        dotSize
      );
    }

    // Player dot
    this.minimapGraphics.fillStyle(0xffffff, 1);
    this.minimapGraphics.fillCircle(padX + this.player.x * scaleX, padY + this.player.y * scaleY, 3.5);
  }

  private fireBioShot(targetX: number, targetY: number) {
    const weaponSpeedBonus = (this.equipped.WEAPON?.stats.attackSpeedPct ?? 0) / 100;
    const baseInterval = Math.max(130, 300 - this.upgrades.flexibleMass * 28);
    this.primaryCd = Math.max(95, Math.round(baseInterval / (1 + weaponSpeedBonus)));

    const angle = Math.atan2(targetY - this.player.y, targetX - this.player.x);
    this.player.setFlipX(Math.cos(angle) < 0);

    const speed = 640;
    const glow = this.add.circle(this.player.x, this.player.y, 11, 0x38bdf8, 0.25).setDepth(11);
    const bullet = this.add.circle(this.player.x, this.player.y, 5, 0xe0f2fe).setDepth(12);

    const weaponDamage = this.equipped.WEAPON?.stats.damageBonus ?? 0;
    const baseDamage = 24 + this.upgrades.isotopeCore * 9 + weaponDamage;
    const multiplier = this.meltdownTimer > 0 ? 1.65 : 1;

    this.projectiles.push({
      shape: bullet,
      glow,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      damage: Math.round(baseDamage * multiplier),
      life: 1.5,
    });

    this.energy = Math.min(this.maxEnergy, this.energy + 8);
    this.heat = Math.min(100, this.heat + 6);
  }

  private triggerStretchSlam() {
    if (this.slamCd > 0 || this.energy < 25) return;
    this.energy -= 25;
    this.slamCd = 1600;
    this.heat = Math.min(100, this.heat + 18);

    const weaponDamage = this.equipped.WEAPON?.stats.damageBonus ?? 0;
    const radius = 135 + this.upgrades.bruteForce * 14;
    const damage = Math.round((58 + this.upgrades.bruteForce * 22 + weaponDamage) * (this.meltdownTimer > 0 ? 1.5 : 1));

    const ring = this.add.circle(this.player.x, this.player.y, radius, 0xf43f5e, 0.26).setDepth(8);
    ring.setStrokeStyle(3, 0xfb7185);
    this.tweens.add({
      targets: ring,
      alpha: 0,
      scale: 1.15,
      duration: 260,
      onComplete: () => ring.destroy(),
    });

    this.cameras.main.shake(120, 0.008);

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.sprite.x, enemy.sprite.y);
      if (dist <= radius + (enemy.isBoss ? 36 : 16)) {
        if (!enemy.isBoss) {
          const pushAngle = Math.atan2(enemy.sprite.y - this.player.y, enemy.sprite.x - this.player.x);
          this.moveWithWallSlide(
            enemy.sprite,
            Math.cos(pushAngle) * 44,
            Math.sin(pushAngle) * 44,
            enemy.isElite ? 20 : 14
          );
        }
        this.damageEnemy(enemy, damage, true);
      }
    }
  }

  private triggerPhaseDash(vx: number, vy: number) {
    const worldPt = this.cameras.main.getWorldPoint(this.input.activePointer.x, this.input.activePointer.y);
    const angle =
      vx !== 0 || vy !== 0
        ? Math.atan2(vy, vx)
        : Math.atan2(worldPt.y - this.player.y, worldPt.x - this.player.x);

    const candidateDistances = [180, 140, 100, 70];
    let destX: number | null = null;
    let destY: number | null = null;

    for (const dist of candidateDistances) {
      const tx = Phaser.Math.Clamp(this.player.x + Math.cos(angle) * dist, 84, WORLD_WIDTH - 84);
      const ty = Phaser.Math.Clamp(this.player.y + Math.sin(angle) * dist, 84, WORLD_HEIGHT - 84);
      if (!this.isInsideWall(tx, ty, 15)) {
        destX = tx;
        destY = ty;
        break;
      }
    }

    if (destX === null || destY === null) return;

    this.energy -= 20;
    this.dashCd = Math.max(900, 2100 - this.upgrades.flexibleMass * 220);

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
    const weaponDamage = this.equipped.WEAPON?.stats.damageBonus ?? 0;
    const auraDps = 45 + this.upgrades.isotopeCore * 15 + weaponDamage;
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.sprite.x, enemy.sprite.y);
      if (dist <= 125) {
        this.damageEnemy(enemy, auraDps * dt, false);
      }
    }
  }

  private updateProjectiles(dt: number) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      proj.life -= dt;
      proj.shape.x += proj.vx * dt;
      proj.shape.y += proj.vy * dt;
      proj.glow.setPosition(proj.shape.x, proj.shape.y);

      if (this.isInsideWall(proj.shape.x, proj.shape.y, 5)) {
        proj.shape.destroy();
        proj.glow.destroy();
        this.projectiles.splice(i, 1);
        continue;
      }

      let hit = false;
      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const enemy = this.enemies[j];
        const hitRadius = enemy.isBoss ? 44 : enemy.isElite ? 24 : 18;
        if (Phaser.Math.Distance.Between(proj.shape.x, proj.shape.y, enemy.sprite.x, enemy.sprite.y) <= hitRadius) {
          this.damageEnemy(enemy, proj.damage, true);
          hit = true;
          break;
        }
      }

      if (hit || proj.life <= 0) {
        proj.shape.destroy();
        proj.glow.destroy();
        this.projectiles.splice(i, 1);
      }
    }
  }

  private updateEnemies(dt: number) {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      enemy.hitCooldown = Math.max(0, enemy.hitCooldown - dt);

      const distToPlayer = Phaser.Math.Distance.Between(enemy.sprite.x, enemy.sprite.y, this.player.x, this.player.y);
      const aggroRange = enemy.isBoss ? 560 : 460;

      if (distToPlayer < aggroRange) {
        const angle = Math.atan2(this.player.y - enemy.sprite.y, this.player.x - enemy.sprite.x);
        this.moveWithWallSlide(
          enemy.sprite,
          Math.cos(angle) * enemy.speed * dt,
          Math.sin(angle) * enemy.speed * dt,
          enemy.isBoss ? 36 : enemy.isElite ? 20 : 14
        );
        if (Math.cos(angle) < 0) enemy.sprite.setFlipX(true);
        if (Math.cos(angle) > 0) enemy.sprite.setFlipX(false);
      }

      const shadowOffsetY = enemy.isBoss ? 38 : enemy.isElite ? 18 : 13;
      enemy.shadow.setPosition(enemy.sprite.x, enemy.sprite.y + shadowOffsetY);

      const barY = enemy.sprite.y - (enemy.isBoss ? 52 : enemy.isElite ? 28 : 22);
      enemy.hpBarBg.setPosition(enemy.sprite.x, barY);
      enemy.hpBarFill.setPosition(enemy.sprite.x - (enemy.hpBarBg.width - enemy.hpBarFill.width) / 2, barY);
      if (enemy.label) {
        enemy.label.setPosition(enemy.sprite.x, barY - 14);
      }

      const meleeRange = enemy.isBoss ? 54 : enemy.isElite ? 34 : 28;
      if (distToPlayer <= meleeRange && enemy.hitCooldown <= 0) {
        enemy.hitCooldown = 0.85;
        this.damagePlayer(enemy.damage);
      }
    }
  }

  private damagePlayer(amount: number) {
    const reductionPct = (this.equipped.ARMOR?.stats.damageReductionPct ?? 0) / 100;
    const mitigated = Math.max(1, Math.round(amount * (1 - reductionPct)));

    this.hp = Math.max(0, this.hp - mitigated);
    this.cameras.main.shake(90, 0.006);
    this.showFloatingText(this.player.x, this.player.y - 24, `-${mitigated}`, '#f43f5e');

    if (this.hp <= 0) {
      this.hp = this.maxHp;
      this.energy = this.maxEnergy;
      this.player.setPosition(POINT_A.x, POINT_A.y);
      this.showFloatingText(this.player.x, this.player.y - 36, 'CLONE RESTORED AT POINT A', '#34d399');
    }
  }

  private damageEnemy(enemy: EnemyEntity, amount: number, showNumber: boolean) {
    const rawDamage = enemy.affix === 'ARMORED' || enemy.isBoss ? amount * 0.78 : amount;
    enemy.hp -= rawDamage;

    const ratio = Math.max(0, enemy.hp / enemy.maxHp);
    enemy.hpBarFill.width = enemy.hpBarBg.width * ratio;

    const displayDmg = Math.round(rawDamage);
    if (showNumber && displayDmg >= 1) {
      this.showFloatingText(
        enemy.sprite.x,
        enemy.sprite.y - 20,
        `${displayDmg}`,
        enemy.isBoss ? '#2dd4bf' : enemy.isElite ? '#fbbf24' : '#e2e8f0'
      );
    }

    if (enemy.hp <= 0) {
      this.killEnemy(enemy);
    }
  }

  private killEnemy(enemy: EnemyEntity) {
    const idx = this.enemies.indexOf(enemy);
    if (idx !== -1) this.enemies.splice(idx, 1);

    const lifesteal = this.equipped.INJECTOR?.stats.lifestealOnKill ?? 0;
    if (lifesteal > 0 && this.hp < this.maxHp) {
      this.hp = Math.min(this.maxHp, this.hp + lifesteal);
      this.showFloatingText(this.player.x + 14, this.player.y - 18, `+${lifesteal} HP`, '#34d399');
    }

    if (enemy.affix === 'VOLATILE') {
      const blast = this.add.circle(enemy.sprite.x, enemy.sprite.y, 100, 0xf97316, 0.35).setDepth(15);
      this.tweens.add({ targets: blast, alpha: 0, scale: 1.2, duration: 300, onComplete: () => blast.destroy() });
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.sprite.x, enemy.sprite.y) <= 100) {
        this.damagePlayer(18);
      }
    }

    if (enemy.isBoss) {
      this.spawnLootDrop(enemy.sprite.x - 28, enemy.sprite.y, 'EXOTIC');
      this.spawnLootDrop(enemy.sprite.x + 28, enemy.sprite.y, 'RARE');
      this.setPortalState(true);
      this.cameras.main.flash(200, 45, 212, 191, false);
      this.showFloatingText(enemy.sprite.x, enemy.sprite.y - 44, 'EXTRACTION PORTAL UNLOCKED!', '#2dd4bf');
    } else if (enemy.isElite) {
      this.spawnLootDrop(enemy.sprite.x, enemy.sprite.y, Math.random() < 0.3 ? 'EXOTIC' : 'RARE');
    } else if (Math.random() < 0.28) {
      this.spawnLootDrop(enemy.sprite.x, enemy.sprite.y);
    }

    this.grantXp(enemy.xpValue);

    enemy.sprite.destroy();
    enemy.shadow.destroy();
    enemy.hpBarBg.destroy();
    enemy.hpBarFill.destroy();
    enemy.label?.destroy();
    this.emitHud();
  }

  private grantXp(amount: number) {
    this.xp += amount;
    while (this.xp >= this.xpToNext) {
      this.xp -= this.xpToNext;
      this.level += 1;
      this.dnaPoints += 1;
      this.xpToNext = Math.round(this.xpToNext * 1.35);
      this.hp = this.maxHp;
      this.showFloatingText(this.player.x, this.player.y - 44, `LEVEL UP! +1 DNA POINT`, '#c084fc');
    }
  }

  private spawnLinearMazeEnemies() {
    const scale = 1 + (this.waveNumber - 1) * 0.25;

    // 4 packs placed sequentially along the corridors from Point A to Point B
    const packs: Array<{ cx: number; cy: number; count: number; affix: 'ARMORED' | 'FAST' | 'VOLATILE' }> = [
      { cx: 1460, cy: 260, count: 4, affix: 'FAST' },      // Corridor 1 (North)
      { cx: 1360, cy: 630, count: 5, affix: 'ARMORED' },   // Corridor 2 (Heading West)
      { cx: 1120, cy: 920, count: 5, affix: 'VOLATILE' },  // Corridor 3 (Heading East)
      { cx: 1440, cy: 1220, count: 5, affix: 'ARMORED' },  // Corridor 4 (Approach to Boss Gate)
    ];

    for (const pack of packs) {
      for (let i = 0; i < pack.count; i++) {
        const isElite = i === 0;
        const offsetX = isElite ? 0 : ((i % 2 === 0 ? 1 : -1) * 55);
        const offsetY = isElite ? 0 : (i < 3 ? -42 : 42);
        let x = pack.cx + offsetX;
        let y = pack.cy + offsetY;

        if (this.isInsideWall(x, y, 22)) {
          x = pack.cx;
          y = pack.cy;
        }

        this.createEnemyEntity(x, y, isElite, false, isElite ? pack.affix : undefined, scale);
      }
    }

    // Sector Warden guarding Point B in the South-East Boss Chamber
    this.createEnemyEntity(2260, 1740, true, true, 'TITAN', scale);
  }

  private createEnemyEntity(
    x: number,
    y: number,
    isElite: boolean,
    isBoss: boolean,
    affix: 'ARMORED' | 'FAST' | 'VOLATILE' | 'TITAN' | undefined,
    scale: number
  ) {
    const texture = isBoss ? 'boss_warden' : isElite ? 'enemy_elite' : 'enemy_minion';
    const spriteScale = isBoss ? 3.2 : isElite ? 2.1 : 1.9;

    const shadow = this.add
      .ellipse(x, y + (isBoss ? 38 : 15), isBoss ? 86 : isElite ? 34 : 24, isBoss ? 28 : 10, 0x020617, 0.7)
      .setDepth(8);

    if (isBoss) {
      const bossSpot = this.add.circle(x, y, 130, 0x2dd4bf, 0.14).setDepth(3);
      this.tweens.add({ targets: bossSpot, alpha: 0.06, duration: 1500, yoyo: true, repeat: -1 });
      this.events.on('update', () => {
        if (bossSpot.active && sprite.active) {
          bossSpot.setPosition(sprite.x, sprite.y);
        } else if (bossSpot.active) {
          bossSpot.destroy();
        }
      });
    }

    const sprite = this.add.sprite(x, y, texture).setScale(spriteScale).setDepth(10);

    const barW = isBoss ? 96 : isElite ? 48 : 30;
    const hpBarBg = this.add.rectangle(x, y - 24, barW, 5, 0x0f172a).setDepth(15);
    const hpBarFill = this.add
      .rectangle(x, y - 24, barW, 5, isBoss ? 0x2dd4bf : isElite ? 0xfbbf24 : 0xf43f5e)
      .setDepth(16);

    const label = isElite
      ? this.add
          .text(x, y - 38, isBoss ? '☠ SECTOR WARDEN [TITAN]' : `★ ${affix}`, {
            fontSize: isBoss ? '13px' : '11px',
            color: isBoss ? '#5eead4' : '#fde047',
            fontStyle: 'bold',
            fontFamily: 'monospace',
          })
          .setOrigin(0.5)
          .setDepth(17)
      : undefined;

    const baseHp = isBoss ? 850 : isElite ? 220 : 68;
    const maxHp = Math.round(baseHp * scale);

    this.enemies.push({
      id: this.nextEnemyId++,
      sprite,
      shadow,
      hpBarBg,
      hpBarFill,
      label,
      hp: maxHp,
      maxHp,
      speed: isBoss ? 88 : affix === 'FAST' ? 172 : isElite ? 108 : 136,
      damage: Math.round((isBoss ? 28 : isElite ? 18 : 9) * scale),
      xpValue: isBoss ? 220 : isElite ? 65 : 22,
      isElite,
      isBoss,
      affix,
      hitCooldown: 0,
    });
  }

  private showFloatingText(x: number, y: number, text: string, color: string) {
    const label = this.add
      .text(x, y, text, {
        fontSize: '14px',
        fontStyle: 'bold',
        color,
        fontFamily: 'monospace',
      })
      .setOrigin(0.5)
      .setDepth(40);

    this.tweens.add({
      targets: label,
      y: y - 30,
      alpha: 0,
      duration: 650,
      onComplete: () => label.destroy(),
    });
  }

  private emitHud() {
    if (!this.onHudUpdate) return;
    this.onHudUpdate({
      hp: Math.round(this.hp),
      maxHp: this.maxHp,
      energy: Math.round(this.energy),
      maxEnergy: this.maxEnergy,
      heat: Math.round(this.heat),
      meltdownActive: this.meltdownTimer > 0,
      xp: this.xp,
      xpToNext: this.xpToNext,
      level: this.level,
      dnaPoints: this.dnaPoints,
      packNumber: this.waveNumber,
      enemiesRemaining: this.enemies.length,
      cooldowns: {
        slam: Number((this.slamCd / 1000).toFixed(1)),
        dash: Number((this.dashCd / 1000).toFixed(1)),
      },
      upgrades: { ...this.upgrades },
      equipped: { ...this.equipped },
      inventory: [...this.inventory],
    });
  }
}

export const HudSnapshot = null as unknown as HudSnapshot;
export const SomaticUpgrades = null as unknown as SomaticUpgrades;
