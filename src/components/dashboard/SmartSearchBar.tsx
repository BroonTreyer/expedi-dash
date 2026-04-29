import { useMemo, useRef, useState, useEffect } from "react";
import { Search, X, User, Users, Truck, MapPin, Package, FileText, Hash, Building2, Type } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type SearchTagType =
  | "cliente" | "vendedor" | "placa" | "motorista"
  | "transportadora" | "cidade" | "uf" | "pedido"
  | "carga" | "produto" | "texto";

export interface SearchTag {
  type: SearchTagType;
  value: string;     // valor canônico usado no filtro (ex.: codigo_cliente, vendedor_id, placa, "GO", numero_pedido como string)
  label: string;     // texto curto exibido na tag
}

interface Suggestion extends SearchTag {
  key: string;       // type + value, evita duplicar
  hint?: string;     // contexto extra (ex.: "Padaria X" no cliente)
}

interface CarregamentoLite {
  vendedor_id?: string | null;
  codigo_cliente?: string | null;
  cliente?: string | null;
  cidade?: string | null;
  uf?: string | null;
  placa?: string | null;
  motorista?: string | null;
  transportadora?: string | null;
  numero_pedido?: number | null;
  nome_carga?: string | null;
  carga_id?: string | null;
  nome_produto?: string | null;
  codigo_produto?: string | null;
}

interface Props {
  tags: SearchTag[];
  onChange: (tags: SearchTag[]) => void;
  carregamentos: CarregamentoLite[];
  vendedores: { id: string; nome_vendedor: string }[];
  clientes?: { codigo_cliente: string; nome_cliente: string }[];
  className?: string;
  placeholder?: string;
}

const TYPE_META: Record<SearchTagType, { label: string; icon: any; tone: string }> = {
  cliente:        { label: "Cliente",        icon: User,        tone: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-200 dark:border-blue-900" },
  vendedor:       { label: "Vendedor",       icon: Users,       tone: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-900" },
  placa:          { label: "Placa",          icon: Truck,       tone: "bg-amber-100 text-amber-900 border-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-900" },
  motorista:      { label: "Motorista",      icon: User,        tone: "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/40 dark:text-purple-200 dark:border-purple-900" },
  transportadora: { label: "Transportadora", icon: Building2,   tone: "bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-200 dark:border-cyan-900" },
  cidade:         { label: "Cidade",         icon: MapPin,      tone: "bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800/60 dark:text-slate-200 dark:border-slate-700" },
  uf:             { label: "UF",             icon: MapPin,      tone: "bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800/60 dark:text-slate-200 dark:border-slate-700" },
  pedido:         { label: "Pedido",         icon: Hash,        tone: "bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-200 dark:border-indigo-900" },
  carga:          { label: "Carga",          icon: FileText,    tone: "bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-200 dark:border-rose-900" },
  produto:        { label: "Produto",        icon: Package,     tone: "bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-950/40 dark:text-teal-200 dark:border-teal-900" },
  texto:          { label: "Texto",          icon: Type,        tone: "bg-muted text-foreground border-border" },
};

const norm = (s: string | null | undefined) => (s ?? "").toString().toLowerCase().trim();

export function SmartSearchBar({ tags, onChange, carregamentos, vendedores, clientes = [], className, placeholder }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // close on outside click
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const existingKeys = useMemo(() => new Set(tags.map(t => `${t.type}::${t.value}`)), [tags]);

  const suggestions = useMemo<Suggestion[]>(() => {
    const q = norm(query);
    if (q.length < 1) return [];
    const out: Suggestion[] = [];
    const push = (s: Suggestion) => {
      if (existingKeys.has(`${s.type}::${s.value}`)) return;
      if (out.find(x => x.key === s.key)) return;
      out.push(s);
    };

    // Vendedores (lista mestre)
    for (const v of vendedores) {
      if (norm(v.nome_vendedor).includes(q)) {
        push({ key: `vendedor::${v.id}`, type: "vendedor", value: v.id, label: v.nome_vendedor });
      }
    }
    // Clientes (lista mestre quando vem)
    for (const c of clientes) {
      if (norm(c.nome_cliente).includes(q) || norm(c.codigo_cliente).includes(q)) {
        push({
          key: `cliente::${c.codigo_cliente}`,
          type: "cliente",
          value: c.codigo_cliente,
          label: c.codigo_cliente,
          hint: c.nome_cliente,
        });
      }
    }

    // Varredura sobre carregamentos para campos dinâmicos
    const pedidoSeen = new Set<string>();
    const placaSeen = new Set<string>();
    const motSeen = new Set<string>();
    const trSeen = new Set<string>();
    const cdSeen = new Set<string>();
    const ufSeen = new Set<string>();
    const cgSeen = new Set<string>();
    const prSeen = new Set<string>();
    const clSeen = new Set<string>();

    for (const c of carregamentos) {
      // cliente extraído do dataset (caso prop clientes esteja vazio)
      if (c.codigo_cliente && !clSeen.has(c.codigo_cliente)) {
        clSeen.add(c.codigo_cliente);
        if (norm(c.codigo_cliente).includes(q) || norm(c.cliente).includes(q)) {
          push({
            key: `cliente::${c.codigo_cliente}`,
            type: "cliente",
            value: c.codigo_cliente,
            label: c.codigo_cliente,
            hint: c.cliente ?? undefined,
          });
        }
      }
      if (c.placa && !placaSeen.has(c.placa)) {
        placaSeen.add(c.placa);
        if (norm(c.placa).includes(q)) push({ key: `placa::${c.placa}`, type: "placa", value: c.placa, label: c.placa });
      }
      if (c.motorista && !motSeen.has(c.motorista)) {
        motSeen.add(c.motorista);
        if (norm(c.motorista).includes(q)) push({ key: `motorista::${c.motorista}`, type: "motorista", value: c.motorista, label: c.motorista });
      }
      if (c.transportadora && !trSeen.has(c.transportadora)) {
        trSeen.add(c.transportadora);
        if (norm(c.transportadora).includes(q)) push({ key: `transp::${c.transportadora}`, type: "transportadora", value: c.transportadora, label: c.transportadora });
      }
      if (c.cidade && !cdSeen.has(c.cidade)) {
        cdSeen.add(c.cidade);
        if (norm(c.cidade).includes(q)) push({ key: `cidade::${c.cidade}`, type: "cidade", value: c.cidade, label: c.cidade + (c.uf ? `/${c.uf}` : "") });
      }
      if (c.uf && !ufSeen.has(c.uf)) {
        ufSeen.add(c.uf);
        if (norm(c.uf) === q || norm(c.uf).startsWith(q)) push({ key: `uf::${c.uf}`, type: "uf", value: c.uf, label: c.uf });
      }
      if (c.numero_pedido != null) {
        const np = String(c.numero_pedido);
        if (!pedidoSeen.has(np)) {
          pedidoSeen.add(np);
          if (np.includes(q.replace("#", ""))) {
            push({ key: `pedido::${np}`, type: "pedido", value: np, label: `#${np}`, hint: c.cliente ?? undefined });
          }
        }
      }
      const cargaLabel = c.nome_carga || c.carga_id;
      if (cargaLabel && !cgSeen.has(cargaLabel)) {
        cgSeen.add(cargaLabel);
        if (norm(cargaLabel).includes(q)) push({ key: `carga::${cargaLabel}`, type: "carga", value: cargaLabel, label: cargaLabel });
      }
      if (c.nome_produto && !prSeen.has(c.nome_produto)) {
        prSeen.add(c.nome_produto);
        if (norm(c.nome_produto).includes(q) || norm(c.codigo_produto).includes(q)) {
          push({ key: `produto::${c.nome_produto}`, type: "produto", value: c.nome_produto, label: c.nome_produto });
        }
      }
    }

    // sempre oferece "Texto livre" como fallback no fim
    push({ key: `texto::${q}`, type: "texto", value: q, label: query.trim(), hint: "Buscar como texto" });

    return out.slice(0, 30);
  }, [query, vendedores, clientes, carregamentos, existingKeys]);

  useEffect(() => { setHighlight(0); }, [query]);

  const addTag = (s: Suggestion) => {
    onChange([...tags, { type: s.type, value: s.value, label: s.label }]);
    setQuery("");
    setHighlight(0);
    inputRef.current?.focus();
  };

  const removeTag = (idx: number) => {
    onChange(tags.filter((_, i) => i !== idx));
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setHighlight((h) => Math.min(h + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (suggestions[highlight]) addTag(suggestions[highlight]);
    } else if (e.key === "Escape") {
      setOpen(false);
    } else if (e.key === "Backspace" && query === "" && tags.length > 0) {
      removeTag(tags.length - 1);
    }
  };

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <div className="flex flex-wrap items-center gap-1.5 rounded-md border bg-background px-2 py-1.5 min-h-9 focus-within:ring-2 focus-within:ring-ring">
        <Search className="h-4 w-4 text-muted-foreground shrink-0" />
        {tags.map((t, i) => {
          const meta = TYPE_META[t.type];
          const Icon = meta.icon;
          return (
            <Badge key={`${t.type}-${t.value}-${i}`} variant="outline" className={cn("h-6 gap-1 px-1.5 text-[11px] font-normal", meta.tone)}>
              <Icon className="h-3 w-3 shrink-0" />
              <span className="font-medium">{meta.label}:</span>
              <span className="truncate max-w-[140px]">{t.label}</span>
              <button type="button" onClick={() => removeTag(i)} className="ml-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 p-0.5">
                <X className="h-2.5 w-2.5" />
              </button>
            </Badge>
          );
        })}
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={tags.length === 0 ? (placeholder ?? "Buscar por cliente, vendedor, placa, pedido…") : ""}
          className="flex-1 min-w-[140px] bg-transparent border-0 outline-none text-sm placeholder:text-muted-foreground h-7"
        />
        {tags.length > 0 && (
          <Button type="button" variant="ghost" size="sm" className="h-6 px-1.5 text-[11px] text-muted-foreground" onClick={() => onChange([])}>
            Limpar
          </Button>
        )}
      </div>

      {open && suggestions.length > 0 && (
        <div className="absolute z-50 mt-1 w-full max-h-80 overflow-y-auto rounded-md border bg-popover shadow-lg">
          {suggestions.map((s, idx) => {
            const meta = TYPE_META[s.type];
            const Icon = meta.icon;
            return (
              <button
                key={s.key}
                type="button"
                onMouseEnter={() => setHighlight(idx)}
                onMouseDown={(e) => { e.preventDefault(); addTag(s); }}
                className={cn(
                  "w-full flex items-center gap-2 px-2.5 py-1.5 text-sm text-left hover:bg-accent",
                  idx === highlight && "bg-accent"
                )}
              >
                <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-[11px] uppercase tracking-wide text-muted-foreground w-24 shrink-0">{meta.label}</span>
                <span className="font-medium truncate">{s.label}</span>
                {s.hint && <span className="text-xs text-muted-foreground truncate ml-1">— {s.hint}</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Aplica as tags a um carregamento. AND entre tipos diferentes, OR dentro do mesmo tipo. */
export function matchSearchTags(c: CarregamentoLite, tags: SearchTag[]): boolean {
  if (tags.length === 0) return true;
  const grouped = new Map<SearchTagType, SearchTag[]>();
  for (const t of tags) {
    const arr = grouped.get(t.type) ?? [];
    arr.push(t);
    grouped.set(t.type, arr);
  }
  for (const [type, group] of grouped) {
    const ok = group.some((t) => {
      switch (type) {
        case "cliente":        return c.codigo_cliente === t.value;
        case "vendedor":       return c.vendedor_id === t.value;
        case "placa":          return norm(c.placa) === norm(t.value);
        case "motorista":      return norm(c.motorista) === norm(t.value);
        case "transportadora": return norm(c.transportadora) === norm(t.value);
        case "cidade":         return norm(c.cidade) === norm(t.value);
        case "uf":             return norm(c.uf) === norm(t.value);
        case "pedido":         return String(c.numero_pedido ?? "") === t.value;
        case "carga":          return (c.nome_carga ?? c.carga_id ?? "") === t.value;
        case "produto":        return c.nome_produto === t.value;
        case "texto": {
          const q = norm(t.value);
          const fields = [c.nome_produto, c.codigo_produto, c.cliente, c.codigo_cliente, c.motorista, c.cidade, c.uf, c.nome_carga, c.placa, c.transportadora, String(c.numero_pedido ?? "")];
          return fields.some(f => norm(f).includes(q));
        }
      }
      return false;
    });
    if (!ok) return false;
  }
  return true;
}
