import { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import {
  ArenaScene,
  DUNGEONS,
  type HudSnapshot,
  type SkillTree,
  type LootItem,
  type ItemSlot,
  type ItemRarity,
} from './core/ArenaScene';

const initialHud: HudSnapshot = {
  hp: 120,
  maxHp: 120,
  energy: 100,
  maxEnergy: 100,
  heat: 0,
  meltdownActive: false,
  xp: 0,
  xpToNext: 100,
  level: 1,
  dnaPoints: 0,
  activeDungeon: DUNGEONS[0],
  dungeonsClearedTotal: 0,
  liberatedZones: [],
  worldTier: 1,
  enemiesRemaining: 19,
  manaCosts: { slam: 25, dodge: 20 },
  skills: { bioShot: 1, phaseDodge: 1, coneSlam: 0, meltdownUlt: 0 },
  equipped: { WEAPON: null, ARMOR: null, INJECTOR: null },
  inventory: [],
  runOutcome: 'PLAYING',
  bossRewardItem: null,
  dungeonStats: { kills: 0, bossDefeated: false, xpEarned: 0, lootFound: 0 },
};

const ZONE_META: Record<
  string,
  { cx: number; cy: number; sectorCode: string; biome: string; captureBonus: string }
> = {
  cryo: {
    cx: 132,
    cy: 112,
    sectorCode: 'SEC-01 // ARCTIC POLE',
    biome: 'Bevroren Koeltorens',
    captureBonus: '+25 Permanente Max HP',
  },
  bio: {
    cx: 245,
    cy: 138,
    sectorCode: 'SEC-02 // EQUATORIAL JUNGLE',
    biome: 'Overwoekerd Mutatie-Lab',
    captureBonus: '+15% Snellere XP & Bio-Flow',
  },
  foundry: {
    cx: 118,
    cy: 215,
    sectorCode: 'SEC-03 // TECTONIC RIFT',
    biome: 'Ondergrondse Smelterij',
    captureBonus: '+5 Permanente Bio-Shot DMG',
  },
  crimson: {
    cx: 256,
    cy: 238,
    sectorCode: 'SEC-04 // ASH WASTES',
    biome: 'Hoogbeveiligd Isolatie-Fort',
    captureBonus: '+45 Permanente Max HP',
  },
  void: {
    cx: 188,
    cy: 288,
    sectorCode: 'SEC-05 // SOUTHERN CORE',
    biome: 'Dimensionale Rift-Kamer',
    captureBonus: '+8 Permanente Bio-Shot DMG',
  },
};

const rarityColors: Record<ItemRarity, { border: string; bg: string; text: string }> = {
  COMMON: { border: '#10b981', bg: 'rgba(6, 78, 59, 0.28)', text: '#6ee7b7' },
  RARE: { border: '#38bdf8', bg: 'rgba(12, 74, 110, 0.32)', text: '#7dd3fc' },
  EXOTIC: { border: '#f59e0b', bg: 'rgba(120, 53, 15, 0.35)', text: '#fcd34d' },
};

const slotMeta: Record<ItemSlot, { label: string; icon: string }> = {
  WEAPON: { label: 'Bio-Emitter', icon: '\u2694\uFE0F' },
  ARMOR: { label: 'Carapace', icon: '\uD83D\uDEE1\uFE0F' },
  INJECTOR: { label: 'Splicer Injector', icon: '\uD83D\uDC89' },
};

const HELIX_SKILLS: {
  key: keyof SkillTree;
  hotkey: string;
  baseName: string;
  unlockDesc: string;
  evolveDesc: string;
  color: string;
  strand: 'LEFT' | 'RIGHT';
}[] = [
  {
    key: 'bioShot',
    hotkey: '[LMB]',
    baseName: 'Bio-Shot (Short-Range)',
    unlockDesc: 'Standaard kort-afstand bio-projectiel (+8 Mana per hit).',
    evolveDesc: 'Rank 2: vuurt 3 projectielen in een waaier. Rank 3+: 5 projectielen + hogere schade.',
    color: '#38bdf8',
    strand: 'LEFT',
  },
  {
    key: 'coneSlam',
    hotkey: '[RMB]',
    baseName: 'Cone-Slam',
    unlockDesc: 'ONTGRENDEL SKILL (Rank 1): Slaat een krachtige 76° kegel-schokgolf richting je cursor.',
    evolveDesc: 'Rank 2+: wekt na 0.2s een tweede grotere Seismic Aftershock cone op en verlaagt mana-kost.',
    color: '#fb7185',
    strand: 'RIGHT',
  },
  {
    key: 'phaseDodge',
    hotkey: '[SPATIE]',
    baseName: 'Phase Dodge',
    unlockDesc: 'Standaard ontwijk-dash met korte onkwetsbaarheid.',
    evolveDesc: 'Rank 2+: laat een explosieve Plasma-Nova achter bij je vertrekpunt + hogere loopsnelheid.',
    color: '#2dd4bf',
    strand: 'LEFT',
  },
  {
    key: 'meltdownUlt',
    hotkey: '[E]',
    baseName: 'Meltdown Ultimate',
    unlockDesc: 'ONTGRENDEL SKILL (Rank 1): Activeert nucleaire stralingsaura vanaf 80% Heat.',
    evolveDesc: 'Rank 2+: vergroot de aura (+38px), verlengt duur en heelt HP terwijl vijanden branden.',
    color: '#fb923c',
    strand: 'RIGHT',
  },
];

export default function App() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<ArenaScene | null>(null);
  const [hud, setHud] = useState<HudSnapshot>(initialHud);
  const [activeModal, setActiveModal] = useState<'none' | 'inventory' | 'skills'>('none');
  const [showWorldMap, setShowWorldMap] = useState<boolean>(true);
  const [selectedDungeonId, setSelectedDungeonId] = useState<string>(DUNGEONS[0].id);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === 'i') {
        e.preventDefault();
        setActiveModal((prev) => (prev === 'inventory' ? 'none' : 'inventory'));
      } else if (k === 'k') {
        e.preventDefault();
        setActiveModal((prev) => (prev === 'skills' ? 'none' : 'skills'));
      } else if (e.key === 'Escape') {
        setActiveModal('none');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    const arenaScene = new ArenaScene();
    arenaScene.setHudCallback((snapshot) => setHud(snapshot));
    sceneRef.current = arenaScene;

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: containerRef.current,
      width: 1120,
      height: 680,
      backgroundColor: '#0b101b',
      pixelArt: true,
      physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 }, debug: false } },
      scene: [arenaScene],
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
    });

    return () => {
      sceneRef.current = null;
      game.destroy(true);
    };
  }, []);

  const handleEnterDungeon = (dungeonId: string) => {
    setSelectedDungeonId(dungeonId);
    setActiveModal('none');
    setShowWorldMap(false);
    sceneRef.current?.startDungeon(dungeonId);
  };

  const handleUpgradeSkill = (skill: keyof SkillTree) => sceneRef.current?.upgradeSkill(skill);
  const handleEquip = (itemId: string) => sceneRef.current?.equipItem(itemId);
  const handleSalvage = (itemId: string) => sceneRef.current?.salvageItem(itemId);

  const hpPct = Math.max(0, Math.min(100, (hud.hp / Math.max(1, hud.maxHp)) * 100));
  const energyPct = Math.max(0, Math.min(100, (hud.energy / Math.max(1, hud.maxEnergy)) * 100));
  const xpPct = Math.max(0, Math.min(100, (hud.xp / Math.max(1, hud.xpToNext)) * 100));

  const selectedDungeon = DUNGEONS.find((d) => d.id === selectedDungeonId) ?? DUNGEONS[0];
  const selectedMeta = ZONE_META[selectedDungeon.id];
  const isSelectedLiberated = hud.liberatedZones.includes(selectedDungeon.id);
  const liberationPct = Math.round((hud.liberatedZones.length / DUNGEONS.length) * 100);
  const allLiberated = hud.liberatedZones.length >= DUNGEONS.length;

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#060a12',
        color: '#f1f5f9',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        padding: '10px 16px',
        boxSizing: 'border-box',
        userSelect: 'none',
      }}
    >
      <div style={{ maxWidth: 1220, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Header */}
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11, fontFamily: 'monospace', letterSpacing: 2, color: hud.activeDungeon.accent }}>
              WORLD TIER {hud.worldTier} &bull; PLANET LIBERATION: {liberationPct}% ({hud.liberatedZones.length}/{DUNGEONS.length} ZONES)
            </div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#ffffff' }}>Spliced: Meltdown</h1>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => {
                setActiveModal('none');
                setShowWorldMap(true);
              }}
              style={{
                backgroundColor: showWorldMap ? '#0284c7' : '#0f172a',
                border: `1px solid ${showWorldMap ? '#38bdf8' : '#475569'}`,
                color: '#f8fafc',
                borderRadius: 10,
                padding: '8px 14px',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              WERELDBOL ({hud.liberatedZones.length}/{DUNGEONS.length})
            </button>

            <button
              onClick={() => setActiveModal((prev) => (prev === 'inventory' ? 'none' : 'inventory'))}
              style={{
                backgroundColor: activeModal === 'inventory' ? '#0369a1' : '#0f172a',
                border: `1px solid ${activeModal === 'inventory' ? '#38bdf8' : '#334155'}`,
                color: '#f8fafc',
                borderRadius: 10,
                padding: '8px 14px',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span>[I] INVENTORY</span>
              <span style={{ fontSize: 11, color: '#94a3b8' }}>({hud.inventory.length}/12)</span>
            </button>

            <button
              onClick={() => setActiveModal((prev) => (prev === 'skills' ? 'none' : 'skills'))}
              style={{
                backgroundColor: hud.dnaPoints > 0 ? '#0f766e' : activeModal === 'skills' ? '#115e59' : '#0f172a',
                border: `1px solid ${hud.dnaPoints > 0 || activeModal === 'skills' ? '#2dd4bf' : '#334155'}`,
                color: '#f8fafc',
                borderRadius: 10,
                padding: '8px 14px',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <span>[K] DNA SKILLS</span>
              {hud.dnaPoints > 0 && (
                <span
                  style={{
                    backgroundColor: '#facc15',
                    color: '#090d16',
                    borderRadius: 999,
                    padding: '1px 7px',
                    fontSize: 11,
                    fontWeight: 800,
                  }}
                >
                  +{hud.dnaPoints} DNA
                </span>
              )}
            </button>
          </div>
        </header>

        {/* Hoofd Game Viewport + Wereldbol + Modals */}
        <div style={{ position: 'relative', width: '100%' }}>
          <div
            ref={containerRef}
            style={{
              width: '100%',
              aspectRatio: '1120 / 680',
              borderRadius: 12,
              overflow: 'hidden',
              border: '1px solid #1e293b',
              backgroundColor: '#0b101b',
              boxShadow: '0 18px 40px rgba(0,0,0,0.65)',
            }}
          />

          {/* INTERACTIEVE WERELDBOL */}
          {showWorldMap && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'radial-gradient(circle at 32% 50%, #0d1b2e 0%, #050811 85%)',
                borderRadius: 12,
                padding: 22,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 40,
              }}
            >
              <div
                style={{
                  width: '100%',
                  maxWidth: 1040,
                  display: 'grid',
                  gridTemplateColumns: '430px 1fr',
                  gap: 22,
                  alignItems: 'center',
                }}
              >
                <div
                  style={{
                    backgroundColor: 'rgba(15, 23, 42, 0.72)',
                    border: '1px solid #1e293b',
                    borderRadius: 18,
                    padding: 16,
                    textAlign: 'center',
                    boxShadow: '0 20px 50px rgba(0,0,0,0.75)',
                  }}
                >
                  <div style={{ fontSize: 10, fontFamily: 'monospace', letterSpacing: 2, color: '#38bdf8', marginBottom: 6 }}>
                    SECTOR KEPLER-9 // KLIK EEN ZONE OP DE WERELDBOL
                  </div>

                  <svg viewBox="0 0 380 380" style={{ width: '100%', maxWidth: 360, height: 'auto', display: 'block', margin: '0 auto' }}>
                    <defs>
                      <radialGradient id="planetGlow" cx="38%" cy="32%" r="68%">
                        <stop offset="0%" stopColor="#1e3a5f" />
                        <stop offset="55%" stopColor="#0f172a" />
                        <stop offset="100%" stopColor="#04070d" />
                      </radialGradient>
                      <radialGradient id="atmosphere" cx="50%" cy="50%" r="50%">
                        <stop offset="82%" stopColor="rgba(56, 189, 248, 0)" />
                        <stop offset="96%" stopColor="rgba(56, 189, 248, 0.22)" />
                        <stop offset="100%" stopColor="rgba(56, 189, 248, 0)" />
                      </radialGradient>
                      <clipPath id="globeClip">
                        <circle cx="190" cy="190" r="154" />
                      </clipPath>
                    </defs>

                    <circle cx="190" cy="190" r="174" fill="url(#atmosphere)" />
                    <circle cx="190" cy="190" r="154" fill="url(#planetGlow)" stroke="#38bdf855" strokeWidth="2" />

                    <g clipPath="url(#globeClip)">
                      <path
                        d="M70,95 Q130,75 175,105 T255,120 Q290,145 270,185 T195,195 Q140,210 100,175 Z"
                        fill="#1e293b"
                        opacity="0.75"
                      />
                      <path
                        d="M85,215 Q145,195 190,225 T295,235 Q315,275 265,305 T150,310 Q105,285 85,215 Z"
                        fill="#1e293b"
                        opacity="0.75"
                      />
                      <ellipse cx="190" cy="190" rx="154" ry="52" fill="none" stroke="#38bdf822" strokeWidth="1" />
                      <ellipse cx="190" cy="190" rx="154" ry="108" fill="none" stroke="#38bdf822" strokeWidth="1" />
                      <ellipse cx="190" cy="190" rx="58" ry="154" fill="none" stroke="#38bdf822" strokeWidth="1" />
                      <ellipse cx="190" cy="190" rx="115" ry="154" fill="none" stroke="#38bdf822" strokeWidth="1" />
                      <polyline
                        points="132,112 245,138 118,215 256,238 188,288"
                        fill="none"
                        stroke="#475569"
                        strokeWidth="1.5"
                        strokeDasharray="4 4"
                      />
                    </g>

                    {DUNGEONS.map((d, index) => {
                      const pos = ZONE_META[d.id];
                      const liberated = hud.liberatedZones.includes(d.id);
                      const isSelected = selectedDungeonId === d.id;
                      const pinColor = liberated ? '#10b981' : d.accent;

                      return (
                        <g key={d.id} onClick={() => setSelectedDungeonId(d.id)} style={{ cursor: 'pointer' }}>
                          {isSelected && (
                            <circle
                              cx={pos.cx}
                              cy={pos.cy}
                              r="22"
                              fill="none"
                              stroke="#ffffff"
                              strokeWidth="2"
                              strokeDasharray="5 3"
                            />
                          )}
                          <circle cx={pos.cx} cy={pos.cy} r="15" fill={pinColor} opacity="0.28" />
                          <circle
                            cx={pos.cx}
                            cy={pos.cy}
                            r="9"
                            fill={liberated ? '#10b981' : '#090d16'}
                            stroke={pinColor}
                            strokeWidth="3"
                          />
                          <rect
                            x={pos.cx - 46}
                            y={pos.cy + 14}
                            width="92"
                            height="18"
                            rx="4"
                            fill="#060a12dd"
                            stroke={isSelected ? '#ffffff' : '#334155'}
                            strokeWidth="1"
                          />
                          <text
                            x={pos.cx}
                            y={pos.cy + 26}
                            textAnchor="middle"
                            fill={liberated ? '#6ee7b7' : '#f8fafc'}
                            fontSize="9.5"
                            fontFamily="monospace"
                            fontWeight="bold"
                          >
                            {liberated ? `\u2713 ${d.name.split(' ')[0]}` : `0${index + 1}. ${d.name.split(' ')[0]}`}
                          </text>
                        </g>
                      );
                    })}
                  </svg>

                  <div style={{ marginTop: 8, textAlign: 'left' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700, marginBottom: 4 }}>
                      <span style={{ color: allLiberated ? '#34d399' : '#38bdf8' }}>
                        {allLiberated ? 'PLANEET 100% BEVRIJD!' : 'PLANETAIRE OVERNAME'}
                      </span>
                      <span>
                        {hud.liberatedZones.length} / {DUNGEONS.length} Zones ({liberationPct}%)
                      </span>
                    </div>
                    <div style={{ height: 8, backgroundColor: '#1e293b', borderRadius: 999, overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${liberationPct}%`,
                          background: 'linear-gradient(90deg, #0284c7, #10b981)',
                          transition: 'width 0.3s ease',
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: '#0f172a',
                    border: `1px solid ${isSelectedLiberated ? '#10b98188' : selectedDungeon.accent + '66'}`,
                    borderRadius: 18,
                    padding: 22,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    minHeight: 430,
                    boxShadow: '0 20px 50px rgba(0,0,0,0.75)',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 11, fontFamily: 'monospace', color: selectedDungeon.accent, fontWeight: 700 }}>
                        {selectedMeta.sectorCode} &bull; {selectedDungeon.difficultyLabel}
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 800,
                          padding: '3px 10px',
                          borderRadius: 999,
                          backgroundColor: isSelectedLiberated ? 'rgba(16, 185, 129, 0.2)' : 'rgba(244, 63, 94, 0.2)',
                          color: isSelectedLiberated ? '#34d399' : '#fb7185',
                          border: `1px solid ${isSelectedLiberated ? '#10b981' : '#f43f5e'}`,
                        }}
                      >
                        {isSelectedLiberated ? 'ZONE INGENOMEN' : 'VIJANDELIJKE ZONE'}
                      </span>
                    </div>

                    <h2 style={{ margin: '8px 0 4px', fontSize: 28, fontWeight: 900, color: '#ffffff' }}>
                      {selectedDungeon.name}
                    </h2>
                    <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 16 }}>
                      Omgeving: <strong style={{ color: '#e2e8f0' }}>{selectedMeta.biome}</strong> &bull; World Tier{' '}
                      <strong>{hud.worldTier}</strong>
                    </div>

                    <div
                      style={{
                        backgroundColor: '#090d16',
                        border: '1px solid #1e293b',
                        borderRadius: 12,
                        padding: 14,
                        marginBottom: 12,
                      }}
                    >
                      <div style={{ fontSize: 10, fontFamily: 'monospace', color: '#fbbf24', fontWeight: 700 }}>
                        DOEL VAN DE OPERATIE
                      </div>
                      <div style={{ fontSize: 13, color: '#f1f5f9', marginTop: 4 }}>
                        Baan je een weg door de gangen, versla eindbaas{' '}
                        <strong style={{ color: '#fbbf24' }}>{selectedDungeon.bossName}</strong> en open de Sector-deur om
                        deze regio definitief in te nemen.
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                      <div
                        style={{
                          backgroundColor: '#090d16',
                          border: `1px solid ${isSelectedLiberated ? '#10b98155' : '#1e293b'}`,
                          borderRadius: 10,
                          padding: 11,
                        }}
                      >
                        <div style={{ fontSize: 10, fontFamily: 'monospace', color: '#34d399' }}>
                          {isSelectedLiberated ? 'ACTIEVE ZONE-BONUS' : 'BELONING BIJ INNAME'}
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 800, color: '#ffffff', marginTop: 3 }}>
                          {selectedMeta.captureBonus}
                        </div>
                      </div>

                      <div
                        style={{
                          backgroundColor: '#090d16',
                          border: '1px solid #1e293b',
                          borderRadius: 10,
                          padding: 11,
                        }}
                      >
                        <div style={{ fontSize: 10, fontFamily: 'monospace', color: '#38bdf8' }}>
                          DREIGING &amp; BOSS LOOT
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 800, color: '#ffffff', marginTop: 3 }}>
                          {(selectedDungeon.enemyMultiplier * (1 + (hud.worldTier - 1) * 0.55)).toFixed(1)}x Kracht &bull; +
                          {Math.round(selectedDungeon.rareBonusChance * 100)}% Rare
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {allLiberated && (
                      <div
                        style={{
                          backgroundColor: 'rgba(16, 185, 129, 0.14)',
                          border: '1px solid #10b981',
                          borderRadius: 10,
                          padding: '10px 12px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <span style={{ fontSize: 12, color: '#6ee7b7', fontWeight: 700 }}>
                          Alle 5 zones zijn ingenomen! Klaar voor World Tier {hud.worldTier + 1}?
                        </span>
                        <button
                          onClick={() => sceneRef.current?.resetWorldCampaign()}
                          style={{
                            backgroundColor: '#10b981',
                            color: '#060a12',
                            border: 'none',
                            borderRadius: 6,
                            padding: '6px 10px',
                            fontSize: 11,
                            fontWeight: 800,
                            cursor: 'pointer',
                          }}
                        >
                          Start World Tier {hud.worldTier + 1}
                        </button>
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => setActiveModal('inventory')}
                          style={{
                            backgroundColor: '#1e293b',
                            color: '#e2e8f0',
                            border: '1px solid #334155',
                            borderRadius: 8,
                            padding: '10px 12px',
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          Gear &amp; Rugzak [I]
                        </button>
                        <button
                          onClick={() => setActiveModal('skills')}
                          style={{
                            backgroundColor: '#1e293b',
                            color: '#5eead4',
                            border: '1px solid #0f766e',
                            borderRadius: 8,
                            padding: '10px 12px',
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          DNA Skills [K] {hud.dnaPoints > 0 ? `(+${hud.dnaPoints})` : ''}
                        </button>
                      </div>

                      <button
                        onClick={() => handleEnterDungeon(selectedDungeon.id)}
                        style={{
                          background: isSelectedLiberated
                            ? 'linear-gradient(90deg, #0284c7, #38bdf8)'
                            : 'linear-gradient(90deg, #059669, #10b981)',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: 10,
                          padding: '12px 20px',
                          fontSize: 13,
                          fontWeight: 800,
                          cursor: 'pointer',
                          boxShadow: '0 8px 24px rgba(16, 185, 129, 0.35)',
                        }}
                      >
                        {isSelectedLiberated ? 'FARM ZONE OPNIEUW' : 'NEEM ZONE IN'} &rarr;
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* DUNGEON VICTORY & ZONE INNAME SUMMARY */}
          {!showWorldMap && hud.runOutcome === 'VICTORY' && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                backgroundColor: 'rgba(5, 15, 12, 0.90)',
                backdropFilter: 'blur(8px)',
                borderRadius: 12,
                padding: 24,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 35,
              }}
            >
              <div
                style={{
                  width: '100%',
                  maxWidth: 580,
                  backgroundColor: '#0f172a',
                  border: '1px solid #10b98188',
                  borderRadius: 16,
                  padding: 24,
                  boxShadow: '0 25px 70px rgba(16, 185, 129, 0.25)',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: 11, fontFamily: 'monospace', letterSpacing: 3, color: '#34d399' }}>
                  ZONE LIBERATED &bull; {hud.liberatedZones.length}/{DUNGEONS.length} OP DE WERELDBOL
                </div>
                <h2 style={{ margin: '4px 0 6px', fontSize: 28, fontWeight: 900, color: '#ffffff' }}>
                  {hud.activeDungeon.name.toUpperCase()} INGENOMEN!
                </h2>
                <p style={{ margin: '0 0 16px', fontSize: 13, color: '#cbd5e1' }}>
                  <strong>{hud.activeDungeon.bossName}</strong> is uitgeschakeld. Permanente bonus ontgrendeld:{' '}
                  <strong style={{ color: '#34d399' }}>{ZONE_META[hud.activeDungeon.id]?.captureBonus}</strong>
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
                  <div style={{ backgroundColor: '#090d16', border: '1px solid #1e293b', borderRadius: 10, padding: 10 }}>
                    <div style={{ fontSize: 10, fontFamily: 'monospace', color: '#94a3b8' }}>HOSTILES VERSLAGEN</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: '#34d399' }}>{hud.dungeonStats.kills}</div>
                  </div>
                  <div style={{ backgroundColor: '#090d16', border: '1px solid #1e293b', borderRadius: 10, padding: 10 }}>
                    <div style={{ fontSize: 10, fontFamily: 'monospace', color: '#94a3b8' }}>VERDIENDE XP</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: '#c084fc' }}>+{hud.dungeonStats.xpEarned} XP</div>
                  </div>
                  <div style={{ backgroundColor: '#090d16', border: '1px solid #1e293b', borderRadius: 10, padding: 10 }}>
                    <div style={{ fontSize: 10, fontFamily: 'monospace', color: '#94a3b8' }}>LOOT VERZAMELD</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: '#38bdf8' }}>{hud.dungeonStats.lootFound} Items</div>
                  </div>
                </div>

                {hud.bossRewardItem && (
                  <div
                    style={{
                      border: `1px solid ${rarityColors[hud.bossRewardItem.rarity].border}`,
                      backgroundColor: rarityColors[hud.bossRewardItem.rarity].bg,
                      borderRadius: 12,
                      padding: 12,
                      marginBottom: 18,
                    }}
                  >
                    <div style={{ fontSize: 10, fontFamily: 'monospace', color: '#fbbf24', fontWeight: 700 }}>
                      BOSS CHEST BELONING (TOEGEVOEGD AAN RUGZAK)
                    </div>
                    <div
                      style={{
                        fontSize: 15,
                        fontWeight: 800,
                        color: rarityColors[hud.bossRewardItem.rarity].text,
                        marginTop: 2,
                      }}
                    >
                      {hud.bossRewardItem.name} ({hud.bossRewardItem.rarity})
                    </div>
                    <div style={{ fontSize: 12, color: '#e2e8f0' }}>{hud.bossRewardItem.description}</div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={() => sceneRef.current?.retryCurrentDungeon()}
                    style={{
                      flex: 1,
                      backgroundColor: '#1e293b',
                      color: '#f8fafc',
                      border: '1px solid #334155',
                      borderRadius: 10,
                      padding: '12px 14px',
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Herhaal Zone
                  </button>
                  <button
                    onClick={() => setShowWorldMap(true)}
                    style={{
                      flex: 1.4,
                      background: 'linear-gradient(90deg, #059669, #10b981)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: 10,
                      padding: '12px 14px',
                      fontSize: 13,
                      fontWeight: 800,
                      cursor: 'pointer',
                    }}
                  >
                    TERUG NAAR WERELDBOL &rarr;
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* DUNGEON WIPE */}
          {!showWorldMap && hud.runOutcome === 'WIPE' && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                backgroundColor: 'rgba(14, 5, 8, 0.90)',
                backdropFilter: 'blur(8px)',
                borderRadius: 12,
                padding: 24,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 35,
              }}
            >
              <div
                style={{
                  width: '100%',
                  maxWidth: 540,
                  backgroundColor: '#0f172a',
                  border: '1px solid #f43f5e88',
                  borderRadius: 16,
                  padding: 24,
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: 11, fontFamily: 'monospace', letterSpacing: 3, color: '#fb7185' }}>
                  AANVAL AFGESLAGEN &bull; VITALITY DEPLETED
                </div>
                <h2 style={{ margin: '4px 0 6px', fontSize: 26, fontWeight: 900, color: '#ffffff' }}>
                  VERSLAGEN IN {hud.activeDungeon.name.toUpperCase()}
                </h2>
                <p style={{ margin: '0 0 16px', fontSize: 13, color: '#cbd5e1' }}>
                  Je behoudt je <strong>Level {hud.level}</strong>, al je <strong>DNA-skills</strong>, je{' '}
                  <strong>ingenomen zones</strong> en je <strong>gevonden gear</strong>!
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 18 }}>
                  <div style={{ backgroundColor: '#090d16', border: '1px solid #1e293b', borderRadius: 10, padding: 10 }}>
                    <div style={{ fontSize: 10, fontFamily: 'monospace', color: '#94a3b8' }}>KILLS IN RUN</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: '#34d399' }}>{hud.dungeonStats.kills}</div>
                  </div>
                  <div style={{ backgroundColor: '#090d16', border: '1px solid #1e293b', borderRadius: 10, padding: 10 }}>
                    <div style={{ fontSize: 10, fontFamily: 'monospace', color: '#94a3b8' }}>BEHOUDEN XP</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: '#c084fc' }}>+{hud.dungeonStats.xpEarned} XP</div>
                  </div>
                  <div style={{ backgroundColor: '#090d16', border: '1px solid #1e293b', borderRadius: 10, padding: 10 }}>
                    <div style={{ fontSize: 10, fontFamily: 'monospace', color: '#94a3b8' }}>LOOT BEHOUDEN</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: '#38bdf8' }}>{hud.dungeonStats.lootFound} Items</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={() => setShowWorldMap(true)}
                    style={{
                      flex: 1,
                      backgroundColor: '#1e293b',
                      color: '#f8fafc',
                      border: '1px solid #334155',
                      borderRadius: 10,
                      padding: '12px 14px',
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Terug naar Wereldbol
                  </button>
                  <button
                    onClick={() => sceneRef.current?.retryCurrentDungeon()}
                    style={{
                      flex: 1.3,
                      background: 'linear-gradient(90deg, #e11d48, #f43f5e)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: 10,
                      padding: '12px 14px',
                      fontSize: 13,
                      fontWeight: 800,
                      cursor: 'pointer',
                    }}
                  >
                    VAL OPNIEUW AAN
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* [K] DNA-STRING SKILL TREE MODAL (ENIGE LEVEL-UP BESTEMMING) */}
          {activeModal === 'skills' && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                backgroundColor: 'rgba(6, 10, 18, 0.90)',
                backdropFilter: 'blur(7px)',
                borderRadius: 12,
                padding: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 55,
              }}
            >
              <div
                style={{
                  width: '100%',
                  maxWidth: 900,
                  backgroundColor: '#0f172a',
                  border: '1px solid #2dd4bf66',
                  borderRadius: 16,
                  padding: 20,
                  boxShadow: '0 24px 60px rgba(0,0,0,0.85)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: '1px solid #1e293b',
                    paddingBottom: 10,
                    marginBottom: 16,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 900, color: '#2dd4bf' }}>
                      GENETIC SKILL HELIX &bull; LEVEL {hud.level} SKILL PROGRESSIE
                    </div>
                    <div style={{ fontSize: 12, color: '#cbd5e1', marginTop: 2 }}>
                      Beschikbare DNA Punten: <strong style={{ color: '#facc15' }}>{hud.dnaPoints}</strong> &bull; XP:{' '}
                      {hud.xp} / {hud.xpToNext} &bull; Ontgrendel &amp; evolueer je skills via DNA
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveModal('none')}
                    style={{
                      backgroundColor: '#1e293b',
                      color: '#e2e8f0',
                      border: '1px solid #334155',
                      borderRadius: 6,
                      padding: '4px 10px',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Sluiten [K / ESC]
                  </button>
                </div>

                {/* 3-Koloms DNA-String Layout */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px 1fr', gap: 14, alignItems: 'center' }}>
                  {/* Linker DNA-streng (Bio-Shot & Phase Dodge) */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {HELIX_SKILLS.filter((s) => s.strand === 'LEFT').map((sk) => {
                      const rank = hud.skills[sk.key];
                      const isUnlocked = rank > 0;
                      return (
                        <div
                          key={sk.key}
                          style={{
                            border: `1px solid ${isUnlocked ? sk.color : '#334155'}`,
                            backgroundColor: isUnlocked ? 'rgba(15, 118, 110, 0.22)' : '#090d16',
                            borderRadius: 12,
                            padding: 13,
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: 11, fontFamily: 'monospace', color: sk.color, fontWeight: 700 }}>
                              {sk.hotkey} {sk.baseName.toUpperCase()}
                            </span>
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 800,
                                padding: '2px 7px',
                                borderRadius: 999,
                                backgroundColor: isUnlocked ? sk.color : '#1e293b',
                                color: isUnlocked ? '#060a12' : '#94a3b8',
                              }}
                            >
                              {isUnlocked ? `RANK ${rank}` : 'LOCKED'}
                            </span>
                          </div>
                          <div style={{ fontSize: 12, color: '#e2e8f0', marginTop: 6 }}>{sk.unlockDesc}</div>
                          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4, lineHeight: 1.4 }}>{sk.evolveDesc}</div>
                          <button
                            onClick={() => handleUpgradeSkill(sk.key)}
                            disabled={hud.dnaPoints <= 0}
                            style={{
                              marginTop: 10,
                              width: '100%',
                              backgroundColor: sk.color,
                              color: '#060a12',
                              border: 'none',
                              borderRadius: 7,
                              padding: '6px 10px',
                              fontSize: 12,
                              fontWeight: 800,
                              cursor: hud.dnaPoints > 0 ? 'pointer' : 'not-allowed',
                              opacity: hud.dnaPoints > 0 ? 1 : 0.35,
                            }}
                          >
                            {isUnlocked ? `+ Evolueer naar Rank ${rank + 1} (1 DNA)` : 'Ontgrendel Skill (1 DNA)'}
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {/* Midden: Visuele DNA Dubbele Helix SVG */}
                  <div style={{ textAlign: 'center' }}>
                    <svg viewBox="0 0 140 340" style={{ width: '100%', maxWidth: 140, height: 'auto' }}>
                      <path
                        d="M30,15 C110,65 110,115 30,170 C-10,225 110,275 30,325"
                        fill="none"
                        stroke="#38bdf8"
                        strokeWidth="4"
                      />
                      <path
                        d="M110,15 C30,65 30,115 110,170 C150,225 30,275 110,325"
                        fill="none"
                        stroke="#2dd4bf"
                        strokeWidth="4"
                      />

                      {[35, 70, 105, 140, 170, 205, 240, 275, 308].map((y, idx) => (
                        <line
                          key={y}
                          x1="34"
                          y1={y}
                          x2="106"
                          y2={y}
                          stroke={idx % 2 === 0 ? '#38bdf866' : '#2dd4bf66'}
                          strokeWidth="2.5"
                          strokeDasharray="4 3"
                        />
                      ))}

                      <circle
                        cx="32"
                        cy="62"
                        r="11"
                        fill={hud.skills.bioShot > 0 ? '#38bdf8' : '#090d16'}
                        stroke="#38bdf8"
                        strokeWidth="3"
                      />
                      <circle
                        cx="108"
                        cy="132"
                        r="11"
                        fill={hud.skills.coneSlam > 0 ? '#fb7185' : '#090d16'}
                        stroke="#fb7185"
                        strokeWidth="3"
                      />
                      <circle
                        cx="32"
                        cy="208"
                        r="11"
                        fill={hud.skills.phaseDodge > 0 ? '#2dd4bf' : '#090d16'}
                        stroke="#2dd4bf"
                        strokeWidth="3"
                      />
                      <circle
                        cx="108"
                        cy="278"
                        r="11"
                        fill={hud.skills.meltdownUlt > 0 ? '#fb923c' : '#090d16'}
                        stroke="#fb923c"
                        strokeWidth="3"
                      />
                    </svg>
                    <div style={{ fontSize: 10, fontFamily: 'monospace', color: '#64748b' }}>DNA HELIX</div>
                  </div>

                  {/* Rechter DNA-streng (Cone-Slam & Meltdown Ult) */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {HELIX_SKILLS.filter((s) => s.strand === 'RIGHT').map((sk) => {
                      const rank = hud.skills[sk.key];
                      const isUnlocked = rank > 0;
                      return (
                        <div
                          key={sk.key}
                          style={{
                            border: `1px solid ${isUnlocked ? sk.color : '#334155'}`,
                            backgroundColor: isUnlocked ? 'rgba(136, 19, 55, 0.22)' : '#090d16',
                            borderRadius: 12,
                            padding: 13,
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: 11, fontFamily: 'monospace', color: sk.color, fontWeight: 700 }}>
                              {sk.hotkey} {sk.baseName.toUpperCase()}
                            </span>
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 800,
                                padding: '2px 7px',
                                borderRadius: 999,
                                backgroundColor: isUnlocked ? sk.color : '#1e293b',
                                color: isUnlocked ? '#060a12' : '#fb7185',
                              }}
                            >
                              {isUnlocked ? `RANK ${rank}` : 'LOCKED'}
                            </span>
                          </div>
                          <div style={{ fontSize: 12, color: '#e2e8f0', marginTop: 6 }}>{sk.unlockDesc}</div>
                          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4, lineHeight: 1.4 }}>{sk.evolveDesc}</div>
                          <button
                            onClick={() => handleUpgradeSkill(sk.key)}
                            disabled={hud.dnaPoints <= 0}
                            style={{
                              marginTop: 10,
                              width: '100%',
                              backgroundColor: sk.color,
                              color: '#060a12',
                              border: 'none',
                              borderRadius: 7,
                              padding: '6px 10px',
                              fontSize: 12,
                              fontWeight: 800,
                              cursor: hud.dnaPoints > 0 ? 'pointer' : 'not-allowed',
                              opacity: hud.dnaPoints > 0 ? 1 : 0.35,
                            }}
                          >
                            {isUnlocked ? `+ Evolueer naar Rank ${rank + 1} (1 DNA)` : 'Ontgrendel Skill (1 DNA)'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* [I] INVENTORY & GEAR MODAL */}
          {activeModal === 'inventory' && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                backgroundColor: 'rgba(6, 10, 18, 0.88)',
                backdropFilter: 'blur(6px)',
                borderRadius: 12,
                padding: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 55,
              }}
            >
              <div
                style={{
                  width: '100%',
                  maxWidth: 760,
                  backgroundColor: '#0f172a',
                  border: '1px solid #38bdf866',
                  borderRadius: 14,
                  padding: 18,
                  boxShadow: '0 24px 60px rgba(0,0,0,0.85)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: '1px solid #1e293b',
                    paddingBottom: 10,
                    marginBottom: 14,
                  }}
                >
                  <div>
                    <span style={{ fontSize: 16, fontWeight: 800, color: '#38bdf8' }}>SOMATIC GEAR &amp; RUGZAK</span>
                    <span style={{ marginLeft: 12, fontSize: 12, color: '#94a3b8' }}>
                      Blijvende Uitrusting (6% mob / 12% boss)
                    </span>
                  </div>
                  <button
                    onClick={() => setActiveModal('none')}
                    style={{
                      backgroundColor: '#1e293b',
                      color: '#e2e8f0',
                      border: '1px solid #334155',
                      borderRadius: 6,
                      padding: '4px 10px',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Sluiten [I / ESC]
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 16 }}>
                  <div>
                    <div style={{ fontSize: 11, fontFamily: 'monospace', color: '#94a3b8', marginBottom: 8 }}>
                      EQUIPPED GEAR
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {(['WEAPON', 'ARMOR', 'INJECTOR'] as ItemSlot[]).map((slot) => {
                        const item = hud.equipped[slot];
                        const style = item ? rarityColors[item.rarity] : null;
                        return (
                          <div
                            key={slot}
                            style={{
                              border: `1px solid ${style ? style.border : '#1e293b'}`,
                              backgroundColor: style ? style.bg : '#090d16',
                              borderRadius: 8,
                              padding: 10,
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#94a3b8' }}>
                                {slotMeta[slot].icon} {slotMeta[slot].label}
                              </span>
                              {item && (
                                <span style={{ fontSize: 10, fontWeight: 700, color: style!.text }}>{item.rarity}</span>
                              )}
                            </div>
                            {item ? (
                              <div style={{ marginTop: 4 }}>
                                <div style={{ fontSize: 13, fontWeight: 700, color: style!.text }}>{item.name}</div>
                                <div style={{ fontSize: 11, color: '#e2e8f0' }}>{item.description}</div>
                              </div>
                            ) : (
                              <div style={{ fontSize: 11, color: '#475569', fontStyle: 'italic', marginTop: 4 }}>
                                &mdash; leeg slot &mdash;
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#94a3b8' }}>RUGZAK</span>
                      <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#94a3b8' }}>
                        {hud.inventory.length} / 12
                      </span>
                    </div>

                    {hud.inventory.length === 0 ? (
                      <div
                        style={{
                          border: '1px dashed #334155',
                          borderRadius: 8,
                          padding: 28,
                          textAlign: 'center',
                          fontSize: 12,
                          color: '#64748b',
                        }}
                      >
                        Rugzak is leeg. Neem zones in op de wereldbol voor gegarandeerde Boss Chest loot!
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 7, maxHeight: 280, overflowY: 'auto' }}>
                        {hud.inventory.map((item: LootItem) => {
                          const style = rarityColors[item.rarity];
                          return (
                            <div
                              key={item.id}
                              style={{
                                border: `1px solid ${style.border}`,
                                backgroundColor: style.bg,
                                borderRadius: 8,
                                padding: '8px 10px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                gap: 8,
                              }}
                            >
                              <div>
                                <div style={{ fontSize: 12, fontWeight: 700, color: style.text }}>{item.name}</div>
                                <div style={{ fontSize: 11, color: '#cbd5e1' }}>{item.description}</div>
                              </div>
                              <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                                <button
                                  onClick={() => handleEquip(item.id)}
                                  style={{
                                    backgroundColor: '#0284c7',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: 5,
                                    padding: '4px 8px',
                                    fontSize: 11,
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                  }}
                                >
                                  Equip
                                </button>
                                <button
                                  onClick={() => handleSalvage(item.id)}
                                  style={{
                                    backgroundColor: '#1e293b',
                                    color: '#cbd5e1',
                                    border: 'none',
                                    borderRadius: 5,
                                    padding: '4px 7px',
                                    fontSize: 11,
                                    cursor: 'pointer',
                                  }}
                                >
                                  +XP
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Onderste Statusbalk (XP voedt direct DNA Skills [K], Cone-Slam & Meltdown tonen Locked tot vrijgespeeld) */}
        <footer
          style={{
            backgroundColor: '#0f172a',
            border: '1px solid #1e293b',
            borderRadius: 12,
            padding: '10px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700, marginBottom: 3 }}>
              <span style={{ color: '#2dd4bf' }}>
                LEVEL {hud.level} &bull; SKILL XP PROGRESSIE {hud.dnaPoints > 0 ? `(${hud.dnaPoints} DNA PUNT KLAAR IN [K]!)` : ''}
              </span>
              <span style={{ color: '#e2e8f0' }}>
                {hud.xp} / {hud.xpToNext} XP ({Math.round(xpPct)}%)
              </span>
            </div>
            <div style={{ height: 9, backgroundColor: '#1e293b', borderRadius: 999, overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${xpPct}%`,
                  background: 'linear-gradient(90deg, #0d9488, #2dd4bf)',
                  transition: 'width 0.2s ease',
                }}
              />
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '210px 1fr 170px',
              gap: 12,
              alignItems: 'center',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700 }}>
                  <span style={{ color: '#34d399' }}>VITALITY</span>
                  <span>{hud.hp} / {hud.maxHp}</span>
                </div>
                <div style={{ height: 7, backgroundColor: '#1e293b', borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${hpPct}%`, backgroundColor: '#10b981' }} />
                </div>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700 }}>
                  <span style={{ color: '#38bdf8' }}>BIO-ENERGY (MANA)</span>
                  <span>{hud.energy} / {hud.maxEnergy}</span>
                </div>
                <div style={{ height: 7, backgroundColor: '#1e293b', borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${energyPct}%`, backgroundColor: '#0ea5e9' }} />
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6 }}>
              {[
                {
                  key: '[LMB]',
                  name: 'Bio-Shot',
                  sub: `Rk ${hud.skills.bioShot} (+8 Mana)`,
                  color: '#38bdf8',
                  locked: false,
                  active: false,
                  onClick: undefined,
                },
                {
                  key: '[RMB]',
                  name: 'Cone-Slam',
                  sub: hud.skills.coneSlam > 0 ? `${hud.manaCosts.slam} Mana` : 'LOCKED [K]',
                  color: '#fb7185',
                  locked: hud.skills.coneSlam <= 0,
                  active: false,
                  onClick: undefined,
                },
                {
                  key: '[SPATIE]',
                  name: 'Dodge',
                  sub: `${hud.manaCosts.dodge} Mana`,
                  color: '#2dd4bf',
                  locked: false,
                  active: false,
                  onClick: undefined,
                },
                {
                  key: '[E]',
                  name: 'Meltdown',
                  sub:
                    hud.skills.meltdownUlt <= 0
                      ? 'LOCKED [K]'
                      : hud.meltdownActive
                      ? 'ACTIEF!'
                      : '80% Heat',
                  color: '#fb923c',
                  locked: hud.skills.meltdownUlt <= 0,
                  active: hud.skills.meltdownUlt > 0 && (hud.heat >= 80 || hud.meltdownActive),
                  onClick: undefined,
                },
                {
                  key: '[I]',
                  name: 'Inventory',
                  sub: `${hud.inventory.length}/12`,
                  color: '#38bdf8',
                  locked: false,
                  active: activeModal === 'inventory',
                  onClick: () => setActiveModal((p) => (p === 'inventory' ? 'none' : 'inventory')),
                },
                {
                  key: '[K]',
                  name: 'DNA Skills',
                  sub: hud.dnaPoints > 0 ? `+${hud.dnaPoints} DNA!` : `Lvl ${hud.level}`,
                  color: '#2dd4bf',
                  locked: false,
                  active: hud.dnaPoints > 0 || activeModal === 'skills',
                  onClick: () => setActiveModal((p) => (p === 'skills' ? 'none' : 'skills')),
                },
              ].map((s) => (
                <div
                  key={s.key}
                  onClick={s.onClick}
                  style={{
                    border: `1px solid ${s.active ? s.color : '#1e293b'}`,
                    backgroundColor: s.active ? 'rgba(15, 118, 110, 0.30)' : '#090d16',
                    borderRadius: 8,
                    padding: '5px 4px',
                    textAlign: 'center',
                    opacity: s.locked ? 0.45 : 1,
                    cursor: s.onClick ? 'pointer' : 'default',
                  }}
                >
                  <div style={{ fontSize: 10, fontFamily: 'monospace', color: s.color }}>{s.key}</div>
                  <div style={{ fontSize: 11, fontWeight: 700 }}>{s.name}</div>
                  <div style={{ fontSize: 10, color: s.locked ? '#fb7185' : '#94a3b8' }}>{s.sub}</div>
                </div>
              ))}
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700, marginBottom: 3 }}>
                <span style={{ color: '#fb923c' }}>HEAT (ULT)</span>
                <span>{hud.heat}%</span>
              </div>
              <div style={{ height: 8, backgroundColor: '#1e293b', borderRadius: 999, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${hud.heat}%`, backgroundColor: '#f97316' }} />
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}