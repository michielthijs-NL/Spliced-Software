import { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import {
  ArenaScene,
  DUNGEONS,
  type HudSnapshot,
  type SomaticUpgrades,
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
  enemiesRemaining: 19,
  cooldowns: { slam: 0, dash: 0 },
  upgrades: { bruteForce: 0, flexibleMass: 0, isotopeCore: 0 },
  equipped: { WEAPON: null, ARMOR: null, INJECTOR: null },
  inventory: [],
  runOutcome: 'PLAYING',
  bossRewardItem: null,
  dungeonStats: { kills: 0, bossDefeated: false, xpEarned: 0, lootFound: 0 },
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

export default function App() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<ArenaScene | null>(null);
  const [hud, setHud] = useState<HudSnapshot>(initialHud);
  const [activeModal, setActiveModal] = useState<'none' | 'inventory' | 'levelup'>('none');
  const [showDungeonSelect, setShowDungeonSelect] = useState<boolean>(true);
  const [selectedDungeonId, setSelectedDungeonId] = useState<string>(DUNGEONS[0].id);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (showDungeonSelect) return;
      const k = e.key.toLowerCase();
      if (k === 'i') {
        e.preventDefault();
        setActiveModal((prev) => (prev === 'inventory' ? 'none' : 'inventory'));
      } else if (k === 'j') {
        e.preventDefault();
        setActiveModal((prev) => (prev === 'levelup' ? 'none' : 'levelup'));
      } else if (e.key === 'Escape') {
        setActiveModal('none');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showDungeonSelect]);

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
    setShowDungeonSelect(false);
    sceneRef.current?.startDungeon(dungeonId);
  };

  const handleSplice = (stat: keyof SomaticUpgrades) => sceneRef.current?.applyUpgrade(stat);
  const handleEquip = (itemId: string) => sceneRef.current?.equipItem(itemId);
  const handleSalvage = (itemId: string) => sceneRef.current?.salvageItem(itemId);

  const hpPct = Math.max(0, Math.min(100, (hud.hp / Math.max(1, hud.maxHp)) * 100));
  const energyPct = Math.max(0, Math.min(100, (hud.energy / Math.max(1, hud.maxEnergy)) * 100));
  const xpPct = Math.max(0, Math.min(100, (hud.xp / Math.max(1, hud.xpToNext)) * 100));

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
              DUNGEON: {hud.activeDungeon.name.toUpperCase()} &bull; BOSS: {hud.activeDungeon.bossName.toUpperCase()} ({hud.enemiesRemaining} HOSTILES)
            </div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#ffffff' }}>Spliced: Meltdown</h1>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => {
                setActiveModal('none');
                setShowDungeonSelect(true);
              }}
              style={{
                backgroundColor: '#0f172a',
                border: '1px solid #475569',
                color: '#f8fafc',
                borderRadius: 10,
                padding: '8px 14px',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              DUNGEONS ({hud.dungeonsClearedTotal} CLEARED)
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
              onClick={() => setActiveModal((prev) => (prev === 'levelup' ? 'none' : 'levelup'))}
              style={{
                backgroundColor: hud.dnaPoints > 0 ? '#7e22ce' : activeModal === 'levelup' ? '#581c87' : '#0f172a',
                border: `1px solid ${hud.dnaPoints > 0 || activeModal === 'levelup' ? '#c084fc' : '#334155'}`,
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
              <span>[J] LEVEL-UP</span>
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

        {/* Hoofd Game Viewport + Overlays */}
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

          {/* DUNGEON SELECT LOBBY (VOOR START & TUSSEN RUNS) */}
          {showDungeonSelect && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                backgroundColor: 'rgba(6, 10, 18, 0.94)',
                backdropFilter: 'blur(8px)',
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
                  maxWidth: 980,
                  backgroundColor: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: 16,
                  padding: 20,
                  boxShadow: '0 25px 70px rgba(0,0,0,0.85)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: '1px solid #1e293b',
                    paddingBottom: 12,
                    marginBottom: 16,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 11, fontFamily: 'monospace', letterSpacing: 2, color: '#38bdf8' }}>
                      DUNGEON FINDER &bull; PERSISTENT CHARACTER PROGRESSION
                    </div>
                    <h2 style={{ margin: '2px 0 0', fontSize: 22, fontWeight: 800 }}>Kies een Dungeon om binnen te vallen</h2>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: 12 }}>
                    <div style={{ fontWeight: 800, color: '#c084fc' }}>
                      Karakter Rank Level {hud.level} ({hud.dungeonsClearedTotal} Dungeons voltooid)
                    </div>
                    <div style={{ color: '#94a3b8' }}>
                      Max HP: {hud.maxHp} &bull; DNA Punten: {hud.dnaPoints} &bull; Rugzak: {hud.inventory.length}/12
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 18 }}>
                  {DUNGEONS.map((d) => {
                    const isSelected = selectedDungeonId === d.id;
                    const underLeveled = hud.level < d.recommendedLevel;
                    return (
                      <div
                        key={d.id}
                        onClick={() => setSelectedDungeonId(d.id)}
                        style={{
                          border: `2px solid ${isSelected ? d.accent : '#1e293b'}`,
                          backgroundColor: isSelected ? 'rgba(30, 41, 59, 0.85)' : '#090d16',
                          borderRadius: 12,
                          padding: 12,
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          minHeight: 215,
                        }}
                      >
                        <div>
                          <div style={{ fontSize: 10, fontFamily: 'monospace', color: d.accent, fontWeight: 700 }}>
                            {d.difficultyLabel}
                          </div>
                          <div style={{ fontSize: 15, fontWeight: 800, color: '#ffffff', marginTop: 4 }}>{d.name}</div>
                          <div
                            style={{
                              marginTop: 8,
                              padding: '5px 7px',
                              borderRadius: 6,
                              backgroundColor: '#0f172a',
                              border: '1px solid #1e293b',
                              fontSize: 11,
                            }}
                          >
                            <div style={{ color: '#94a3b8', fontSize: 10 }}>EINDBAAS</div>
                            <div style={{ color: '#fbbf24', fontWeight: 700 }}>{d.bossName}</div>
                          </div>
                        </div>

                        <div style={{ marginTop: 12, fontSize: 11, color: '#cbd5e1' }}>
                          <div>Enemy Power: <strong>{d.enemyMultiplier}x</strong></div>
                          <div>Loot Bonus: <strong>+{Math.round(d.rareBonusChance * 100)}% Rare</strong></div>
                          {underLeveled && (
                            <div style={{ color: '#fb7185', fontSize: 10, marginTop: 4 }}>
                              Aanbevolen: Level {d.recommendedLevel}+
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => {
                        setShowDungeonSelect(false);
                        setActiveModal('inventory');
                      }}
                      style={{
                        backgroundColor: '#1e293b',
                        color: '#e2e8f0',
                        border: '1px solid #334155',
                        borderRadius: 8,
                        padding: '10px 14px',
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Bekijk Gear &amp; Rugzak [I]
                    </button>
                    <button
                      onClick={() => {
                        setShowDungeonSelect(false);
                        setActiveModal('levelup');
                      }}
                      style={{
                        backgroundColor: '#1e293b',
                        color: '#e2e8f0',
                        border: '1px solid #334155',
                        borderRadius: 8,
                        padding: '10px 14px',
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      DNA Mutaties [J] {hud.dnaPoints > 0 ? `(+${hud.dnaPoints})` : ''}
                    </button>
                  </div>

                  <button
                    onClick={() => handleEnterDungeon(selectedDungeonId)}
                    style={{
                      background: 'linear-gradient(90deg, #0284c7, #10b981)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: 10,
                      padding: '12px 24px',
                      fontSize: 14,
                      fontWeight: 800,
                      cursor: 'pointer',
                      boxShadow: '0 8px 24px rgba(16, 185, 129, 0.35)',
                    }}
                  >
                    ENTER DUNGEON: {(DUNGEONS.find((d) => d.id === selectedDungeonId) ?? DUNGEONS[0]).name.toUpperCase()} &rarr;
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* DUNGEON VICTORY & BOSS REWARD SUMMARY */}
          {!showDungeonSelect && hud.runOutcome === 'VICTORY' && (
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
                  DUNGEON CLEARED &bull; BOSS DEFEATED
                </div>
                <h2 style={{ margin: '4px 0 6px', fontSize: 28, fontWeight: 900, color: '#ffffff' }}>
                  {hud.activeDungeon.name.toUpperCase()} VOLTOOID!
                </h2>
                <p style={{ margin: '0 0 16px', fontSize: 13, color: '#cbd5e1' }}>
                  Je hebt <strong>{hud.activeDungeon.bossName}</strong> verslagen. Al je XP, Levels en Gear blijven behouden!
                </p>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 10,
                    marginBottom: 16,
                  }}
                >
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
                    Herhaal {hud.activeDungeon.name}
                  </button>
                  <button
                    onClick={() => setShowDungeonSelect(true)}
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
                    KIES VOLGENDE DUNGEON &rarr;
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* DUNGEON WIPE (HP = 0, PROGRESSIE BLIJFT BEHOUDEN) */}
          {!showDungeonSelect && hud.runOutcome === 'WIPE' && (
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
                  DUNGEON WIPE &bull; VITALITY DEPLETED
                </div>
                <h2 style={{ margin: '4px 0 6px', fontSize: 26, fontWeight: 900, color: '#ffffff' }}>
                  VERSLAGEN IN {hud.activeDungeon.name.toUpperCase()}
                </h2>
                <p style={{ margin: '0 0 16px', fontSize: 13, color: '#cbd5e1' }}>
                  Geen zorgen: je behoudt je <strong>Level {hud.level}</strong>, al je <strong>DNA-mutaties</strong> en je{' '}
                  <strong>gevonden gear</strong>!
                </p>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 10,
                    marginBottom: 18,
                  }}
                >
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
                    onClick={() => setShowDungeonSelect(true)}
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
                    Andere Dungeon Kiezen
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
                    OPNIEUW PROBEREN
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* [I] INVENTORY & GEAR MODAL */}
          {!showDungeonSelect && activeModal === 'inventory' && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                backgroundColor: 'rgba(6, 10, 18, 0.86)',
                backdropFilter: 'blur(6px)',
                borderRadius: 12,
                padding: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 25,
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
                        Rugzak is leeg. Versla Dungeon Bosses voor gegarandeerde Boss Chest loot!
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

          {/* [J] LEVEL-UP & DNA MUTATIONS MODAL */}
          {!showDungeonSelect && activeModal === 'levelup' && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                backgroundColor: 'rgba(6, 10, 18, 0.86)',
                backdropFilter: 'blur(6px)',
                borderRadius: 12,
                padding: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 25,
              }}
            >
              <div
                style={{
                  width: '100%',
                  maxWidth: 560,
                  backgroundColor: '#0f172a',
                  border: '1px solid #a855f788',
                  borderRadius: 14,
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
                    marginBottom: 14,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#c084fc' }}>
                      LEVEL {hud.level} &bull; SOMATIC DNA OVERRIDES
                    </div>
                    <div style={{ fontSize: 12, color: '#e2e8f0', marginTop: 2 }}>
                      Beschikbare DNA Punten: <strong style={{ color: '#facc15' }}>{hud.dnaPoints}</strong> &bull; XP:{' '}
                      {hud.xp} / {hud.xpToNext}
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
                    Sluiten [J / ESC]
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[
                    {
                      key: 'bruteForce' as const,
                      title: `Brute Force (Rank ${hud.upgrades.bruteForce})`,
                      desc: '+35 Max HP, +22 Stretch-Slam DMG & +14px schokgolf-radius',
                      accent: '#f43f5e',
                      bg: 'rgba(136, 19, 55, 0.25)',
                    },
                    {
                      key: 'flexibleMass' as const,
                      title: `Flexible Mass (Rank ${hud.upgrades.flexibleMass})`,
                      desc: 'Hogere loopsnelheid, snellere Bio-Shots & kortere [SPATIE] Dodge cooldown',
                      accent: '#10b981',
                      bg: 'rgba(6, 78, 59, 0.25)',
                    },
                    {
                      key: 'isotopeCore' as const,
                      title: `Isotope Core (Rank ${hud.upgrades.isotopeCore})`,
                      desc: '+9 Bio-Shot DMG & krachtigere [E] Meltdown stralingsaura',
                      accent: '#0ea5e9',
                      bg: 'rgba(12, 74, 110, 0.25)',
                    },
                  ].map((u) => (
                    <div
                      key={u.key}
                      style={{
                        border: `1px solid ${u.accent}66`,
                        backgroundColor: u.bg,
                        borderRadius: 10,
                        padding: 12,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong style={{ fontSize: 14 }}>{u.title}</strong>
                        <button
                          onClick={() => handleSplice(u.key)}
                          disabled={hud.dnaPoints <= 0}
                          style={{
                            backgroundColor: u.accent,
                            color: '#fff',
                            border: 'none',
                            borderRadius: 6,
                            padding: '5px 12px',
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: hud.dnaPoints > 0 ? 'pointer' : 'not-allowed',
                            opacity: hud.dnaPoints > 0 ? 1 : 0.35,
                          }}
                        >
                          + Splice (1 DNA)
                        </button>
                      </div>
                      <div style={{ fontSize: 12, color: '#cbd5e1', marginTop: 5 }}>{u.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Onderste Statusbalk */}
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
              <span style={{ color: '#c084fc' }}>LEVEL {hud.level} &bull; KARAKTER PROGRESSIE</span>
              <span style={{ color: '#e2e8f0' }}>
                {hud.xp} / {hud.xpToNext} XP ({Math.round(xpPct)}%)
              </span>
            </div>
            <div style={{ height: 9, backgroundColor: '#1e293b', borderRadius: 999, overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${xpPct}%`,
                  background: 'linear-gradient(90deg, #9333ea, #c084fc)',
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
                  <span style={{ color: '#38bdf8' }}>BIO-ENERGY</span>
                  <span>{hud.energy} / {hud.maxEnergy}</span>
                </div>
                <div style={{ height: 7, backgroundColor: '#1e293b', borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${energyPct}%`, backgroundColor: '#0ea5e9' }} />
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6 }}>
              {[
                { key: '[LMB]', name: 'Bio-Shot', sub: '+8 Energy', color: '#38bdf8', active: false, onClick: undefined },
                {
                  key: '[RMB]',
                  name: 'Stretch-Slam',
                  sub: hud.cooldowns.slam > 0 ? `${hud.cooldowns.slam}s` : '25 Energy',
                  color: '#fb7185',
                  active: false,
                  onClick: undefined,
                },
                {
                  key: '[SPATIE]',
                  name: 'Dodge',
                  sub: hud.cooldowns.dash > 0 ? `${hud.cooldowns.dash}s` : '20 Energy',
                  color: '#2dd4bf',
                  active: false,
                  onClick: undefined,
                },
                {
                  key: '[E]',
                  name: 'Meltdown',
                  sub: hud.meltdownActive ? 'ACTIEF!' : '80% Heat',
                  color: '#fb923c',
                  active: hud.heat >= 80 || hud.meltdownActive,
                  onClick: undefined,
                },
                {
                  key: '[I]',
                  name: 'Inventory',
                  sub: `${hud.inventory.length}/12`,
                  color: '#38bdf8',
                  active: activeModal === 'inventory',
                  onClick: () => setActiveModal((p) => (p === 'inventory' ? 'none' : 'inventory')),
                },
                {
                  key: '[J]',
                  name: 'Level-Up',
                  sub: hud.dnaPoints > 0 ? `${hud.dnaPoints} DNA!` : `Lvl ${hud.level}`,
                  color: '#c084fc',
                  active: hud.dnaPoints > 0 || activeModal === 'levelup',
                  onClick: () => setActiveModal((p) => (p === 'levelup' ? 'none' : 'levelup')),
                },
              ].map((s) => (
                <div
                  key={s.key}
                  onClick={s.onClick}
                  style={{
                    border: `1px solid ${s.active ? s.color : '#1e293b'}`,
                    backgroundColor: s.active ? 'rgba(88, 28, 135, 0.32)' : '#090d16',
                    borderRadius: 8,
                    padding: '5px 4px',
                    textAlign: 'center',
                    cursor: s.onClick ? 'pointer' : 'default',
                  }}
                >
                  <div style={{ fontSize: 10, fontFamily: 'monospace', color: s.color }}>{s.key}</div>
                  <div style={{ fontSize: 11, fontWeight: 700 }}>{s.name}</div>
                  <div style={{ fontSize: 10, color: '#94a3b8' }}>{s.sub}</div>
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