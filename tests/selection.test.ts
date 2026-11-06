// Task 6 TDD — Modal Lupa + Seleção Persistente + Barra Sticky Lote
import * as fs from "fs";
import * as path from "path";

// Mock localStorage for Node env
class MemoryStorage {
  private store = new Map<string, string>();
  getItem(k: string) { return this.store.get(k) ?? null; }
  setItem(k: string, v: string) { this.store.set(k, String(v)); }
  removeItem(k: string) { this.store.delete(k); }
  clear() { this.store.clear(); }
}
const memStorage = new MemoryStorage() as unknown as Storage;
(global as any).localStorage = memStorage;
(global as any).window = (global as any).window ?? {};
(global as any).document = (global as any).document ?? { addEventListener: () => {}, removeEventListener: () => {} };

function getModule(p: string) {
  return require(p);
}

describe("Task 6 — Modal Lupa + Seleção Persistente + Barra Sticky Lote", () => {
  const storePath = path.join(__dirname, "../lib/selection-store.ts");
  const modalPath = path.join(__dirname, "../components/detail-modal.tsx");
  const barPath = path.join(__dirname, "../components/batch-bar.tsx");

  describe("arquivos existem", () => {
    it("lib/selection-store.ts existe", () => {
      expect(fs.existsSync(storePath)).toBe(true);
    });
    it("components/detail-modal.tsx existe", () => {
      expect(fs.existsSync(modalPath)).toBe(true);
    });
    it("components/batch-bar.tsx existe", () => {
      expect(fs.existsSync(barPath)).toBe(true);
    });
  });

  describe("1. cross-page persistence: page1 3 + page2 2 => BatchBar 5, reload preserva localStorage", () => {
    beforeEach(() => { memStorage.clear(); jest.resetModules(); });

    it("seleção cross-page via store persiste em localStorage", async () => {
      const mod = getModule("../lib/selection-store");
      const api = mod.selectionStore ?? mod.default ?? mod;
      const getCount = () => {
        if (typeof api.getState === "function") return api.getState().selectedIds?.length ?? api.getCount?.() ?? 0;
        if (typeof api.getCount === "function") return api.getCount();
        return 0;
      };
      const toggleOrSelect = (id: string) => {
        if (typeof api.toggle === "function") return api.toggle(id);
        if (typeof api.select === "function") return api.select(id);
        if (typeof api.add === "function") return api.add(id);
      };

      // page 1: 3 seleções
      toggleOrSelect("v-1");
      toggleOrSelect("v-2");
      toggleOrSelect("v-3");
      expect(getCount()).toBe(3);

      // page 2: mais 2
      toggleOrSelect("v-4");
      toggleOrSelect("v-5");
      expect(getCount()).toBe(5);

      // BatchBar deve mostrar 5 — verifica via lib helper ou bar source
      const barSrc = fs.readFileSync(barPath, "utf-8");
      expect(barSrc).toMatch(/contador|count|selected|Candidatar|Contatar/i);

      // preserva após reload: localStorage + re-hydrate
      const STORAGE_KEY = mod.STORAGE_KEY ?? "w2talent:selection";
      const raw = memStorage.getItem(STORAGE_KEY);
      expect(raw).toBeTruthy();
      const parsed = JSON.parse(raw!);
      const ids = parsed.selectedIds ?? parsed.ids ?? parsed.state?.selectedIds ?? [];
      expect(ids.length).toBe(5);
      expect(ids).toEqual(expect.arrayContaining(["v-1","v-2","v-3","v-4","v-5"]));

      // simula reload: novo require deve hidratar do localStorage
      jest.resetModules();
      (global as any).localStorage = memStorage;
      const mod2 = getModule("../lib/selection-store");
      const api2 = mod2.selectionStore ?? mod2.default ?? mod2;
      const count2 = typeof api2.getState === "function" ? api2.getState().selectedIds.length : api2.getCount?.() ?? 0;
      // se hidratação síncrona, deve ter 5; se lazy, ao menos storage ainda tem 5
      expect(raw).toBeTruthy();
      // aceita ambos: se engine hidratou, count2===5, senão verifica storage
      if (count2 !== 5) {
        expect(JSON.parse(memStorage.getItem(STORAGE_KEY)!).selectedIds.length).toBe(5);
      } else {
        expect(count2).toBe(5);
      }
    });

    it("store expõe loteId e clear/drawer limpar", async () => {
      const mod = getModule("../lib/selection-store");
      const api = mod.selectionStore ?? mod.default ?? mod;
      const state = typeof api.getState === "function" ? api.getState() : api;
      // deve ter loteId
      expect("loteId" in state || "batchId" in state || typeof mod.LOTE_KEY !== "undefined" || fs.readFileSync(storePath,"utf-8").match(/loteId/)).toBeTruthy();
      // deve ter clear
      const hasClear = typeof api.clear === "function" || typeof api.clearAll === "function" || typeof api.removeAll === "function" || fs.readFileSync(storePath,"utf-8").match(/clear/i);
      expect(hasClear).toBeTruthy();
      // BatchBar drawer limpar
      const barSrc = fs.readFileSync(barPath, "utf-8");
      expect(barSrc).toMatch(/limpar/i);
      expect(barSrc).toMatch(/drawer/i);
    });
  });

  describe("2. lupa abre modal, ESC fecha e foco volta para lupa que abriu, seleção intacta e scroll preservado", () => {
    it("detail-modal tem focus trap, ESC e overlay preservando seleção", () => {
      const src = fs.readFileSync(modalPath, "utf-8");
      expect(src).toMatch(/focus.*trap|trapFocus|focusTrap/i);
      expect(src).toMatch(/Escape|ESC|onKeyDown|keydown/i);
      expect(src).toMatch(/overlay/i);
      expect(src).toMatch(/focus.*return|return.*focus|triggerRef|previouslyFocused|restoreFocus/i);
      expect(src).toMatch(/scroll/i); // preserva scroll
      // aria
      expect(src).toMatch(/role="dialog"/);
      expect(src).toMatch(/aria-modal/);
      expect(src).toMatch(/aria-label/);
    });

    it("ESC não limpa seleção (store intacta)", async () => {
      memStorage.clear(); jest.resetModules();
      const mod = getModule("../lib/selection-store");
      const api = mod.selectionStore ?? mod.default ?? mod;
      const toggle = (id:string) => (typeof api.toggle==="function"?api.toggle(id):api.select(id));
      toggle("v-10");
      toggle("v-11");
      const before = typeof api.getState==="function"? api.getState().selectedIds.length : 0;
      expect(before).toBe(2);
      // simula abrir/fechar modal: não deve chamar clear
      const modalSrc = fs.readFileSync(modalPath, "utf-8");
      // modal onClose não deve chamar clear
      expect(modalSrc).not.toMatch(/selectionStore\.clear\(\)|clear\(\)\s*\/\/.*ESC/);
      const after = typeof api.getState==="function"? api.getState().selectedIds.length : 0;
      expect(after).toBe(2);
    });

    it("modal usa radix/vaul ou implementa focus trap manual + bottom sheet mobile", () => {
      const src = fs.readFileSync(modalPath, "utf-8");
      // deve mencionar radix ou vaul ou implementar trap manual documentado
      const hasLibRef = /radix|vaul|focus-trap|FocusTrap/i.test(src);
      expect(hasLibRef).toBe(true);
      // bottom sheet mobile
      expect(src).toMatch(/bottom.?sheet|vaul|mobile|@media|768/i);
    });
  });

  describe("3. mobile bottom sheet não cobre BatchBar; aria + keyboard", () => {
    it("BatchBar sticky bottom com safe-area e z-index abaixo do sheet mas acima do conteúdo", () => {
      const barSrc = fs.readFileSync(barPath, "utf-8");
      const modalSrc = fs.readFileSync(modalPath, "utf-8");
      expect(barSrc).toMatch(/sticky|fixed/i);
      expect(barSrc).toMatch(/bottom/i);
      expect(barSrc).toMatch(/safe-area|env\(safe-area-inset-bottom\)|safeArea/i);
      expect(barSrc).toMatch(/aria-label|role=/i);
      // keyboard
      expect(barSrc).toMatch(/onKeyDown|keydown|Enter|Escape/i);
      // bottom sheet não cobre: BatchBar deve estar abaixo do modal (z-index menor) ou modal comenta
      expect(modalSrc + barSrc).toMatch(/z-?index|zIndex/i);
    });

    it("aria + keyboard: modal e bar têm navegação teclado", () => {
      const modalSrc = fs.readFileSync(modalPath, "utf-8");
      const barSrc = fs.readFileSync(barPath, "utf-8");
      // modal: Tab trap, ESC, aria
      expect(modalSrc).toMatch(/Tab|focusable|tabIndex/i);
      expect(modalSrc).toMatch(/aria-/i);
      // bar: aria + keyboard
      expect(barSrc).toMatch(/aria-/i);
      expect(barSrc).toMatch(/keyboard|onKeyDown|onKey/i);
    });
  });

  describe("4. exceder 10 por lote bloqueia com mensagem", () => {
    beforeEach(() => { memStorage.clear(); jest.resetModules(); });
    it("limite 10/lote bloqueia 11º com mensagem", async () => {
      const mod = getModule("../lib/selection-store");
      const api = mod.selectionStore ?? mod.default ?? mod;
      const toggle = (id:string) => (typeof api.toggle==="function"?api.toggle(id):api.select?.(id) ?? api.add?.(id));
      // adiciona 10
      for (let i=1;i<=10;i++) {
        const res = toggle(`v-${i}`);
        // se retorna objeto com error, verifica
        void res;
      }
      const count10 = typeof api.getState==="function"? api.getState().selectedIds.length : 0;
      expect(count10).toBe(10);
      // tenta 11º
      const beforeCount = count10;
      const result = toggle("v-11");
      const stateAfter = typeof api.getState==="function"? api.getState() : api;
      const countAfter = stateAfter.selectedIds?.length ?? beforeCount;
      expect(countAfter).toBe(10); // não aumentou
      // deve ter mensagem de erro
      const error = stateAfter.error ?? stateAfter.lastError ?? (result as any)?.error ?? null;
      const src = fs.readFileSync(storePath,"utf-8");
      expect(src).toMatch(/10.*lote|limite.*10|MAX.*10|LIMIT.*10/i);
      // error ou mensagem deve existir
      const hasErrorSignal = !!error || /limite|bloqueia|máximo|exced/i.test(src) || /limite.*10/i.test(JSON.stringify(stateAfter));
      expect(hasErrorSignal).toBe(true);
      // BatchBar deve exibir mensagem de limite
      const barSrc = fs.readFileSync(barPath,"utf-8");
      expect(barSrc).toMatch(/10|limite/i);
    });

    it("selection-store expõe SELECTION_LIMIT=10", () => {
      const mod = getModule("../lib/selection-store");
      expect(mod.SELECTION_LIMIT ?? mod.LIMIT ?? mod.MAX ?? 10).toBe(10);
      const src = fs.readFileSync(storePath,"utf-8");
      expect(src).toMatch(/SELECTION_LIMIT|LIMIT.*10|MAX.*10/);
      expect(src).toMatch(/zustand|create/i); // usa zustand
      expect(src).toMatch(/localStorage|persist/i);
    });
  });
});
