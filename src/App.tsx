import { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import {
  ArenaScene,
  type HudSnapshot,
  type SomaticUpgrades,
  type LootItem,
  type ItemSlot,
} from './core/ArenaScene';

// â”€â”€â”€ Initial HUD state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const initialHud: HudSnapshot = {
  hp: 150, maxHp: 150,
  energy: 100, maxEnergy: 100,
  heat: 20, meltdownActive: false,
  xp: 0, xpToNext: 100,
  level: 1, dnaPoints: 1,
  packNumber: 1, enemiesRemaining: 0,
  cooldowns: { slam: 0, dash: 0 },
  upgrades: { bruteForce: 0, flexibleMass: 0, isotopeCore: 0 },
  inventory: [],
  equipped: {},
};

// â”€â”€â”€ App â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef     = useRef<ArenaScene | null>(null);
  // Keep a ref to the Phaser.Game instance so React StrictMode's double-invoke
  // doesn't create two games (the cleanup destroys the first, guard blocks a third).
  const gameRef = useRef<Phaser.Game | null>(null);
  const [hud, setHud] = useState<HudSnapshot>(initialHud);

  useEffect(() => {
    if (!containerRef.current) return;
    // Strict-mode guard: if a game already exists for this mount, skip
    if (gameRef.current) return;

    const arenaScene = new ArenaScene();
    arenaScene.setHudCallback((snapshot) => setHud(snapshot));
    sceneRef.current = arenaScene;

    gameRef.current = new Phaser.Game({
      type: Phaser.AUTO,
      width: 960,
      height: 680,
      backgroundColor: '#0b101b',   // set at renderer level, not just camera
      parent: containerRef.current,
      pixelArt: true,
      physics: { default: 'arcade', arcade: { debug: false } },
      scene: [arenaScene],
    });

    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
      sceneRef.current = null;
    };
  }, []);

  const handleSplice  = (stat: keyof SomaticUpgrades) => sceneRef.current?.applyUpgrade(stat);
  const handleEquip   = (id: number) => sceneRef.current?.equipItem(id);
  const handleSalvage = (id: number) => sceneRef.current?.salvageItem(id);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#090d16', color: '#f8fafc', fontFamily: 'system-ui, sans-serif', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '14px' }}>
        <div style={{ fontSize: '12px', letterSpacing: '2px', color: '#38bdf8', fontWeight: 700 }}>
          ARPG COMBAT LOOP â€¢ WAVE #{hud.packNumber} ({hud.enemiesRemaining} ENEMIES)
        </div>
        <h1 style={{ margin: '4px 0', fontSize: '28px', fontWeight: 800 }}>Spliced: Meltdown</h1>
      </div>

      {/* Main layout */}
      <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', flexWrap: 'wrap', justifyContent: 'center' }}>

        {/* Left column: canvas + skill bar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div ref={containerRef} style={{ border: '2px solid #1e293b', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.6)' }} />

          {/* Skill bar */}
          <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>

            {/* HP & Energy bars */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '220px' }}>
              <ResourceBar label="VITALITY (HP)" value={hud.hp} max={hud.maxHp} color="#22c55e" textColor="#4ade80" />
              <ResourceBar label="BIO-ENERGY"    value={hud.energy} max={hud.maxEnergy} color="#0ea5e9" textColor="#38bdf8" />
            </div>

            {/* Skill slots */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <SkillSlot hotkey="LMB"   name="Bio-Shot"      cost="+8 Energy" ready />
              <SkillSlot hotkey="RMB"   name="Stretch-Slam"  cost="25 Energy"
                ready={hud.cooldowns.slam === 0 && hud.energy >= 25} cooldownSec={hud.cooldowns.slam} />
              <SkillSlot hotkey="Q"     name="Phase Dash"    cost="20 Energy"
                ready={hud.cooldowns.dash === 0 && hud.energy >= 20} cooldownSec={hud.cooldowns.dash} />
              <SkillSlot hotkey="SPACE" name="Meltdown"      cost={`${hud.heat}% Heat`}
                ready={hud.heat >= 80 || hud.meltdownActive} highlight={hud.heat >= 80 || hud.meltdownActive} />
            </div>

            {/* Heat bar */}
            <div style={{ width: '100px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 700, marginBottom: '3px' }}>
                <span style={{ color: '#f97316' }}>HEAT</span>
                <span>{hud.heat}%</span>
              </div>
              <div style={{ height: '8px', backgroundColor: '#1e293b', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${hud.heat}%`, height: '100%',
                  backgroundColor: hud.heat >= 80 ? '#ef4444' : hud.meltdownActive ? '#f97316' : '#78716c',
                  transition: 'width 0.1s' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Right column: DNA + Gear panels */}
        <div style={{ width: '310px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

          {/* XP & DNA */}
          <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '17px', fontWeight: 800 }}>Rank Level {hud.level}</span>
              {hud.dnaPoints > 0 && (
                <span style={{ backgroundColor: '#7e22ce', color: '#f3e8ff', fontSize: '12px', fontWeight: 700, padding: '3px 8px', borderRadius: '999px' }}>
                  {hud.dnaPoints} DNA Punt(en)
                </span>
              )}
            </div>
            <div style={{ fontSize: '12px', color: '#94a3b8', margin: '4px 0 6px' }}>
              XP: {hud.xp} / {hud.xpToNext}
            </div>
            <div style={{ height: '8px', backgroundColor: '#1e293b', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ width: `${(hud.xp / hud.xpToNext) * 100}%`, height: '100%', backgroundColor: '#a855f7' }} />
            </div>

            <hr style={{ borderColor: '#1e293b', margin: '12px 0 10px' }} />

            <div style={{ fontSize: '12px', fontWeight: 700, color: '#cbd5e1', letterSpacing: '0.5px', marginBottom: '8px' }}>
              SOMATIC DNA OVERRIDES
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <MutationNode title="Brute Force"    rank={hud.upgrades.bruteForce}    desc="+35 Max HP, +22 Slam DMG & +12px radius"
                canUpgrade={hud.dnaPoints > 0} onUpgrade={() => handleSplice('bruteForce')}    accent="#ef4444" />
              <MutationNode title="Flexible Mass"  rank={hud.upgrades.flexibleMass}  desc="Sneller lopen & schieten, kortere Q-Dash"
                canUpgrade={hud.dnaPoints > 0} onUpgrade={() => handleSplice('flexibleMass')}  accent="#10b981" />
              <MutationNode title="Isotope Core"   rank={hud.upgrades.isotopeCore}   desc="+9 Bio-Shot DMG & sterkere Meltdown aura"
                canUpgrade={hud.dnaPoints > 0} onUpgrade={() => handleSplice('isotopeCore')}   accent="#06b6d4" />
            </div>
          </div>

          {/* Gear Slots */}
          <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', padding: '16px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#cbd5e1', letterSpacing: '0.5px', marginBottom: '10px' }}>
              SOMATIC GEAR (EQUIPPED)
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {(['WEAPON', 'ARMOR', 'INJECTOR'] as ItemSlot[]).map(slot => (
                <GearSlot key={slot} slot={slot} item={hud.equipped[slot]} />
              ))}
            </div>
          </div>

          {/* Loot Inventory */}
          <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#cbd5e1', letterSpacing: '0.5px' }}>
                RUGZAK
              </span>
              <span style={{ fontSize: '11px', color: '#64748b' }}>
                {hud.inventory.length} / 12
              </span>
            </div>
            {hud.inventory.length === 0 ? (
              <div style={{ fontSize: '12px', color: '#475569', textAlign: 'center', padding: '12px 0' }}>
                Geen loot â€” loop over orbs om op te pakken
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', maxHeight: '220px', overflowY: 'auto' }}>
                {hud.inventory.map(item => (
                  <InventoryRow key={item.id} item={item} onEquip={handleEquip} onSalvage={handleSalvage} />
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

// â”€â”€â”€ Sub-components â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function ResourceBar({ label, value, max, color, textColor }: {
  label: string; value: number; max: number; color: string; textColor: string;
}) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700, marginBottom: '3px' }}>
        <span style={{ color: textColor }}>{label}</span>
        <span>{value} / {max}</span>
      </div>
      <div style={{ height: '10px', backgroundColor: '#1e293b', borderRadius: '4px', overflow: 'hidden' }}>
        <div style={{ width: `${(value / max) * 100}%`, height: '100%', backgroundColor: color, transition: 'width 0.1s' }} />
      </div>
    </div>
  );
}

function SkillSlot({ hotkey, name, cost, ready, cooldownSec = 0, highlight = false }: {
  hotkey: string; name: string; cost: string; ready: boolean; cooldownSec?: number; highlight?: boolean;
}) {
  return (
    <div style={{
      width: '88px', padding: '8px', borderRadius: '6px', textAlign: 'center',
      backgroundColor: highlight ? '#164e63' : ready ? '#1e293b' : '#090d16',
      border: `1px solid ${highlight ? '#22d3ee' : ready ? '#334155' : '#1e293b'}`,
      opacity: ready ? 1 : 0.55,
    }}>
      <div style={{ fontSize: '11px', fontWeight: 800, color: '#38bdf8' }}>[{hotkey}]</div>
      <div style={{ fontSize: '12px', fontWeight: 700, margin: '2px 0' }}>{name}</div>
      <div style={{ fontSize: '10px', color: '#94a3b8' }}>{cooldownSec > 0 ? `${cooldownSec.toFixed(1)}s` : cost}</div>
    </div>
  );
}

function MutationNode({ title, rank, desc, canUpgrade, onUpgrade, accent }: {
  title: string; rank: number; desc: string; canUpgrade: boolean; onUpgrade: () => void; accent: string;
}) {
  return (
    <div style={{ backgroundColor: '#1e293b', padding: '8px 12px', borderRadius: '6px', borderLeft: `4px solid ${accent}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 700, fontSize: '13px' }}>{title} (Rank {rank})</span>
        <button onClick={onUpgrade} disabled={!canUpgrade} style={{
          backgroundColor: canUpgrade ? accent : '#334155', color: '#fff',
          border: 'none', borderRadius: '4px', padding: '3px 8px',
          fontSize: '11px', fontWeight: 700, cursor: canUpgrade ? 'pointer' : 'not-allowed',
        }}>
          + Splice
        </button>
      </div>
      <div style={{ fontSize: '11px', color: '#cbd5e1', marginTop: '3px' }}>{desc}</div>
    </div>
  );
}

const SLOT_ICON: Record<ItemSlot, string> = { WEAPON: 'âš”', ARMOR: 'ðŸ›¡', INJECTOR: 'ðŸ’‰' };
const RARITY_CSS: Record<string, string> = { COMMON: '#94a3b8', RARE: '#60a5fa', EXOTIC: '#f59e0b' };

function GearSlot({ slot, item }: { slot: ItemSlot; item?: LootItem }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#1e293b', borderRadius: '6px', padding: '7px 10px', border: '1px solid #334155' }}>
      <span style={{ fontSize: '16px', width: '20px', textAlign: 'center' }}>{SLOT_ICON[slot]}</span>
      {item ? (
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: RARITY_CSS[item.rarity], whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {item.name}
          </div>
          <div style={{ fontSize: '10px', color: '#64748b' }}>
            {Object.entries(item.stats).map(([k, v]) => `${k}: +${v}`).join(' | ')}
          </div>
        </div>
      ) : (
        <span style={{ fontSize: '11px', color: '#475569' }}>â€” leeg â€”</span>
      )}
    </div>
  );
}

function InventoryRow({ item, onEquip, onSalvage }: {
  item: LootItem; onEquip: (id: number) => void; onSalvage: (id: number) => void;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#1e293b', borderRadius: '6px', padding: '5px 8px', border: `1px solid ${RARITY_CSS[item.rarity]}44` }}>
      <span style={{ fontSize: '14px', width: '18px', textAlign: 'center', flexShrink: 0 }}>{SLOT_ICON[item.slot]}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '11px', fontWeight: 700, color: RARITY_CSS[item.rarity], whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {item.name}
        </div>
        <div style={{ fontSize: '10px', color: '#64748b' }}>
          {item.rarity} Â· {Object.entries(item.stats).map(([k, v]) => `${k}:+${v}`).join(' ')}
        </div>
      </div>
      <button onClick={() => onEquip(item.id)} style={btnStyle('#0f4c81', '#3b82f6')}>Equip</button>
      <button onClick={() => onSalvage(item.id)} style={btnStyle('#4a1d4b', '#a855f7')}>Salvage</button>
    </div>
  );
}

function btnStyle(bg: string, border: string): React.CSSProperties {
  return {
    backgroundColor: bg, color: '#f8fafc', border: `1px solid ${border}`,
    borderRadius: '4px', padding: '2px 6px', fontSize: '10px', fontWeight: 700,
    cursor: 'pointer', flexShrink: 0,
  };
}

export default App;
