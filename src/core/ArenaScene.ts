import Phaser from 'phaser';

export type ItemSlot = 'WEAPON' | 'ARMOR' | 'INJECTOR';
export type ItemRarity = 'COMMON' | 'RARE' | 'EXOTIC';
export type RunOutcome = 'PLAYING' | 'VICTORY' | 'WIPE';

export type SkillKey = 'bioShot' | 'phaseDodge' | 'coneSlam' | 'meltdownUlt';

export type SupportGemId =
  | 'scatterSplit'
  | 'highVelocity'
  | 'magnifiedArea'
  | 'seismicEcho'
  | 'brutalOvercharge'
  | 'essenceEfficiency'
  | 'vampiricSiphon'
  | 'volatileCatalyst';

export const ALL_SUPPORT_GEM_IDS: SupportGemId[] = [
  'scatterSplit',
  'highVelocity',
  'magnifiedArea',
  'seismicEcho',
  'brutalOvercharge',
  'essenceEfficiency',
  'vampiricSiphon',
  'volatileCatalyst',
];

export const GEM_DISPLAY_NAMES: Record<SupportGemId, string> = {
  scatterSplit: 'Scatter Split',
  highVelocity: 'High-Velocity Reach',
  magnifiedArea: 'Magnified Area',
  seismicEcho: 'Seismic Echo',
  brutalOvercharge: 'Brutal Overcharge',
  essenceEfficiency: 'Essence Efficiency',
  vampiricSiphon: 'Vampiric Siphon',
  volatileCatalyst: 'Volatile Catalyst',
};

export interface SkillTree {
  unlocked: Record<SkillKey, boolean>;
  sockets: Record<SkillKey, SupportGemId[]>;
  ownedGems: SupportGemId[];
}

export interface LootItem {
  id: string;
  name: string;
  slot: ItemSlot;
  rarity: ItemRarity;
  description: string;
  stats: {
    damageBonus?: number;
    maxHpBonus?: number;
    speedBonus?: number;
    energyRegenBonus?: number;
  };
}

export interface DungeonDef {
  id: string;
  name: string;
  bossName: string;
  recommendedLevel: number;
  difficultyLabel: string;
  enemyMultiplier: number;
  rareBonusChance: number;
  bg: number;
  floorA: number;
  floorB: number;
  gridLine: number;
  wallFill: number;
  wallTrim: number;
  accent: string;
}

export const DUNGEONS: DungeonDef[] = [
  {
    id: 'cryo',
    name: 'Cryo Reactor',
    bossName: 'Cryo-Warden Vex',
    recommendedLevel: 1,
    difficultyLabel: 'Normal (Lvl 1+)',
    enemyMultiplier: 1.0,
    rareBonusChance: 0.0,
    bg: 0x0b101b,
    floorA: 0x111927,
    floorB: 0x152033,
    gridLine: 0x1e2d44,
    wallFill: 0x26354d,
    wallTrim: 0x38bdf8,
    accent: '#38bdf8',
  },
  {
    id: 'bio',
    name: 'Bio-Hazard Lab',
    bossName: 'Brood-Matriarch Syl',
    recommendedLevel: 4,
    difficultyLabel: 'Heroic (Lvl 4+)',
    enemyMultiplier: 1.45,
    rareBonusChance: 0.15,
    bg: 0x081410,
    floorA: 0x0f211b,
    floorB: 0x142b23,
    gridLine: 0x1d3d32,
    wallFill: 0x244a3d,
    wallTrim: 0x10b981,
    accent: '#34d399',
  },
  {
    id: 'foundry',
    name: 'Isotope Foundry',
    bossName: 'Forgemaster Kael',
    recommendedLevel: 8,
    difficultyLabel: 'Heroic+ (Lvl 8+)',
    enemyMultiplier: 2.0,
    rareBonusChance: 0.30,
    bg: 0x140d09,
    floorA: 0x1f1510,
    floorB: 0x291c15,
    gridLine: 0x3b281e,
    wallFill: 0x473023,
    wallTrim: 0xf59e0b,
    accent: '#fbbf24',
  },
  {
    id: 'crimson',
    name: 'Crimson Containment',
    bossName: 'High Inquisitor Malakor',
    recommendedLevel: 13,
    difficultyLabel: 'Mythic (Lvl 13+)',
    enemyMultiplier: 2.8,
    rareBonusChance: 0.45,
    bg: 0x16090d,
    floorA: 0x241016,
    floorB: 0x2e151d,
    gridLine: 0x451f2b,
    wallFill: 0x542634,
    wallTrim: 0xf43f5e,
    accent: '#fb7185',
  },
  {
    id: 'void',
    name: 'Void Relay',
    bossName: 'Archon of the Rift',
    recommendedLevel: 18,
    difficultyLabel: 'Mythic+ (Lvl 18-20)',
    enemyMultiplier: 3.8,
    rareBonusChance: 0.65,
    bg: 0x100b1a,
    floorA: 0x191229,
    floorB: 0x211836,
    gridLine: 0x31244f,
    wallFill: 0x3d2d61,
    wallTrim: 0xa855f7,
    accent: '#c084fc',
  },
];

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
  maxLevel: number;
  maxSocketsPerSkill: number;
  dnaPoints: number;
  activeDungeon: DungeonDef;
  dungeonsClearedTotal: number;
  liberatedZones: string[];
  worldTier: number;
  enemiesRemaining: number;
  manaCosts: { slam: number; dodge: number };
  skills: SkillTree;
  equipped: Record<ItemSlot, LootItem | null>;
  inventory: LootItem[];
  runOutcome: RunOutcome;
  bossRewardItem: LootItem | null;
  bossRewardGem: SupportGemId | null;
  dungeonStats: {
    kills: number;
    bossDefeated: boolean;
    xpEarned: number;
    lootFound: number;
    gemsFound: number;
  };
}

interface EnemyData {
  sprite: Phaser.GameObjects.Container;
  body: Phaser.Physics.Arcade.Body;
  hpBar: Phaser.GameObjects.Rectangle;
  hp: number;
  maxHp: number;
  speed: number;
  damage: number;
  xpValue: number;
  isBoss: boolean;
  isElite: boolean;
  lastAttackAt: number;
}

interface ProjectileData {
  sprite: Phaser.GameObjects.Arc;
  body: Phaser.Physics.Arcade.Body;
  damage: number;
  fromPlayer: boolean;
  expiresAt: number;
}

interface GroundDropData {
  sprite: Phaser.GameObjects.Container;
  kind: 'GEAR' | 'GEM';
  item?: LootItem;
  gemId?: SupportGemId;
}

export class ArenaScene extends Phaser.Scene {
  private readonly worldWidth = 2800;
  private readonly worldHeight = 2100;
  private readonly maxLevel = 20;

  private player!: Phaser.GameObjects.Container;
  private playerBody!: Phaser.Physics.Arcade.Body;
  private meltdownAura!: Phaser.GameObjects.Arc;
  private minimapGraphics!: Phaser.GameObjects.Graphics;

  private walls!: Phaser.Physics.Arcade.StaticGroup;
  private wallRects: Phaser.Geom.Rectangle[] = [];
  private enemies: EnemyData[] = [];
  private projectiles: ProjectileData[] = [];
  private groundDrops: GroundDropData[] = [];

  private exitDoorLeft!: Phaser.GameObjects.Rectangle;
  private exitDoorRight!: Phaser.GameObjects.Rectangle;
  private exitDoorBlocker!: Phaser.GameObjects.Rectangle;
  private exitDoorLabel!: Phaser.GameObjects.Text;
  private exitDoorZone!: Phaser.Geom.Rectangle;
  private exitDoorOpen = false;
  private sceneReady = false;

  // Blijvende Karakter-progressie (Max Level 20)
  private baseMaxHp = 120;
  private hp = 120;
  private baseMaxEnergy = 100;
  private energy = 100;
  private heat = 0;
  private meltdownActive = false;
  private meltdownEndsAt = 0;

  private xp = 0;
  private xpToNext = 100;
  private level = 1;
  private dnaPoints = 0;
  private dungeonsClearedTotal = 0;
  private liberatedZones: string[] = [];
  private worldTier = 1;
  private activeDungeon: DungeonDef = DUNGEONS[0];

  // Start op Level 1 zonder gevonden Support Gems; deze vind je als drops op de grond
  private skills: SkillTree = {
    unlocked: { bioShot: true, phaseDodge: true, coneSlam: false, meltdownUlt: false },
    sockets: { bioShot: [], phaseDodge: [], coneSlam: [], meltdownUlt: [] },
    ownedGems: [],
  };

  private equipped: Record<ItemSlot, LootItem | null> = {
    WEAPON: null,
    ARMOR: null,
    INJECTOR: null,
  };
  private inventory: LootItem[] = [];

  private runOutcome: RunOutcome = 'PLAYING';
  private bossRewardItem: LootItem | null = null;
  private bossRewardGem: SupportGemId | null = null;
  private dungeonStats = {
    kills: 0,
    bossDefeated: false,
    xpEarned: 0,
    lootFound: 0,
    gemsFound: 0,
  };

  private lastShotAt = 0;
  private invulnerableUntil = 0;
  private lastHudPush = 0;

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  };
  private spaceKey!: Phaser.Input.Keyboard.Key;
  private eKey!: Phaser.Input.Keyboard.Key;

  private hudCallback: ((snapshot: HudSnapshot) => void) | null = null;

  constructor() {
    super('ArenaScene');
  }

  public setHudCallback(cb: (snapshot: HudSnapshot) => void): void {
    this.hudCallback = cb;
    this.pushHud(true);
  }

  public getMaxSocketsForLevel(): number {
    if (this.level >= 20) return 3;
    if (this.level >= 10) return 2;
    return 1;
  }

  public resetWorldCampaign(): void {
    this.liberatedZones = [];
    this.worldTier += 1;
    this.pushHud(true);
  }

  public startDungeon(dungeonId: string): void {
    const chosen = DUNGEONS.find((d) => d.id === dungeonId) ?? DUNGEONS[0];
    this.activeDungeon = chosen;
    this.runOutcome = 'PLAYING';
    this.bossRewardItem = null;
    this.bossRewardGem = null;
    this.hp = this.getMaxHp();
    this.energy = this.baseMaxEnergy;
    this.heat = 0;
    this.meltdownActive = false;
    this.invulnerableUntil = 0;
    this.dungeonStats = {
      kills: 0,
      bossDefeated: false,
      xpEarned: 0,
      lootFound: 0,
      gemsFound: 0,
    };

    if (this.sceneReady) {
      this.buildProceduralDungeon(false);
    }
    this.pushHud(true);
  }

  public retryCurrentDungeon(): void {
    this.startDungeon(this.activeDungeon.id);
  }

  public unlockSkill(skill: SkillKey): void {
    if (this.dnaPoints <= 0 || this.skills.unlocked[skill]) return;
    this.dnaPoints -= 1;
    this.skills.unlocked[skill] = true;
    this.pushHud(true);
  }

  public socketSupport(skill: SkillKey, gem: SupportGemId): void {
    if (!this.skills.unlocked[skill]) return;
    if (!this.skills.ownedGems.includes(gem)) return;

    const maxSockets = this.getMaxSocketsForLevel();
    if (this.skills.sockets[skill].length >= maxSockets) return;

    const usedAnywhere = Object.values(this.skills.sockets).some((list) => list.includes(gem));
    if (usedAnywhere) return;

    this.skills.sockets[skill].push(gem);
    this.pushHud(true);
  }

  public equipItem(itemId: string): void {
    const idx = this.inventory.findIndex((i) => i.id === itemId);
    if (idx === -1) return;
    const item = this.inventory[idx];
    const previous = this.equipped[item.slot];
    this.equipped[item.slot] = item;
    this.inventory.splice(idx, 1);
    if (previous) {
      this.inventory.push(previous);
    }
    this.hp = Math.min(this.getMaxHp(), this.hp + (item.stats.maxHpBonus ?? 0));
    this.pushHud(true);
  }

  public salvageItem(itemId: string): void {
    const idx = this.inventory.findIndex((i) => i.id === itemId);
    if (idx === -1) return;
    const [removed] = this.inventory.splice(idx, 1);
    const xpGain = removed.rarity === 'EXOTIC' ? 95 : removed.rarity === 'RARE' ? 45 : 20;
    this.grantXp(xpGain);
    this.pushHud(true);
  }

  private hasGem(skill: SkillKey, gem: SupportGemId): boolean {
    return this.skills.sockets[skill].includes(gem);
  }

  private getSlamManaCost(): number {
    let cost = 25;
    if (this.hasGem('coneSlam', 'brutalOvercharge')) cost += 8;
    if (this.hasGem('coneSlam', 'essenceEfficiency')) cost = Math.round(cost * 0.65);
    return cost;
  }

  private getDodgeManaCost(): number {
    let cost = 20;
    if (this.hasGem('phaseDodge', 'brutalOvercharge')) cost += 8;
    if (this.hasGem('phaseDodge', 'essenceEfficiency')) cost = Math.round(cost * 0.65);
    return cost;
  }

  private getMaxHp(): number {
    const cryoBonus = this.liberatedZones.includes('cryo') ? 25 : 0;
    const crimsonBonus = this.liberatedZones.includes('crimson') ? 45 : 0;
    const levelScaling = (this.level - 1) * 14;
    return (
      this.baseMaxHp +
      levelScaling +
      cryoBonus +
      crimsonBonus +
      (this.equipped.ARMOR?.stats.maxHpBonus ?? 0) +
      (this.equipped.INJECTOR?.stats.maxHpBonus ?? 0)
    );
  }

  private getMoveSpeed(): number {
    return 250 + (this.equipped.ARMOR?.stats.speedBonus ?? 0) + (this.equipped.INJECTOR?.stats.speedBonus ?? 0);
  }

  private getShotDamage(): number {
    const foundryBonus = this.liberatedZones.includes('foundry') ? 5 : 0;
    const voidBonus = this.liberatedZones.includes('void') ? 8 : 0;
    const levelScaling = (this.level - 1) * 2;
    let dmg =
      16 +
      levelScaling +
      foundryBonus +
      voidBonus +
      (this.equipped.WEAPON?.stats.damageBonus ?? 0) +
      (this.equipped.INJECTOR?.stats.damageBonus ?? 0);

    if (this.hasGem('bioShot', 'brutalOvercharge')) dmg = Math.round(dmg * 1.4);
    if (this.hasGem('bioShot', 'volatileCatalyst') && Math.random() < 0.25) dmg *= 2;
    return dmg;
  }

  public create(): void {
    this.physics.world.setBounds(0, 0, this.worldWidth, this.worldHeight);
    this.cameras.main.setBounds(0, 0, this.worldWidth, this.worldHeight);

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = {
      W: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
    this.spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.eKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E);

    this.input.mouse?.disableContextMenu();
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.runOutcome !== 'PLAYING') return;
      if (pointer.rightButtonDown()) {
        this.tryConeSlam(pointer);
      } else if (pointer.leftButtonDown()) {
        this.tryBioShot(pointer);
      }
    });

    this.sceneReady = true;
    this.buildProceduralDungeon(true);
  }

  private buildProceduralDungeon(isInitial: boolean): void {
    this.exitDoorOpen = false;

    if (!isInitial) {
      this.children.removeAll(true);
      this.enemies = [];
      this.projectiles = [];
      this.groundDrops = [];
      this.wallRects = [];
    }

    const theme = this.activeDungeon;
    this.cameras.main.setBackgroundColor(theme.bg);

    const floorGfx = this.add.graphics();
    const tileSize = 140;
    for (let x = 0; x < this.worldWidth; x += tileSize) {
      for (let y = 0; y < this.worldHeight; y += tileSize) {
        const isAlt = ((x / tileSize + y / tileSize) & 1) === 0;
        floorGfx.fillStyle(isAlt ? theme.floorA : theme.floorB, 1);
        floorGfx.fillRect(x, y, tileSize, tileSize);
        floorGfx.lineStyle(1, theme.gridLine, 0.7);
        floorGfx.strokeRect(x + 12, y + 12, tileSize - 24, tileSize - 24);
      }
    }

    this.walls = this.physics.add.staticGroup();
    const t = 44;

    this.addWall(this.worldWidth / 2, t / 2, this.worldWidth, t);
    this.addWall(this.worldWidth / 2, this.worldHeight - t / 2, this.worldWidth, t);
    this.addWall(t / 2, this.worldHeight / 2, t, this.worldHeight);
    this.addWall(this.worldWidth - t / 2, this.worldHeight / 2, t, this.worldHeight);

    const rowY = [540, 1060, 1580];
    const gapPositions = [
      Phaser.Math.Between(2150, 2480),
      Phaser.Math.Between(340, 760),
      Phaser.Math.Between(1850, 2320),
    ];
    const gapWidth = 340;

    rowY.forEach((y, idx) => {
      const gapCenter = gapPositions[idx];
      const leftWidth = Math.max(120, gapCenter - gapWidth / 2 - t);
      const rightStart = gapCenter + gapWidth / 2;
      const rightWidth = Math.max(120, this.worldWidth - t - rightStart);

      this.addWall(t + leftWidth / 2, y, leftWidth, 42);
      this.addWall(rightStart + rightWidth / 2, y, rightWidth, 42);

      const pillarCount = Phaser.Math.Between(2, 3);
      for (let p = 0; p < pillarCount; p++) {
        const px = Phaser.Math.Between(480, 2300);
        const py = y - 260 + Phaser.Math.Between(-70, 70);
        if (Math.abs(px - gapCenter) > 240) {
          this.addWall(px, py, 56, Phaser.Math.Between(140, 210));
        }
      }
    });

    this.add.text(140, 82, `DUNGEON // ${theme.name.toUpperCase()} — BOSS: ${theme.bossName.toUpperCase()}`, {
      fontFamily: 'monospace',
      fontSize: '15px',
      color: theme.accent,
    });

    const startX = 280;
    const startY = 280;
    this.add.circle(startX, startY, 92, theme.wallTrim, 0.14);
    this.add.circle(startX, startY, 54).setStrokeStyle(2, theme.wallTrim, 0.8);
    this.add
      .text(startX, startY - 76, '[ENTRY] DUNGEON ENTRANCE', {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#e2e8f0',
      })
      .setOrigin(0.5);

    const doorX = 2520;
    const doorY = 1860;
    this.exitDoorZone = new Phaser.Geom.Rectangle(doorX - 95, doorY - 85, 190, 170);

    this.add.rectangle(doorX, doorY, 190, 140, 0x090d16, 0.9).setStrokeStyle(3, 0x475569);
    this.exitDoorLeft = this.add.rectangle(doorX - 42, doorY, 82, 126, 0x991b1b, 0.95).setStrokeStyle(2, 0xf87171);
    this.exitDoorRight = this.add.rectangle(doorX + 42, doorY, 82, 126, 0x991b1b, 0.95).setStrokeStyle(2, 0xf87171);

    this.exitDoorBlocker = this.add.rectangle(doorX, doorY, 176, 128, 0xff0000, 0);
    this.physics.add.existing(this.exitDoorBlocker, true);

    this.exitDoorLabel = this.add
      .text(doorX, doorY - 96, `[LOCKED] VERSLA ${theme.bossName.toUpperCase()}`, {
        fontFamily: 'monospace',
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#f87171',
        backgroundColor: '#090d16cc',
        padding: { x: 8, y: 4 },
      })
      .setOrigin(0.5);

    this.createPlayer(startX, startY);
    this.physics.add.collider(this.player, this.walls);
    this.physics.add.collider(this.player, this.exitDoorBlocker);

    this.spawnDungeonEnemies(doorX - 240, doorY - 40);

    this.minimapGraphics = this.add.graphics().setScrollFactor(0).setDepth(50);
    this.add
      .text(
        18,
        648,
        'WASD: Bewegen | LMB: Bio-Shot | RMB: Cone-Slam | SPATIE: Dodge | E: Meltdown | [K] Support Sockets',
        {
          fontFamily: 'monospace',
          fontSize: '12px',
          color: '#cbd5e1',
          backgroundColor: '#060a12bb',
          padding: { x: 8, y: 3 },
        }
      )
      .setScrollFactor(0)
      .setDepth(50);

    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.cameras.main.flash(300, 15, 23, 42);
    this.pushHud(true);
  }

  private addWall(x: number, y: number, w: number, h: number): void {
    const rect = this.add.rectangle(x, y, w, h, this.activeDungeon.wallFill);
    rect.setStrokeStyle(2, this.activeDungeon.wallTrim, 0.45);
    this.walls.add(rect);
    this.wallRects.push(new Phaser.Geom.Rectangle(x - w / 2, y - h / 2, w, h));
  }

  private createPlayer(x: number, y: number): void {
    const auraRadius = this.hasGem('meltdownUlt', 'magnifiedArea') ? 155 : 95;
    this.meltdownAura = this.add.circle(0, 0, auraRadius, 0xf97316, 0.22);
    this.meltdownAura.setStrokeStyle(2, 0xfb923c, 0.85);
    this.meltdownAura.setVisible(false);

    const torso = this.add.rectangle(0, 0, 26, 28, 0x38bdf8);
    const visor = this.add.rectangle(0, -6, 18, 8, 0xf8fafc);
    const core = this.add.circle(0, 4, 5, 0xf43f5e);

    this.player = this.add.container(x, y, [this.meltdownAura, torso, visor, core]);
    this.physics.add.existing(this.player);
    this.playerBody = this.player.body as Phaser.Physics.Arcade.Body;
    this.playerBody.setSize(26, 26);
    this.playerBody.setOffset(-13, -13);
    this.playerBody.setCollideWorldBounds(true);
  }

  private spawnDungeonEnemies(bossX: number, bossY: number): void {
    const laneCenters = [300, 800, 1320, 1840];
    const totalMobs = 18;

    for (let i = 0; i < totalMobs; i++) {
      const lane = laneCenters[i % laneCenters.length];
      let ex = Phaser.Math.Between(420, 2480);
      let ey = lane + Phaser.Math.Between(-130, 130);
      if (Phaser.Math.Distance.Between(ex, ey, 280, 280) < 420) {
        ex += 550;
      }
      const isElite = i % 5 === 4;
      this.createEnemy(ex, ey, false, isElite);
    }

    this.createEnemy(bossX, bossY, true, true);
  }

  private createEnemy(x: number, y: number, isBoss: boolean, isElite: boolean): void {
    const mult = this.activeDungeon.enemyMultiplier * (1 + (this.worldTier - 1) * 0.55);
    const maxHp = Math.round((isBoss ? 520 : isElite ? 125 : 52) * mult);
    const speed = isBoss ? 128 : isElite ? 145 : 130;
    const damage = Math.round((isBoss ? 25 : isElite ? 15 : 10) * (1 + (mult - 1) * 0.65));
    const xpValue = Math.round((isBoss ? 260 : isElite ? 65 : 28) * (1 + (mult - 1) * 0.5));

    const size = isBoss ? 48 : isElite ? 30 : 22;
    const color = isBoss ? 0xf59e0b : isElite ? 0xa855f7 : 0xef4444;

    const bodyRect = this.add.rectangle(0, 0, size, size, color).setStrokeStyle(2, 0xffffff, 0.35);
    const eye = this.add.rectangle(0, -4, size * 0.6, 5, 0x090d16);
    const hpBg = this.add.rectangle(0, -size / 2 - 10, size + 12, 5, 0x090d16);
    const hpBar = this.add.rectangle(0, -size / 2 - 10, size + 12, 5, isBoss ? 0xfacc15 : 0xf43f5e);

    const children: Phaser.GameObjects.GameObject[] = [bodyRect, eye, hpBg, hpBar];
    if (isBoss || isElite) {
      const tag = this.add
        .text(0, -size / 2 - 22, isBoss ? `★ ${this.activeDungeon.bossName.toUpperCase()}` : '★ ELITE', {
          fontFamily: 'monospace',
          fontSize: isBoss ? '12px' : '10px',
          fontStyle: 'bold',
          color: isBoss ? '#facc15' : '#e879f9',
        })
        .setOrigin(0.5);
      children.push(tag);
    }

    const container = this.add.container(x, y, children);
    this.physics.add.existing(container);
    const body = container.body as Phaser.Physics.Arcade.Body;
    body.setSize(size, size);
    body.setOffset(-size / 2, -size / 2);
    body.setCollideWorldBounds(true);

    this.physics.add.collider(container, this.walls);

    this.enemies.push({
      sprite: container,
      body,
      hpBar,
      hp: maxHp,
      maxHp,
      speed,
      damage,
      xpValue,
      isBoss,
      isElite,
      lastAttackAt: 0,
    });
  }

  private unlockExitDoor(): void {
    if (this.exitDoorOpen) return;
    this.exitDoorOpen = true;
    this.dungeonStats.bossDefeated = true;

    if (this.exitDoorBlocker && this.exitDoorBlocker.body) {
      (this.exitDoorBlocker.body as Phaser.Physics.Arcade.StaticBody).enable = false;
    }

    this.exitDoorLeft.setFillStyle(0x10b981, 0.95).setStrokeStyle(2, 0x6ee7b7);
    this.exitDoorRight.setFillStyle(0x10b981, 0.95).setStrokeStyle(2, 0x6ee7b7);

    this.tweens.add({
      targets: this.exitDoorLeft,
      x: this.exitDoorLeft.x - 52,
      duration: 650,
      ease: 'Power2',
    });
    this.tweens.add({
      targets: this.exitDoorRight,
      x: this.exitDoorRight.x + 52,
      duration: 650,
      ease: 'Power2',
    });

    this.exitDoorLabel.setText('[OPEN] LOOP DOOR DE DEUR VOOR DUNGEON BELONING');
    this.exitDoorLabel.setColor('#34d399');
    this.cameras.main.shake(220, 0.006);
  }

  public update(time: number, delta: number): void {
    if (this.runOutcome !== 'PLAYING') return;

    const dt = delta / 1000;

    const regenRate = 9 + (this.equipped.INJECTOR?.stats.energyRegenBonus ?? 0);
    this.energy = Math.min(this.baseMaxEnergy, this.energy + regenRate * dt);

    if (this.meltdownActive) {
      if (time >= this.meltdownEndsAt) {
        this.meltdownActive = false;
        this.meltdownAura.setVisible(false);
      } else {
        this.heat = Math.max(0, this.heat - 14 * dt);
        this.applyMeltdownAuraDamage(dt);
      }
    } else {
      this.heat = Math.max(0, this.heat - 3.5 * dt);
    }

    let vx = 0;
    let vy = 0;
    if (this.wasd.A.isDown || this.cursors.left.isDown) vx -= 1;
    if (this.wasd.D.isDown || this.cursors.right.isDown) vx += 1;
    if (this.wasd.W.isDown || this.cursors.up.isDown) vy -= 1;
    if (this.wasd.S.isDown || this.cursors.down.isDown) vy += 1;

    if (vx !== 0 || vy !== 0) {
      const len = Math.hypot(vx, vy);
      const speed = this.getMoveSpeed();
      this.playerBody.setVelocity((vx / len) * speed, (vy / len) * speed);
    } else {
      this.playerBody.setVelocity(0, 0);
    }

    if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
      this.tryPhaseDodge(time, vx, vy);
    }

    if (Phaser.Input.Keyboard.JustDown(this.eKey)) {
      this.tryActivateMeltdown(time);
    }

    if (this.input.activePointer.leftButtonDown()) {
      this.tryBioShot(this.input.activePointer);
    }

    this.updateProjectiles(time);
    this.updateEnemies(time);
    this.updateGroundPickups();
    this.checkExitDoorCompletion();
    this.drawMinimap();

    if (time - this.lastHudPush > 90) {
      this.lastHudPush = time;
      this.pushHud(false);
    }
  }

  private tryBioShot(pointer: Phaser.Input.Pointer): void {
    const now = this.time.now;
    if (now - this.lastShotAt < 230) return;
    this.lastShotAt = now;

    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const baseAngle = Phaser.Math.Angle.Between(this.player.x, this.player.y, worldPoint.x, worldPoint.y);

    const hasSplit = this.hasGem('bioShot', 'scatterSplit');
    const hasReach = this.hasGem('bioShot', 'highVelocity');

    const angles = hasSplit ? [baseAngle - 0.18, baseAngle, baseAngle + 0.18] : [baseAngle];
    const speed = hasReach ? 830 : 610;
    const lifeMs = hasReach ? 830 : 540;

    for (const angle of angles) {
      const dmg = this.getShotDamage();
      const bullet = this.add.circle(this.player.x, this.player.y, hasSplit ? 5.5 : 5, hasSplit ? 0x67e8f9 : 0x38bdf8);
      this.physics.add.existing(bullet);
      const body = bullet.body as Phaser.Physics.Arcade.Body;
      body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);

      this.projectiles.push({
        sprite: bullet,
        body,
        damage: dmg,
        fromPlayer: true,
        expiresAt: now + lifeMs,
      });
    }
  }

  private drawConeEffect(
    x: number,
    y: number,
    aimAngle: number,
    radius: number,
    halfAngleRad: number,
    fillColor: number,
    strokeColor: number
  ): void {
    const gfx = this.add.graphics();
    gfx.fillStyle(fillColor, 0.34);
    gfx.lineStyle(3, strokeColor, 0.92);
    gfx.beginPath();
    gfx.moveTo(x, y);
    gfx.arc(x, y, radius, aimAngle - halfAngleRad, aimAngle + halfAngleRad, false);
    gfx.closePath();
    gfx.fillPath();
    gfx.strokePath();

    this.tweens.add({
      targets: gfx,
      alpha: 0,
      duration: 280,
      onComplete: () => gfx.destroy(),
    });
  }

  private applyConeDamage(
    originX: number,
    originY: number,
    aimAngle: number,
    radius: number,
    halfAngleRad: number,
    damage: number
  ): number {
    let hitCount = 0;
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      const dist = Phaser.Math.Distance.Between(originX, originY, e.sprite.x, e.sprite.y);
      if (dist <= radius) {
        const angleToEnemy = Phaser.Math.Angle.Between(originX, originY, e.sprite.x, e.sprite.y);
        const angleDiff = Math.abs(Phaser.Math.Angle.Wrap(angleToEnemy - aimAngle));
        if (angleDiff <= halfAngleRad) {
          this.damageEnemy(i, damage);
          hitCount += 1;
        }
      }
    }
    return hitCount;
  }

  private tryConeSlam(pointer: Phaser.Input.Pointer): void {
    if (!this.skills.unlocked.coneSlam) return;

    const cost = this.getSlamManaCost();
    if (this.energy < cost) return;
    this.energy -= cost;
    this.heat = Math.min(100, this.heat + (this.hasGem('coneSlam', 'volatileCatalyst') ? 32 : 16));

    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const aimAngle = Phaser.Math.Angle.Between(this.player.x, this.player.y, worldPoint.x, worldPoint.y);

    const mag = this.hasGem('coneSlam', 'magnifiedArea');
    const coneRadius = mag ? 270 : 185;
    const halfConeRad = Phaser.Math.DegToRad(mag ? 52 : 38);

    let slamDmg = 52 + (this.level - 1) * 4;
    if (this.hasGem('coneSlam', 'brutalOvercharge')) slamDmg = Math.round(slamDmg * 1.4);
    if (this.hasGem('coneSlam', 'volatileCatalyst') && Math.random() < 0.25) slamDmg *= 2;

    this.drawConeEffect(this.player.x, this.player.y, aimAngle, coneRadius, halfConeRad, 0xf43f5e, 0xfb7185);
    const hits = this.applyConeDamage(this.player.x, this.player.y, aimAngle, coneRadius, halfConeRad, slamDmg);

    if (hits > 0 && this.hasGem('coneSlam', 'vampiricSiphon')) {
      this.hp = Math.min(this.getMaxHp(), this.hp + hits * 4);
    }

    if (this.hasGem('coneSlam', 'seismicEcho')) {
      const sx = this.player.x;
      const sy = this.player.y;
      this.time.delayedCall(220, () => {
        if (this.runOutcome !== 'PLAYING') return;
        this.drawConeEffect(sx, sy, aimAngle, coneRadius * 1.15, halfConeRad, 0xf59e0b, 0xfbbf24);
        this.applyConeDamage(sx, sy, aimAngle, coneRadius * 1.15, halfConeRad, Math.round(slamDmg * 0.65));
      });
    }

    this.pushHud(true);
  }

  private tryPhaseDodge(time: number, vx: number, vy: number): void {
    if (!this.skills.unlocked.phaseDodge) return;

    const cost = this.getDodgeManaCost();
    if (this.energy < cost) return;

    this.energy -= cost;
    this.invulnerableUntil = time + 320;

    let dx = vx;
    let dy = vy;
    if (dx === 0 && dy === 0) {
      const wp = this.cameras.main.getWorldPoint(this.input.activePointer.x, this.input.activePointer.y);
      const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, wp.x, wp.y);
      dx = Math.cos(angle);
      dy = Math.sin(angle);
    } else {
      const len = Math.hypot(dx, dy);
      dx /= len;
      dy /= len;
    }

    const startX = this.player.x;
    const startY = this.player.y;

    const ghost = this.add.circle(startX, startY, 16, 0x2dd4bf, 0.55);
    this.tweens.add({
      targets: ghost,
      alpha: 0,
      scale: 1.6,
      duration: 260,
      onComplete: () => ghost.destroy(),
    });

    const mag = this.hasGem('phaseDodge', 'magnifiedArea');
    const hasNova =
      mag ||
      this.hasGem('phaseDodge', 'brutalOvercharge') ||
      this.hasGem('phaseDodge', 'vampiricSiphon') ||
      this.hasGem('phaseDodge', 'seismicEcho');

    if (hasNova) {
      const radius = mag ? 135 : 90;
      const baseDmg = (this.hasGem('phaseDodge', 'brutalOvercharge') ? 48 : 32) + (this.level - 1) * 3;

      const triggerNova = (nx: number, ny: number, mult: number) => {
        const nova = this.add.circle(nx, ny, radius, 0x14b8a6, 0.32).setStrokeStyle(2, 0x5eead4);
        this.tweens.add({
          targets: nova,
          alpha: 0,
          scale: 1.2,
          duration: 340,
          onComplete: () => nova.destroy(),
        });
        for (let i = this.enemies.length - 1; i >= 0; i--) {
          const e = this.enemies[i];
          if (Phaser.Math.Distance.Between(nx, ny, e.sprite.x, e.sprite.y) <= radius) {
            this.damageEnemy(i, Math.round(baseDmg * mult));
            if (this.hasGem('phaseDodge', 'vampiricSiphon')) {
              this.hp = Math.min(this.getMaxHp(), this.hp + 4);
            }
          }
        }
      };

      triggerNova(startX, startY, 1);
      if (this.hasGem('phaseDodge', 'seismicEcho')) {
        this.time.delayedCall(220, () => {
          if (this.runOutcome === 'PLAYING') triggerNova(startX, startY, 0.65);
        });
      }
    }

    this.player.x = Phaser.Math.Clamp(this.player.x + dx * 155, 70, this.worldWidth - 70);
    this.player.y = Phaser.Math.Clamp(this.player.y + dy * 155, 70, this.worldHeight - 70);
    this.pushHud(true);
  }

  private tryActivateMeltdown(time: number): void {
    if (!this.skills.unlocked.meltdownUlt || this.meltdownActive || this.heat < 80) return;

    this.meltdownActive = true;
    this.meltdownEndsAt = time + (this.hasGem('meltdownUlt', 'seismicEcho') ? 8500 : 6500);
    const auraRadius = this.hasGem('meltdownUlt', 'magnifiedArea') ? 155 : 95;
    this.meltdownAura.setRadius(auraRadius);
    this.meltdownAura.setVisible(true);
    this.cameras.main.shake(180, 0.005);
    this.pushHud(true);
  }

  private applyMeltdownAuraDamage(dt: number): void {
    const radius = this.hasGem('meltdownUlt', 'magnifiedArea') ? 155 : 95;
    const dps = (this.hasGem('meltdownUlt', 'brutalOvercharge') ? 82 : 55) + (this.level - 1) * 4;
    let hitAny = false;

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, e.sprite.x, e.sprite.y) <= radius) {
        this.damageEnemy(i, dps * dt);
        hitAny = true;
      }
    }

    if (hitAny && this.hasGem('meltdownUlt', 'vampiricSiphon')) {
      this.hp = Math.min(this.getMaxHp(), this.hp + 12 * dt);
    }
  }

  private updateProjectiles(time: number): void {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      if (time >= p.expiresAt) {
        p.sprite.destroy();
        this.projectiles.splice(i, 1);
        continue;
      }

      let hitWall = false;
      for (const rect of this.wallRects) {
        if (rect.contains(p.sprite.x, p.sprite.y)) {
          hitWall = true;
          break;
        }
      }
      if (hitWall) {
        p.sprite.destroy();
        this.projectiles.splice(i, 1);
        continue;
      }

      if (p.fromPlayer) {
        for (let j = this.enemies.length - 1; j >= 0; j--) {
          const e = this.enemies[j];
          const hitRadius = e.isBoss ? 28 : 18;
          if (Phaser.Math.Distance.Between(p.sprite.x, p.sprite.y, e.sprite.x, e.sprite.y) <= hitRadius) {
            const manaGain = this.hasGem('bioShot', 'essenceEfficiency') ? 12 : 8;
            const heatGain = this.hasGem('bioShot', 'volatileCatalyst') ? 12 : 6;
            this.energy = Math.min(this.baseMaxEnergy, this.energy + manaGain);
            this.heat = Math.min(100, this.heat + heatGain);
            this.damageEnemy(j, p.damage);
            p.sprite.destroy();
            this.projectiles.splice(i, 1);
            break;
          }
        }
      }
    }
  }

  private updateEnemies(time: number): void {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      const dist = Phaser.Math.Distance.Between(e.sprite.x, e.sprite.y, this.player.x, this.player.y);
      const aggroRange = e.isBoss ? 520 : 390;

      if (dist < aggroRange) {
        const angle = Phaser.Math.Angle.Between(e.sprite.x, e.sprite.y, this.player.x, this.player.y);
        e.body.setVelocity(Math.cos(angle) * e.speed, Math.sin(angle) * e.speed);

        if (dist < (e.isBoss ? 44 : 28) && time - e.lastAttackAt > 950) {
          e.lastAttackAt = time;
          if (time >= this.invulnerableUntil) {
            this.hp = Math.max(0, this.hp - e.damage);
            this.cameras.main.shake(100, 0.004);
            if (this.hp <= 0) {
              this.hp = 0;
              this.runOutcome = 'WIPE';
              this.playerBody.setVelocity(0, 0);
              for (const enemy of this.enemies) {
                enemy.body.setVelocity(0, 0);
              }
              this.cameras.main.shake(300, 0.01);
              this.cameras.main.flash(300, 185, 28, 28);
              this.pushHud(true);
              return;
            }
          }
        }
      } else {
        e.body.setVelocity(0, 0);
      }
    }
  }

  private damageEnemy(index: number, amount: number): void {
    const e = this.enemies[index];
    if (!e) return;
    e.hp -= amount;
    e.hpBar.scaleX = Math.max(0, e.hp / e.maxHp);

    if (e.hp <= 0) {
      const { x, y } = e.sprite;
      const wasBoss = e.isBoss;
      const wasElite = e.isElite;
      const xpReward = e.xpValue;

      e.sprite.destroy();
      this.enemies.splice(index, 1);

      this.dungeonStats.kills += 1;
      this.dungeonStats.xpEarned += xpReward;
      this.grantXp(xpReward);

      // Schaarse loot drops: Gear (6% mob / 12% boss) & Support Gems (5% mob / 10% boss)
      const gearChance = wasBoss || wasElite ? 0.12 : 0.06;
      const gemChance = wasBoss || wasElite ? 0.10 : 0.05;

      if (Math.random() < gemChance && this.pickUnownedSupportGem()) {
        this.spawnSupportGemOrb(x + 12, y);
      } else if (Math.random() < gearChance) {
        this.spawnLootOrb(x, y, wasBoss);
      }

      if (wasBoss) {
        this.unlockExitDoor();
      }
      this.pushHud(true);
    }
  }

  private pickUnownedSupportGem(): SupportGemId | null {
    const remaining = ALL_SUPPORT_GEM_IDS.filter((id) => !this.skills.ownedGems.includes(id));
    if (remaining.length === 0) return null;
    return Phaser.Utils.Array.GetRandom(remaining);
  }

  private spawnSupportGemOrb(x: number, y: number): void {
    const gemId = this.pickUnownedSupportGem();
    if (!gemId) return;

    const outer = this.add.circle(0, 0, 15, 0xa855f7, 0.34);
    const diamond = this.add.rectangle(0, 0, 11, 11, 0xe879f9).setRotation(Math.PI / 4).setStrokeStyle(1.5, 0xffffff);
    const label = this.add
      .text(0, -22, 'GEM', {
        fontFamily: 'monospace',
        fontSize: '9px',
        fontStyle: 'bold',
        color: '#f0abfc',
      })
      .setOrigin(0.5);

    const orb = this.add.container(x, y, [outer, diamond, label]);
    this.tweens.add({
      targets: outer,
      scale: 1.45,
      alpha: 0.12,
      yoyo: true,
      repeat: -1,
      duration: 550,
    });

    this.groundDrops.push({ sprite: orb, kind: 'GEM', gemId });
  }

  private createLootItem(fromBoss: boolean): LootItem {
    const roll = Math.random() + this.activeDungeon.rareBonusChance * 0.4;
    const rarity: ItemRarity = fromBoss
      ? roll > 0.72
        ? 'EXOTIC'
        : 'RARE'
      : roll > 0.94
      ? 'EXOTIC'
      : roll > 0.65
      ? 'RARE'
      : 'COMMON';

    const slots: ItemSlot[] = ['WEAPON', 'ARMOR', 'INJECTOR'];
    const slot = Phaser.Utils.Array.GetRandom(slots);
    const tierScale = 1 + (this.activeDungeon.enemyMultiplier - 1) * 0.35;
    const mult = (rarity === 'EXOTIC' ? 2.4 : rarity === 'RARE' ? 1.6 : 1) * tierScale;

    if (slot === 'WEAPON') {
      const dmg = Math.round(6 * mult);
      return {
        id: `loot-${Date.now()}-${Math.random()}`,
        name: rarity === 'EXOTIC' ? 'Helios Isotope Cannon' : rarity === 'RARE' ? 'Overcharged Bio-Emitter' : 'Scrap Plasma Emitter',
        slot,
        rarity,
        description: `+${dmg} Bio-Shot Damage`,
        stats: { damageBonus: dmg },
      };
    }
    if (slot === 'ARMOR') {
      const hpBonus = Math.round(30 * mult);
      return {
        id: `loot-${Date.now()}-${Math.random()}`,
        name: rarity === 'EXOTIC' ? 'Aegis Chitin Exo-Suit' : rarity === 'RARE' ? 'Reinforced Kevlar Weave' : 'Polymer Carapace',
        slot,
        rarity,
        description: `+${hpBonus} Max Vitality (HP)`,
        stats: { maxHpBonus: hpBonus },
      };
    }
    const regen = Math.round(4 * mult);
    return {
      id: `loot-${Date.now()}-${Math.random()}`,
      name: rarity === 'EXOTIC' ? 'Apex Adrenal Splicer' : rarity === 'RARE' ? 'Catalytic Bio-Injector' : 'Basic Glucose Syringe',
      slot,
      rarity,
      description: `+${regen}/s Bio-Energy Regen`,
      stats: { energyRegenBonus: regen },
    };
  }

  private spawnLootOrb(x: number, y: number, fromBoss: boolean): void {
    const item = this.createLootItem(fromBoss);
    const orbColor = item.rarity === 'EXOTIC' ? 0xf59e0b : item.rarity === 'RARE' ? 0x38bdf8 : 0x10b981;
    const outer = this.add.circle(0, 0, 13, orbColor, 0.28);
    const core = this.add.circle(0, 0, 6, orbColor, 1);
    const orb = this.add.container(x, y, [outer, core]);

    this.tweens.add({
      targets: outer,
      scale: 1.4,
      alpha: 0.1,
      yoyo: true,
      repeat: -1,
      duration: 600,
    });

    this.groundDrops.push({ sprite: orb, kind: 'GEAR', item });
  }

  private updateGroundPickups(): void {
    for (let i = this.groundDrops.length - 1; i >= 0; i--) {
      const drop = this.groundDrops[i];
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, drop.sprite.x, drop.sprite.y) <= 36) {
        if (drop.kind === 'GEM' && drop.gemId) {
          if (!this.skills.ownedGems.includes(drop.gemId)) {
            this.skills.ownedGems.push(drop.gemId);
          }
          this.dungeonStats.gemsFound += 1;
          const popup = this.add
            .text(this.player.x, this.player.y - 34, `+ SUPPORT GEM: ${GEM_DISPLAY_NAMES[drop.gemId].toUpperCase()}`, {
              fontFamily: 'monospace',
              fontSize: '12px',
              fontStyle: 'bold',
              color: '#f0abfc',
              backgroundColor: '#090d16dd',
              padding: { x: 6, y: 2 },
            })
            .setOrigin(0.5);
          this.tweens.add({
            targets: popup,
            y: popup.y - 28,
            alpha: 0,
            duration: 1300,
            onComplete: () => popup.destroy(),
          });
          drop.sprite.destroy();
          this.groundDrops.splice(i, 1);
          this.pushHud(true);
        } else if (drop.kind === 'GEAR' && drop.item && this.inventory.length < 12) {
          this.inventory.push(drop.item);
          this.dungeonStats.lootFound += 1;
          drop.sprite.destroy();
          this.groundDrops.splice(i, 1);
          this.pushHud(true);
        }
      }
    }
  }

  private checkExitDoorCompletion(): void {
    if (!this.exitDoorOpen || this.runOutcome !== 'PLAYING') return;
    if (this.exitDoorZone.contains(this.player.x, this.player.y)) {
      this.runOutcome = 'VICTORY';
      this.dungeonsClearedTotal += 1;
      if (!this.liberatedZones.includes(this.activeDungeon.id)) {
        this.liberatedZones.push(this.activeDungeon.id);
      }
      this.playerBody.setVelocity(0, 0);
      for (const e of this.enemies) {
        e.body.setVelocity(0, 0);
      }

      const completionXp = Math.round(180 * this.activeDungeon.enemyMultiplier);
      this.dungeonStats.xpEarned += completionXp;
      this.grantXp(completionXp);

      // Gegarandeerde Boss Chest Gear + Support Gem (indien nog niet allemaal gevonden)
      const reward = this.createLootItem(true);
      this.bossRewardItem = reward;
      if (this.inventory.length < 12) {
        this.inventory.push(reward);
        this.dungeonStats.lootFound += 1;
      }

      const newGem = this.pickUnownedSupportGem();
      if (newGem) {
        this.skills.ownedGems.push(newGem);
        this.bossRewardGem = newGem;
        this.dungeonStats.gemsFound += 1;
      }

      this.pushHud(true);
    }
  }

  private grantXp(amount: number): void {
    if (this.level >= this.maxLevel) {
      this.xp = this.xpToNext;
      return;
    }
    this.xp += amount;
    while (this.xp >= this.xpToNext && this.level < this.maxLevel) {
      this.xp -= this.xpToNext;
      this.level += 1;
      this.dnaPoints += 1;
      this.xpToNext = Math.round(this.xpToNext * 1.24);
      this.hp = this.getMaxHp();
    }
    if (this.level >= this.maxLevel) {
      this.xp = this.xpToNext;
    }
  }

  private drawMinimap(): void {
    if (!this.minimapGraphics) return;
    this.minimapGraphics.clear();

    const mapW = 168;
    const mapH = 126;
    const ox = 1120 - mapW - 18;
    const oy = 18;
    const sx = mapW / this.worldWidth;
    const sy = mapH / this.worldHeight;

    this.minimapGraphics.fillStyle(0x060a12, 0.85);
    this.minimapGraphics.fillRect(ox, oy, mapW, mapH);
    this.minimapGraphics.lineStyle(1, 0x334155, 1);
    this.minimapGraphics.strokeRect(ox, oy, mapW, mapH);

    this.minimapGraphics.fillStyle(0x475569, 0.9);
    for (const r of this.wallRects) {
      this.minimapGraphics.fillRect(ox + r.x * sx, oy + r.y * sy, Math.max(2, r.width * sx), Math.max(2, r.height * sy));
    }

    for (const e of this.enemies) {
      this.minimapGraphics.fillStyle(e.isBoss ? 0xfacc15 : 0xf43f5e, 1);
      this.minimapGraphics.fillCircle(ox + e.sprite.x * sx, oy + e.sprite.y * sy, e.isBoss ? 4 : 2);
    }

    // Support Gem drops op de minimap tonen als paarse stip
    for (const d of this.groundDrops) {
      if (d.kind === 'GEM') {
        this.minimapGraphics.fillStyle(0xe879f9, 1);
        this.minimapGraphics.fillCircle(ox + d.sprite.x * sx, oy + d.sprite.y * sy, 3);
      }
    }

    this.minimapGraphics.fillStyle(this.exitDoorOpen ? 0x10b981 : 0xef4444, 1);
    this.minimapGraphics.fillRect(ox + 2520 * sx - 4, oy + 1860 * sy - 4, 8, 8);

    this.minimapGraphics.fillStyle(0x38bdf8, 1);
    this.minimapGraphics.fillCircle(ox + this.player.x * sx, oy + this.player.y * sy, 3);
  }

  private pushHud(force: boolean): void {
    if (!this.hudCallback && !force) return;

    this.hudCallback?.({
      hp: Math.round(this.hp),
      maxHp: this.getMaxHp(),
      energy: Math.round(this.energy),
      maxEnergy: this.baseMaxEnergy,
      heat: Math.round(this.heat),
      meltdownActive: this.meltdownActive,
      xp: this.xp,
      xpToNext: this.xpToNext,
      level: this.level,
      maxLevel: this.maxLevel,
      dnaPoints: this.dnaPoints,
      activeDungeon: this.activeDungeon,
      dungeonsClearedTotal: this.dungeonsClearedTotal,
      liberatedZones: [...this.liberatedZones],
      worldTier: this.worldTier,
      enemiesRemaining: this.enemies.length,
      manaCosts: { slam: this.getSlamManaCost(), dodge: this.getDodgeManaCost() },
      skills: {
        unlocked: { ...this.skills.unlocked },
        sockets: {
          bioShot: [...this.skills.sockets.bioShot],
          phaseDodge: [...this.skills.sockets.phaseDodge],
          coneSlam: [...this.skills.sockets.coneSlam],
          meltdownUlt: [...this.skills.sockets.meltdownUlt],
        },
        ownedGems: [...this.skills.ownedGems],
      },
      equipped: { ...this.equipped },
      inventory: [...this.inventory],
      runOutcome: this.runOutcome,
      bossRewardItem: this.bossRewardItem,
      bossRewardGem: this.bossRewardGem,
      dungeonStats: { ...this.dungeonStats },
    });
  }
}