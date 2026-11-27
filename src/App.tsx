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

const rarityStyles: Record<ItemRarity, { border: string; badge: string; text: string }> = {
  COMMON: {
    border: 'border-emerald-500/40 bg-emerald-950/20',
    badge: 'bg-emerald-500/20 text-emerald-300',
    text: 'text-emerald-300',
  },
  RARE: {
    border: 'border-sky-500/50 bg-sky-950/25',
    badge: 'bg-sky-500/20 text-sky-300',
    text: 'text-sky-300',
  },
  EXOTIC: {
    border: 'border-amber-500/60 bg-amber-950/25',
    badge: 'bg-amber-500/20 text-amber-300',
    text: 'text-amber-300',
  },
};

const slotLabels: Record<ItemSlot, string> = {
  WEAPON: 'Bio-Emitter',
  ARMOR: 'Carapace',
  INJECTOR: 'Splicer Injector',
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

  const handleSplice = (stat: keyof SomaticUpgrades) => {
    sceneRef.current?.applyUpgrade(stat);
  };

  const handleEquip = (itemId: string) => {
    sceneRef.current?.equipItem(itemId);
  };

  const handleSalvage = (itemId: string) => {
    sceneRef.current?.salvageItem(itemId);
  };

  const hpPct = Math.max(0, Math.min(100, (hud.hp / Math.max(1, hud.maxHp)) * 100));
  const energyPct = Math.max(0, Math.min(100, (hud.energy / Math.max(1, hud.maxEnergy)) * 100));
  const xpPct = Math.max(0, Math.min(100, (hud.xp / Math.max(1, hud.xpToNext)) * 100));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-3 select-none">
      <div className="w-full max-w-[1320px] flex flex-col gap-3">
        <header className="text-center">
          <p className="text-xs font-mono tracking-[0.25em] text-sky-400 uppercase">
            LINEAR SECTOR RUN &bull; DEPTH #{hud.packNumber} ({hud.enemiesRemaining} HOSTILES)
          </p>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Spliced: Meltdown</h1>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-3 items-start">
          <div
            ref={containerRef}
            className="w-full aspect-[960/680] rounded-xl overflow-hidden border border-slate-800 bg-[#0b101b] shadow-2xl"
          />

          <aside className="flex flex-col gap-3">
            <section className="rounded-xl border border-slate-800 bg-slate-900/90 p-3.5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-bold text-base">Rank Level {hud.level}</span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-600/30 text-purple-300 border border-purple-500/40">
                  {hud.dnaPoints} DNA Punt(en)
                </span>
              </div>
              <div className="text-xs text-slate-400 mb-1.5">
                XP: {hud.xp} / {hud.xpToNext}
              </div>
              <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden mb-3">
                <div className="h-full bg-purple-500 transition-all" style={{ width: `${xpPct}%` }} />
              </div>

              <p className="text-[11px] font-mono tracking-wider text-slate-400 uppercase mb-2">
                Somatic DNA Overrides
              </p>
              <div className="flex flex-col gap-2">
                <div className="rounded-lg border border-rose-500/30 bg-rose-950/20 p-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-rose-200">
                      Brute Force (Rank {hud.upgrades.bruteForce})
                    </span>
                    <button
                      onClick={() => handleSplice('bruteForce')}
                      disabled={hud.dnaPoints <= 0}
                      className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-600 hover:bg-rose-500 disabled:opacity-40 cursor-pointer"
                    >
                      + Splice
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">+35 Max HP, +22 Slam DMG &amp; +14px radius</p>
                </div>

                <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/20 p-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-200">
                      Flexible Mass (Rank {hud.upgrades.flexibleMass})
                    </span>
                    <button
                      onClick={() => handleSplice('flexibleMass')}
                      disabled={hud.dnaPoints <= 0}
                      className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 cursor-pointer"
                    >
                      + Splice
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">Sneller lopen &amp; schieten, kortere Q-Dash</p>
                </div>

                <div className="rounded-lg border border-sky-500/30 bg-sky-950/20 p-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-sky-200">
                      Isotope Core (Rank {hud.upgrades.isotopeCore})
                    </span>
                    <button
                      onClick={() => handleSplice('isotopeCore')}
                      disabled={hud.dnaPoints <= 0}
                      className="px-2 py-0.5 rounded text-[11px] font-bold bg-sky-600 hover:bg-sky-500 disabled:opacity-40 cursor-pointer"
                    >
                      + Splice
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">+9 Bio-Shot DMG &amp; sterkere Meltdown aura</p>
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-slate-800 bg-slate-900/90 p-3.5">
              <p className="text-[11px] font-mono tracking-wider text-slate-400 uppercase mb-2">
                Somatic Gear (Equipped)
              </p>
              <div className="flex flex-col gap-1.5">
                {(['WEAPON', 'ARMOR', 'INJECTOR'] as ItemSlot[]).map((slot) => {
                  const item = hud.equipped[slot];
                  return (
                    <div
                      key={slot}
                      className={`rounded-lg border px-2.5 py-2 text-xs ${
                        item ? rarityStyles[item.rarity].border : 'border-slate-800 bg-slate-950/60'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono uppercase text-slate-400">{slotLabels[slot]}</span>
                        {item && (
                          <span className={`text-[10px] px-1.5 rounded font-bold ${rarityStyles[item.rarity].badge}`}>
                            {item.rarity}
                          </span>
                        )}
                      </div>
                      {item ? (
                        <div className="mt-0.5">
                          <div className={`font-semibold ${rarityStyles[item.rarity].text}`}>{item.name}</div>
                          <div className="text-[11px] text-slate-300">{item.description}</div>
                        </div>
                      ) : (
                        <div className="text-slate-600 italic text-[11px]">&mdash; leeg &mdash;</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="rounded-xl border border-slate-800 bg-slate-900/90 p-3.5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] font-mono tracking-wider text-slate-400 uppercase">Rugzak</p>
                <span className="text-xs font-mono text-slate-400">{hud.inventory.length} / 12</span>
              </div>

              {hud.inventory.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-3">
                  Geen loot &mdash; loop over orbs om op te pakken
                </p>
              ) : (
                <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto pr-1">
                  {hud.inventory.map((item: LootItem) => (
                    <div
                      key={item.id}
                      className={`rounded-lg border p-2 text-xs flex items-center justify-between gap-2 ${
                        rarityStyles[item.rarity].border
                      }`}
                    >
                      <div className="min-w-0">
                        <div className={`font-semibold truncate ${rarityStyles[item.rarity].text}`}>
                          {item.name}
                        </div>
                        <div className="text-[10px] text-slate-300 truncate">{item.description}</div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleEquip(item.id)}
                          className="px-2 py-1 rounded bg-sky-600 hover:bg-sky-500 text-[10px] font-bold text-white cursor-pointer"
                        >
                          Equip
                        </button>
                        <button
                          onClick={() => handleSalvage(item.id)}
                          title="Salvage voor XP"
                          className="px-1.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 cursor-pointer"
                        >
                          XP
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </aside>
        </div>

        <footer className="rounded-xl border border-slate-800 bg-slate-900/90 p-3 grid grid-cols-1 md:grid-cols-[240px_1fr_200px] gap-4 items-center">
          <div className="flex flex-col gap-2">
            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="text-emerald-400">VITALITY (HP)</span>
                <span>
                  {hud.hp} / {hud.maxHp}
                </span>
              </div>
              <div className="h-2.5 rounded-full bg-slate-800 overflow-hidden">
                <div className="h-full bg-emerald-500 transition-all" style={{ width: `${hpPct}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="text-sky-400">BIO-ENERGY</span>
                <span>
                  {hud.energy} / {hud.maxEnergy}
                </span>
              </div>
              <div className="h-2.5 rounded-full bg-slate-800 overflow-hidden">
                <div className="h-full bg-sky-500 transition-all" style={{ width: `${energyPct}%` }} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2">
            <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-2 text-center">
              <div className="text-[10px] font-mono text-sky-400">[LMB]</div>
              <div className="text-xs font-bold">Bio-Shot</div>
              <div className="text-[10px] text-slate-400">+8 Energy</div>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-2 text-center">
              <div className="text-[10px] font-mono text-rose-400">[RMB]</div>
              <div className="text-xs font-bold">Stretch-Slam</div>
              <div className="text-[10px] text-slate-400">
                {hud.cooldowns.slam > 0 ? `${hud.cooldowns.slam}s` : '25 Energy'}
              </div>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-2 text-center">
              <div className="text-[10px] font-mono text-teal-400">[Q]</div>
              <div className="text-xs font-bold">Phase Dash</div>
              <div className="text-[10px] text-slate-400">
                {hud.cooldowns.dash > 0 ? `${hud.cooldowns.dash}s` : '20 Energy'}
              </div>
            </div>
            <div
              className={`rounded-lg border p-2 text-center ${
                hud.heat >= 80 || hud.meltdownActive
                  ? 'border-orange-500 bg-orange-950/40'
                  : 'border-slate-800 bg-slate-950/70'
              }`}
            >
              <div className="text-[10px] font-mono text-orange-400">[SPACE]</div>
              <div className="text-xs font-bold">Meltdown</div>
              <div className="text-[10px] text-slate-400">{hud.meltdownActive ? 'ACTIEF!' : '80% Heat'}</div>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-bold mb-1">
              <span className="text-orange-400">HEAT</span>
              <span>{hud.heat}%</span>
            </div>
            <div className="h-2.5 rounded-full bg-slate-800 overflow-hidden">
              <div
                className={`h-full transition-all ${
                  hud.meltdownActive ? 'bg-orange-400 animate-pulse' : 'bg-orange-500'
                }`}
                style={{ width: `${hud.heat}%` }}
              />
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
