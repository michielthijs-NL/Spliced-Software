import { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import {
  ArenaScene,
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
  packNumber: 1,
  enemiesRemaining: 20,
  cooldowns: { slam: 0, dash: 0 },
  upgrades: { bruteForce: 0, flexibleMass: 0, isotopeCore: 0 },
  equipped: { WEAPON: null, ARMOR: null, INJECTOR: null },
  inventory: [],
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
  const [inventoryOpen, setInventoryOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'i' || e.key === 'I' || e.key === 'Tab') {
        e.preventDefault();
        setInventoryOpen((prev) => !prev);
      } else if (e.key === 'Escape') {
        setInventoryOpen(false);
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
            <div style={{ fontSize: 11, fontFamily: 'monospace', letterSpacing: 2, color: '#38bdf8' }}>
              ZERO-TO-HERO RUN &bull; SECTOR #{hud.packNumber} ({hud.enemiesRemaining} HOSTILES)
            </div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#ffffff' }}>Spliced: Meltdown</h1>
          </div>

          <button
            onClick={() => setInventoryOpen((prev) => !prev)}
            style={{
              backgroundColor: hud.dnaPoints > 0 ? '#7e22ce' : '#0f172a',
              border: `1px solid ${hud.dnaPoints > 0 ? '#c084fc' : '#334155'}`,
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
            <span>[I] INVENTORY &amp; DNA</span>
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
            {hud.inventory.length > 0 && (
              <span style={{ fontSize: 11, color: '#94a3b8' }}>({hud.inventory.length} items)</span>
            )}
          </button>
        </header>

        {/* Hoofd Game Viewport + Inventory Modal Overlay */}
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

          {/* [I] INVENTORY & CHARACTER OVERLAY */}
          {inventoryOpen && (
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
                zIndex: 20,
              }}
            >
              <div
                style={{
                  width: '100%',
                  maxWidth: 920,
                  backgroundColor: '#0f172a',
                  border: '1px solid #334155',
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
                    <span style={{ fontSize: 16, fontWeight: 800 }}>SOMATIC INVENTORY &amp; MUTATIONS</span>
                    <span style={{ marginLeft: 12, fontSize: 12, color: '#c084fc', fontWeight: 700 }}>
                      Level {hud.level} &bull; {hud.dnaPoints} DNA Punt(en) beschikbaar
                    </span>
                  </div>
                  <button
                    onClick={() => setInventoryOpen(false)}
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

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.15fr', gap: 14 }}>
                  {/* Kolom 1: DNA Overrides */}
                  <div>
                    <div style={{ fontSize: 11, fontFamily: 'monospace', color: '#94a3b8', marginBottom: 8 }}>
                      DNA MUTATIES (ZERO-TO-HERO)
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {[
                        {
                          key: 'bruteForce' as const,
                          title: `Brute Force (Rank ${hud.upgrades.bruteForce})`,
                          desc: '+35 Max HP, +22 Slam DMG & +14px radius',
                          accent: '#f43f5e',
                          bg: 'rgba(136, 19, 55, 0.25)',
                        },
                        {
                          key: 'flexibleMass' as const,
                          title: `Flexible Mass (Rank ${hud.upgrades.flexibleMass})`,
                          desc: 'Sneller lopen & schieten, kortere Spatie-Dodge',
                          accent: '#10b981',
                          bg: 'rgba(6, 78, 59, 0.25)',
                        },
                        {
                          key: 'isotopeCore' as const,
                          title: `Isotope Core (Rank ${hud.upgrades.isotopeCore})`,
                          desc: '+9 Bio-Shot DMG & sterkere [E] Meltdown aura',
                          accent: '#0ea5e9',
                          bg: 'rgba(12, 74, 110, 0.25)',
                        },
                      ].map((u) => (
                        <div
                          key={u.key}
                          style={{
                            border: `1px solid ${u.accent}66`,
                            backgroundColor: u.bg,
                            borderRadius: 8,
                            padding: 9,
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <strong style={{ fontSize: 12 }}>{u.title}</strong>
                            <button
                              onClick={() => handleSplice(u.key)}
                              disabled={hud.dnaPoints <= 0}
                              style={{
                                backgroundColor: u.accent,
                                color: '#fff',
                                border: 'none',
                                borderRadius: 5,
                                padding: '3px 8px',
                                fontSize: 11,
                                fontWeight: 700,
                                cursor: hud.dnaPoints > 0 ? 'pointer' : 'not-allowed',
                                opacity: hud.dnaPoints > 0 ? 1 : 0.35,
                              }}
                            >
                              + Splice
                            </button>
                          </div>
                          <div style={{ fontSize: 11, color: '#cbd5e1', marginTop: 4 }}>{u.desc}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Kolom 2: Equipped Gear */}
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
                              padding: 9,
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
                                <div style={{ fontSize: 12, fontWeight: 700, color: style!.text }}>{item.name}</div>
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

                  {/* Kolom 3: Rugzak (Schaarse Loot) */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#94a3b8' }}>
                        RUGZAK (SCHAARSE LOOT)
                      </span>
                      <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#94a3b8' }}>
                        {hud.inventory.length} / 12
                      </span>
                    </div>

                    {hud.inventory.length === 0 ? (
                      <div
                        style={{
                          border: '1px dashed #334155',
                          borderRadius: 8,
                          padding: 24,
                          textAlign: 'center',
                          fontSize: 12,
                          color: '#64748b',
                        }}
                      >
                        Rugzak is leeg. Versla vijanden of de Sector Warden voor zeldzame drops.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 7, maxHeight: 270, overflowY: 'auto' }}>
                        {hud.inventory.map((item: LootItem) => {
                          const style = rarityColors[item.rarity];
                          return (
                            <div
                              key={item.id}
                              style={{
                                border: `1px solid ${style.border}`,
                                backgroundColor: style.bg,
                                borderRadius: 8,
                                padding: '7px 9px',
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

        {/* Onderste Statusbalk met XP-balk & Nieuwe Controls */}
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
          {/* Prominente XP & Level Balk */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700, marginBottom: 3 }}>
              <span style={{ color: '#c084fc' }}>
                LEVEL {hud.level} &bull; ZERO-TO-HERO PROGRESSIE
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
                  background: 'linear-gradient(90deg, #9333ea, #c084fc)',
                  transition: 'width 0.2s ease',
                }}
              />
            </div>
          </div>

          {/* HP/Energy | Ability Bar | Heat */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '220px 1fr 180px',
              gap: 14,
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

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 7 }}>
              {[
                { key: '[LMB]', name: 'Bio-Shot', sub: '+8 Energy', color: '#38bdf8', active: false },
                {
                  key: '[RMB]',
                  name: 'Stretch-Slam',
                  sub: hud.cooldowns.slam > 0 ? `${hud.cooldowns.slam}s` : '25 Energy',
                  color: '#fb7185',
                  active: false,
                },
                {
                  key: '[SPATIE]',
                  name: 'Phase Dodge',
                  sub: hud.cooldowns.dash > 0 ? `${hud.cooldowns.dash}s` : '20 Energy',
                  color: '#2dd4bf',
                  active: false,
                },
                {
                  key: '[E]',
                  name: 'Meltdown Ult',
                  sub: hud.meltdownActive ? 'ACTIEF!' : '80% Heat',
                  color: '#fb923c',
                  active: hud.heat >= 80 || hud.meltdownActive,
                },
                {
                  key: '[I]',
                  name: 'Inventory',
                  sub: hud.dnaPoints > 0 ? `${hud.dnaPoints} DNA!` : `${hud.inventory.length}/12`,
                  color: '#c084fc',
                  active: hud.dnaPoints > 0,
                },
              ].map((s) => (
                <div
                  key={s.key}
                  onClick={s.key === '[I]' ? () => setInventoryOpen((p) => !p) : undefined}
                  style={{
                    border: `1px solid ${s.active ? '#c084fc' : '#1e293b'}`,
                    backgroundColor: s.active ? 'rgba(126, 34, 206, 0.28)' : '#090d16',
                    borderRadius: 8,
                    padding: '5px 6px',
                    textAlign: 'center',
                    cursor: s.key === '[I]' ? 'pointer' : 'default',
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