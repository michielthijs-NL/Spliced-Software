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
  hp: 150,
  maxHp: 150,
  energy: 100,
  maxEnergy: 100,
  heat: 20,
  meltdownActive: false,
  xp: 0,
  xpToNext: 100,
  level: 1,
  dnaPoints: 1,
  packNumber: 1,
  enemiesRemaining: 20,
  cooldowns: { slam: 0, dash: 0 },
  upgrades: { bruteForce: 0, flexibleMass: 0, isotopeCore: 0 },
  equipped: { WEAPON: null, ARMOR: null, INJECTOR: null },
  inventory: [],
};

const rarityColors: Record<ItemRarity, { border: string; bg: string; text: string }> = {
  COMMON: { border: '#10b981', bg: 'rgba(6, 78, 59, 0.25)', text: '#6ee7b7' },
  RARE: { border: '#38bdf8', bg: 'rgba(12, 74, 110, 0.28)', text: '#7dd3fc' },
  EXOTIC: { border: '#f59e0b', bg: 'rgba(120, 53, 15, 0.30)', text: '#fcd34d' },
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

  useEffect(() => {
    if (!containerRef.current) return;

    const arenaScene = new ArenaScene();
    arenaScene.setHudCallback((snapshot) => setHud(snapshot));
    sceneRef.current = arenaScene;

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: containerRef.current,
      width: 960,
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
        padding: '12px 16px',
        boxSizing: 'border-box',
        userSelect: 'none',
      }}
    >
      <div style={{ maxWidth: 1340, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <header style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 11, fontFamily: 'monospace', letterSpacing: 2.5, color: '#38bdf8' }}>
            LINEAR SECTOR RUN &bull; DEPTH #{hud.packNumber} ({hud.enemiesRemaining} HOSTILES)
          </div>
          <h1 style={{ margin: '2px 0 0', fontSize: 24, fontWeight: 800, color: '#ffffff' }}>
            Spliced: Meltdown
          </h1>
        </header>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) 330px',
            gap: 12,
            alignItems: 'start',
          }}
        >
          <div
            ref={containerRef}
            style={{
              width: '100%',
              aspectRatio: '960 / 680',
              borderRadius: 12,
              overflow: 'hidden',
              border: '1px solid #1e293b',
              backgroundColor: '#0b101b',
              boxShadow: '0 18px 40px rgba(0,0,0,0.6)',
            }}
          />

          <aside style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <section
              style={{
                backgroundColor: '#0f172a',
                border: '1px solid #1e293b',
                borderRadius: 12,
                padding: 12,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <strong style={{ fontSize: 15 }}>Rank Level {hud.level}</strong>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 999,
                    backgroundColor: 'rgba(147, 51, 234, 0.25)',
                    border: '1px solid rgba(168, 85, 247, 0.45)',
                    color: '#d8b4fe',
                  }}
                >
                  {hud.dnaPoints} DNA Punt(en)
                </span>
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>
                XP: {hud.xp} / {hud.xpToNext}
              </div>
              <div style={{ height: 6, backgroundColor: '#1e293b', borderRadius: 999, overflow: 'hidden', marginBottom: 10 }}>
                <div style={{ height: '100%', width: `${xpPct}%`, backgroundColor: '#a855f7' }} />
              </div>

              <div style={{ fontSize: 10, fontFamily: 'monospace', color: '#94a3b8', letterSpacing: 1, marginBottom: 6 }}>
                SOMATIC DNA OVERRIDES
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[
                  {
                    key: 'bruteForce' as const,
                    title: `Brute Force (Rank ${hud.upgrades.bruteForce})`,
                    desc: '+35 Max HP, +22 Slam DMG & +14px radius',
                    accent: '#f43f5e',
                    bg: 'rgba(136, 19, 55, 0.22)',
                  },
                  {
                    key: 'flexibleMass' as const,
                    title: `Flexible Mass (Rank ${hud.upgrades.flexibleMass})`,
                    desc: 'Sneller lopen & schieten, kortere Q-Dash',
                    accent: '#10b981',
                    bg: 'rgba(6, 78, 59, 0.22)',
                  },
                  {
                    key: 'isotopeCore' as const,
                    title: `Isotope Core (Rank ${hud.upgrades.isotopeCore})`,
                    desc: '+9 Bio-Shot DMG & sterkere Meltdown aura',
                    accent: '#0ea5e9',
                    bg: 'rgba(12, 74, 110, 0.22)',
                  },
                ].map((u) => (
                  <div
                    key={u.key}
                    style={{
                      border: `1px solid ${u.accent}55`,
                      backgroundColor: u.bg,
                      borderRadius: 8,
                      padding: '7px 9px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, fontWeight: 700 }}>{u.title}</span>
                      <button
                        onClick={() => handleSplice(u.key)}
                        disabled={hud.dnaPoints <= 0}
                        style={{
                          backgroundColor: u.accent,
                          color: '#fff',
                          border: 'none',
                          borderRadius: 5,
                          padding: '2px 8px',
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: hud.dnaPoints > 0 ? 'pointer' : 'not-allowed',
                          opacity: hud.dnaPoints > 0 ? 1 : 0.4,
                        }}
                      >
                        + Splice
                      </button>
                    </div>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{u.desc}</div>
                  </div>
                ))}
              </div>
            </section>

            <section
              style={{
                backgroundColor: '#0f172a',
                border: '1px solid #1e293b',
                borderRadius: 12,
                padding: 12,
              }}
            >
              <div style={{ fontSize: 10, fontFamily: 'monospace', color: '#94a3b8', letterSpacing: 1, marginBottom: 6 }}>
                SOMATIC GEAR (EQUIPPED)
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
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
                        padding: '6px 9px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#94a3b8' }}>
                          {slotMeta[slot].icon} {slotMeta[slot].label}
                        </span>
                        {item && (
                          <span style={{ fontSize: 9, fontWeight: 700, color: style!.text }}>{item.rarity}</span>
                        )}
                      </div>
                      {item ? (
                        <div style={{ marginTop: 2 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: style!.text }}>{item.name}</div>
                          <div style={{ fontSize: 10, color: '#cbd5e1' }}>{item.description}</div>
                        </div>
                      ) : (
                        <div style={{ fontSize: 11, color: '#475569', fontStyle: 'italic' }}>&mdash; leeg &mdash;</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            <section
              style={{
                backgroundColor: '#0f172a',
                border: '1px solid #1e293b',
                borderRadius: 12,
                padding: 12,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#94a3b8', letterSpacing: 1 }}>
                  RUGZAK
                </span>
                <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#94a3b8' }}>
                  {hud.inventory.length} / 12
                </span>
              </div>

              {hud.inventory.length === 0 ? (
                <div style={{ fontSize: 11, color: '#64748b', textAlign: 'center', padding: '8px 0' }}>
                  Geen loot &mdash; loop over orbs om op te pakken
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 165, overflowY: 'auto' }}>
                  {hud.inventory.map((item: LootItem) => {
                    const style = rarityColors[item.rarity];
                    return (
                      <div
                        key={item.id}
                        style={{
                          border: `1px solid ${style.border}`,
                          backgroundColor: style.bg,
                          borderRadius: 8,
                          padding: '6px 8px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: style.text }}>{item.name}</div>
                          <div style={{ fontSize: 10, color: '#cbd5e1' }}>{item.description}</div>
                        </div>
                        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                          <button
                            onClick={() => handleEquip(item.id)}
                            style={{
                              backgroundColor: '#0284c7',
                              color: '#fff',
                              border: 'none',
                              borderRadius: 4,
                              padding: '3px 7px',
                              fontSize: 10,
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
                              borderRadius: 4,
                              padding: '3px 6px',
                              fontSize: 10,
                              cursor: 'pointer',
                            }}
                          >
                            XP
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </aside>
        </div>

        <footer
          style={{
            backgroundColor: '#0f172a',
            border: '1px solid #1e293b',
            borderRadius: 12,
            padding: '10px 14px',
            display: 'grid',
            gridTemplateColumns: '230px 1fr 200px',
            gap: 16,
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700, marginBottom: 2 }}>
                <span style={{ color: '#34d399' }}>VITALITY (HP)</span>
                <span>{hud.hp} / {hud.maxHp}</span>
              </div>
              <div style={{ height: 8, backgroundColor: '#1e293b', borderRadius: 999, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${hpPct}%`, backgroundColor: '#10b981' }} />
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700, marginBottom: 2 }}>
                <span style={{ color: '#38bdf8' }}>BIO-ENERGY</span>
                <span>{hud.energy} / {hud.maxEnergy}</span>
              </div>
              <div style={{ height: 8, backgroundColor: '#1e293b', borderRadius: 999, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${energyPct}%`, backgroundColor: '#0ea5e9' }} />
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
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
                key: '[Q]',
                name: 'Phase Dash',
                sub: hud.cooldowns.dash > 0 ? `${hud.cooldowns.dash}s` : '20 Energy',
                color: '#2dd4bf',
                active: false,
              },
              {
                key: '[SPACE]',
                name: 'Meltdown',
                sub: hud.meltdownActive ? 'ACTIEF!' : '80% Heat',
                color: '#fb923c',
                active: hud.heat >= 80 || hud.meltdownActive,
              },
            ].map((s) => (
              <div
                key={s.key}
                style={{
                  border: `1px solid ${s.active ? '#f97316' : '#1e293b'}`,
                  backgroundColor: s.active ? 'rgba(154, 52, 18, 0.35)' : '#090d16',
                  borderRadius: 8,
                  padding: '6px 8px',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: 10, fontFamily: 'monospace', color: s.color }}>{s.key}</div>
                <div style={{ fontSize: 12, fontWeight: 700 }}>{s.name}</div>
                <div style={{ fontSize: 10, color: '#94a3b8' }}>{s.sub}</div>
              </div>
            ))}
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700, marginBottom: 3 }}>
              <span style={{ color: '#fb923c' }}>HEAT</span>
              <span>{hud.heat}%</span>
            </div>
            <div style={{ height: 8, backgroundColor: '#1e293b', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${hud.heat}%`, backgroundColor: '#f97316' }} />
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
