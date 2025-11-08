import React, { useMemo, useState, useEffect, useRef } from "react";
import './index.css'

const FontLoader = () => (
  <>
    <link
      href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap"
      rel="stylesheet"
    />
    <style>{` :root { --retro: 'Press Start 2P', system-ui, -apple-system, Segoe UI, Roboto, sans-serif; } `}</style>
  </>
);

const TYPES = [
  "normal", "fire", "water", "grass", "electric", "ice", "fighting", "poison", "ground", "flying", "psychic", "bug", "rock", "ghost", "dragon", "dark", "steel", "fairy"
] as const;

const FR_LABEL: Record<(typeof TYPES)[number], string> = {
  normal: "Normal", fire: "Feu", water: "Eau", grass: "Plante", electric: "Électrik", ice: "Glace", fighting: "Combat", poison: "Poison", ground: "Sol", flying: "Vol", psychic: "Psy", bug: "Insecte", rock: "Roche", ghost: "Spectre", dragon: "Dragon", dark: "Ténèbres", steel: "Acier", fairy: "Fée"
};

const TYPE_COLOR: Record<(typeof TYPES)[number], string> = {
  normal: "#A8A77A", fire: "#EE8130", water: "#6390F0", grass: "#7AC74C", electric: "#F7D02C", ice: "#96D9D6", fighting: "#C22E28", poison: "#A33EA1", ground: "#E2BF65", flying: "#A98FF3", psychic: "#F95587", bug: "#A6B91A", rock: "#B6A136", ghost: "#735797", dragon: "#6F35FC", dark: "#705746", steel: "#B7B7CE", fairy: "#D685AD"
};

const EFF: Record<(typeof TYPES)[number], Partial<Record<(typeof TYPES)[number], number>>> = {
  normal: { rock: 0.5, ghost: 0, steel: 0.5 }, fire: { fire: 0.5, water: 0.5, grass: 2, ice: 2, bug: 2, rock: 0.5, dragon: 0.5, steel: 2 }, water: { fire: 2, water: 0.5, grass: 0.5, ground: 2, rock: 2, dragon: 0.5 }, grass: { fire: 0.5, water: 2, grass: 0.5, poison: 0.5, ground: 2, flying: 0.5, bug: 0.5, rock: 2, dragon: 0.5, steel: 0.5 }, electric: { water: 2, grass: 0.5, electric: 0.5, ground: 0, flying: 2, dragon: 0.5 }, ice: { fire: 0.5, water: 0.5, grass: 2, ice: 0.5, ground: 2, flying: 2, dragon: 2, steel: 0.5 }, fighting: { normal: 2, ice: 2, rock: 2, dark: 2, steel: 2, poison: 0.5, flying: 0.5, psychic: 0.5, bug: 0.5, fairy: 0.5, ghost: 0 }, poison: { grass: 2, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0, fairy: 2 }, ground: { fire: 2, electric: 2, poison: 2, rock: 2, steel: 2, grass: 0.5, bug: 0.5, flying: 0 }, flying: { grass: 2, fighting: 2, bug: 2, electric: 0.5, rock: 0.5, steel: 0.5 }, psychic: { fighting: 2, poison: 2, psychic: 0.5, steel: 0.5, dark: 0 }, bug: { grass: 2, psychic: 2, dark: 2, fire: 0.5, fighting: 0.5, poison: 0.5, flying: 0.5, ghost: 0.5, steel: 0.5, fairy: 0.5 }, rock: { fire: 2, ice: 2, flying: 2, bug: 2, fighting: 0.5, ground: 0.5, steel: 0.5 }, ghost: { psychic: 2, ghost: 2, normal: 0, dark: 0.5 }, dragon: { dragon: 2, steel: 0.5, fairy: 0 }, dark: { psychic: 2, ghost: 2, fighting: 0.5, dark: 0.5, fairy: 0.5 }, steel: { rock: 2, ice: 2, fairy: 2, fire: 0.5, water: 0.5, electric: 0.5, steel: 0.5 }, fairy: { fighting: 2, dragon: 2, dark: 2, fire: 0.5, poison: 0.5, steel: 0.5 }
};

function normalizeLocal(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

function allMultipliersForDef(defTypes: (typeof TYPES)[number][]) {
  const result: Record<(typeof TYPES)[number], number> = Object.fromEntries(TYPES.map((atk) => [atk, 1])) as Record<(typeof TYPES)[number], number>;
  for (const atk of TYPES) {
    let mult = 1;
    for (const def of defTypes) mult *= EFF[atk][def] ?? 1;
    result[atk] = mult;
  }
  return result;
}

function TypeIcon({ t }: { t: (typeof TYPES)[number] }) {
  const color = TYPE_COLOR[t];
  const letter = FR_LABEL[t].charAt(0);
  return <span aria-hidden className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-black" style={{ background: color + "20", borderColor: color, color }}>{letter}</span>;
}

function TypePill({ t }: { t: (typeof TYPES)[number] }) {
  const color = TYPE_COLOR[t];
  return <span className="inline-flex items-center rounded-lg border px-2.5 py-1 text-sm font-semibold bg-white/80 dark:bg-white/10 backdrop-blur" style={{ borderColor: color }}><TypeIcon t={t} /><span style={{ fontFamily: "var(--retro)" }}>{FR_LABEL[t]}</span></span>;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h4 className="text-sm sm:text-base font-bold mb-2" style={{ fontFamily: "var(--retro)" }}>{children}</h4>;
}

export default function App() {
  const [def1, setDef1] = useState<(typeof TYPES)[number] | "">("");
  const [def2, setDef2] = useState<(typeof TYPES)[number] | "">("");
  const [pokeQuery, setPokeQuery] = useState("");
  const [matchedTypes, setMatchedTypes] = useState<(typeof TYPES)[number][]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Index FR complet (Gen1→Gen9) via PokéAPI
  const [frIndex, setFrIndex] = useState<{ fr: string; en: string; id: number }[]>([]);
  const [indexReady, setIndexReady] = useState(false);
  const [indexLoading, setIndexLoading] = useState(false);

  // Affichage/fermeture du menu de suggestions
  const [showSuggestions, setShowSuggestions] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function ensureFrIndex() {
    if (indexReady || indexLoading) return;
    setIndexLoading(true);
    try {
      const res = await fetch("https://pokeapi.co/api/v2/pokemon-species?limit=20000&offset=0");
      const list = await res.json();
      const species: { name: string; url: string }[] = list.results || [];

      const batchSize = 40;
      const acc: { fr: string; en: string; id: number }[] = [];
      for (let i = 0; i < species.length; i += batchSize) {
        const slice = species.slice(i, i + batchSize);
        const details = await Promise.all(
          slice.map(async (s) => {
            try {
              const d = await fetch(s.url).then((r) => r.json());
              const id: number = d.id;
              const frName = (d.names as any[]).find((n) => n.language?.name === "fr")?.name as string | undefined;
              const defVar = (d.varieties as any[]).find((v) => v.is_default);
              const enDefault = defVar?.pokemon?.name as string | undefined;
              if (frName && enDefault && id) return { fr: frName, en: enDefault, id };
            } catch {}
            return null;
          })
        );
        for (const row of details) if (row) acc.push(row);
      }
      acc.sort((a, b) => normalizeLocal(a.fr).localeCompare(normalizeLocal(b.fr)));
      setFrIndex(acc);
      setIndexReady(true);
    } catch (e) {
      console.error(e);
    } finally {
      setIndexLoading(false);
    }
  }

  const frSuggestions = useMemo(() => {
    const q = normalizeLocal(pokeQuery);
    if (q.length < 3 || !frIndex.length) return [] as { fr: string; en: string; id: number }[];
    return frIndex.filter((p) => normalizeLocal(p.fr).includes(q)).slice(0, 50);
  }, [pokeQuery, frIndex]);

  async function fetchPokemonTypesFromEn(enNameOrId: string): Promise<((typeof TYPES)[number])[] | null> {
    try {
      const r = await fetch(`https://pokeapi.co/api/v2/pokemon/${enNameOrId}`);
      if (!r.ok) return null;
      const data = await r.json();
      return data.types.map((t: any) => t.type.name as (typeof TYPES)[number]);
    } catch {
      return null;
    }
  }

  async function applyPokemon(name: string) {
    setError(null);
    setShowSuggestions(false); // ← ferme le menu à la validation
    setLoading(true);
    try {
      let types: ((typeof TYPES)[number])[] | null = null;

      if (indexReady) {
        const row = frIndex.find((r) => normalizeLocal(r.fr) === normalizeLocal(name));
        if (row) types = await fetchPokemonTypesFromEn(row.en);
      }

      if (!types) types = await fetchPokemonTypesFromEn(name.toLowerCase());

      if (types && types.length) {
        setDef1(types[0] ?? "");
        setDef2(types[1] ?? "");
        setMatchedTypes(types);
      } else {
        setMatchedTypes([]);
        setError("Pokémon introuvable. Essaie le nom FR (avec suggestions), EN ou l'ID.");
      }
    } catch (e) {
      setError("Erreur réseau. Réessaie dans un instant.");
    } finally {
      setLoading(false);
    }
  }

  const defTypes = useMemo(() => {
    const arr: (typeof TYPES)[number][] = [];
    if (def1) arr.push(def1);
    if (def2 && def2 !== def1) arr.push(def2);
    return arr.length ? arr : ["normal"];
  }, [def1, def2]);

  const mults = useMemo(() => allMultipliersForDef(defTypes), [defTypes]);
  const groups = useMemo(() => {
    const x4: (typeof TYPES)[number][] = [], x2: (typeof TYPES)[number][] = [], x1: (typeof TYPES)[number][] = [], x05: (typeof TYPES)[number][] = [], x025: (typeof TYPES)[number][] = [], x0: (typeof TYPES)[number][] = [];
    for (const atk of TYPES) {
      const m = mults[atk];
      if (m === 0) x0.push(atk);
      else if (m >= 3.9) x4.push(atk);
      else if (m >= 1.9) x2.push(atk);
      else if (m <= 0.26) x025.push(atk);
      else if (m < 0.75) x05.push(atk);
      else x1.push(atk);
    }
    return { x4, x2, x1, x05, x025, x0 };
  }, [mults]);

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-pink-50 to-fuchsia-100 text-gray-900 dark:from-zinc-900 dark:to-zinc-950 dark:text-zinc-50">
      <FontLoader />
      <div className="w-full px-4 py-6 sm:px-6 lg:px-10">
        <h1 className="text-2xl sm:text-3xl font-extrabold mb-6" style={{ fontFamily: "var(--retro)" }}>PokéTypes</h1>

        {/* Entrée Pokémon (noms FR complets via PokéAPI) */}
        <div className="mb-6 rounded-2xl border bg-white/70 p-4 shadow-sm backdrop-blur dark:bg-white/10" ref={containerRef}>
          <label className="mb-2 block text-sm font-medium">Tape un Pokémon (FR/EN ou ID). Propositions après 3 lettres.</label>
          <div className="relative">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                value={pokeQuery}
                onChange={(e) => {
                  const v = e.target.value;
                  setPokeQuery(v);
                  if (v.length >= 3) { ensureFrIndex(); setShowSuggestions(true); }
                  else { setShowSuggestions(false); }
                }}
                onKeyDown={(e) => { if (e.key === 'Enter') { applyPokemon(pokeQuery); setShowSuggestions(false); } }}
                placeholder="ex: drac..., pika..., gard..."
                className="w-full rounded-xl border px-3 py-2 bg-white/90 dark:bg-zinc-800"
              />
              <button
                className="rounded-xl border px-3 py-2 font-semibold bg-white/80 hover:bg-white/95 dark:bg-white/10"
                onClick={() => applyPokemon(pokeQuery)}
                disabled={loading}
              >
                {loading ? "Recherche…" : "Remplir les types"}
              </button>
            </div>

            {/* Drop-down scrollable des suggestions FR (après 3 lettres) */}
            {showSuggestions && pokeQuery.length >= 3 && (
              <div className="absolute z-10 mt-2 max-h-64 w-full overflow-y-auto rounded-xl border bg-white shadow-lg dark:bg-zinc-900">
                {indexLoading && (
                  <div className="px-3 py-2 text-sm opacity-70">Chargement des noms FR…</div>
                )}
                {!indexLoading && frSuggestions.length === 0 && (
                  <div className="px-3 py-2 text-sm opacity-70">Aucune suggestion</div>
                )}
                {!indexLoading && frSuggestions.map((s) => (
                  <button
                    key={s.id}
                    className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    onClick={() => { setPokeQuery(s.fr); applyPokemon(s.fr); setShowSuggestions(false); }}
                  >
                    <span>{s.fr}</span>
                    <span className="text-xs opacity-60">#{s.id}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          {error && <div className="mt-2 text-sm text-rose-700">{error}</div>}
          {matchedTypes.length > 0 && (
            <div className="mt-3 flex items-center gap-2 text-sm">
              <span className="opacity-80">Types détectés :</span>
              {matchedTypes.map((t) => <TypePill key={"det-"+t} t={t} />)}
            </div>
          )}
          <div className="mt-2 text-xs opacity-70">Noms FR officiels via PokéAPI (espèces) + types via endpoint Pokémon.</div>
        </div>

        {/* Sélecteurs manuels */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mb-8">
          <select className="rounded-xl border px-3 py-2 bg-white/90 dark:bg-zinc-800" value={def1} onChange={e=>setDef1(e.target.value as any)}>
            <option value="">Type 1</option>
            {TYPES.map(t=><option key={t} value={t}>{FR_LABEL[t]}</option>)}
          </select>
          <select className="rounded-xl border px-3 py-2 bg-white/90 dark:bg-zinc-800" value={def2} onChange={e=>setDef2(e.target.value as any)}>
            <option value="">Type 2 (optionnel)</option>
            {TYPES.map(t=><option key={t} value={t}>{FR_LABEL[t]}</option>)}
          </select>
        </div>

        <div className="rounded-2xl border bg-white/70 p-5 shadow-sm backdrop-blur dark:bg-white/10">
          <div className="mb-5 flex flex-wrap gap-2 text-sm"><span>Défendu par :</span>{defTypes.map(t=><TypePill key={t} t={t}/>)} </div>

          <SectionTitle>Faiblesses (subit plus)</SectionTitle>
          {groups.x4.length>0 && <><div className="mb-2 font-bold">×4</div><div className="flex flex-wrap gap-2 mb-4">{groups.x4.map(t=><TypePill key={t} t={t}/>)} </div></>}
          {groups.x2.length>0 && <><div className="mb-2 font-bold">×2</div><div className="flex flex-wrap gap-2 mb-4">{groups.x2.map(t=><TypePill key={t} t={t}/>)} </div></>}

          <SectionTitle>Résistances / Immunités (subit moins)</SectionTitle>
          {groups.x0.length>0 && <><div className="mb-2 font-bold">Immunité ×0</div><div className="flex flex-wrap gap-2 mb-4">{groups.x0.map(t=><TypePill key={t} t={t}/>)} </div></>}
          {groups.x025.length>0 && <><div className="mb-2 font-bold">×0.25</div><div className="flex flex-wrap gap-2 mb-4">{groups.x025.map(t=><TypePill key={t} t={t}/>)} </div></>}
          {groups.x05.length>0 && <><div className="mb-2 font-bold">×0.5</div><div className="flex flex-wrap gap-2">{groups.x05.map(t=><TypePill key={t} t={t}/>)} </div></>}
        </div>
      </div>
    </div>
  );
}
