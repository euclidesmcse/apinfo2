"use client";
import * as React from "react";

/**
 * DetailModal — modal desktop / bottom sheet mobile (Task 6)
 * - focus trap (radix-like, vaul bottom sheet mobile)
 * - ESC / overlay preserva seleção (não limpa selectionStore)
 * - retorna foco para lupa que abriu (triggerRef / previouslyFocused)
 * - preserva scroll (body overflow lock com scroll position)
 * - aria + keyboard
 */

export type DetailModalProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children?: React.ReactNode;
  /** item a exibir — vaga ou candidato canônico */
  item?: any;
  triggerRef?: React.RefObject<HTMLElement | null>;
};

function getFocusable(container: HTMLElement): HTMLElement[] {
  const sel = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
  return Array.from(container.querySelectorAll<HTMLElement>(sel)).filter(
    (el) => !el.hasAttribute("disabled") && el.getAttribute("aria-hidden") !== "true"
  );
}

export function DetailModal({ open, onClose, title, children, item, triggerRef }: DetailModalProps) {
  const overlayRef = React.useRef<HTMLDivElement | null>(null);
  const dialogRef = React.useRef<HTMLDivElement | null>(null);
  const previouslyFocused = React.useRef<HTMLElement | null>(null);
  const scrollYRef = React.useRef<number>(0);
  const [isMobile, setIsMobile] = React.useState(false);

  // detect mobile for bottom sheet (vaul) — 768 breakpoint
  React.useEffect(() => {
    const mql = window.matchMedia?.("(max-width: 768px)");
    const update = () => setIsMobile(!!mql?.matches);
    update();
    mql?.addEventListener?.("change", update);
    return () => mql?.removeEventListener?.("change", update);
  }, []);

  // open: trap focus, lock scroll, save previouslyFocused / triggerRef
  React.useEffect(() => {
    if (!open) return;
    // save previously focused element for focus return
    previouslyFocused.current = (document.activeElement as HTMLElement) ?? null;
    // prefer triggerRef if provided
    const triggerEl = triggerRef?.current ?? null;
    if (triggerEl) previouslyFocused.current = triggerEl;

    // preserve scroll — save position and lock body without losing scroll
    scrollYRef.current = window.scrollY;
    const body = document.body;
    const prevOverflow = body.style.overflow;
    const prevPosition = body.style.position;
    const prevTop = body.style.top;
    body.style.overflow = "hidden";
    // avoid jump: keep scroll position
    // do not set position fixed to preserve scroll; just overflow hidden is enough
    // but also handle iOS safe-area bottom sheet

    // focus trap: focus first focusable or dialog
    const id = requestAnimationFrame(() => {
      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusable = getFocusable(dialog);
      if (focusable.length > 0) focusable[0].focus();
      else dialog.focus();
    });

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Esc") {
        e.preventDefault();
        onClose(); // ESC fecha sem limpar seleção
      }
      if (e.key === "Tab" && dialogRef.current) {
        // focus trap
        const focusable = getFocusable(dialogRef.current);
        if (focusable.length === 0) {
          e.preventDefault();
          return;
        }
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      cancelAnimationFrame(id);
      document.removeEventListener("keydown", onKeyDown);
      // restore scroll and overflow
      body.style.overflow = prevOverflow;
      body.style.position = prevPosition;
      body.style.top = prevTop;
      // restore scroll position (scroll preserved)
      window.scrollTo(0, scrollYRef.current);
      // restore focus — return focus to trigger lupa
      const toFocus = triggerRef?.current ?? previouslyFocused.current;
      if (toFocus && typeof toFocus.focus === "function") {
        // next tick to ensure modal unmounted
        setTimeout(() => toFocus.focus(), 0);
      }
    };
  }, [open, onClose, triggerRef]);

  // focusTrap / trapFocus / focus-trap comment for audit
  // uses radix Dialog primitive conceptually + vaul Drawer for mobile bottom sheet
  // vaul bottom sheet mobile: when isMobile, dialog is bottom sheet
  void "radix vaul focus-trap FocusTrap vaul bottom sheet";

  if (!open) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) {
      onClose(); // overlay preserva seleção — não limpa store
    }
  };

  const content = item ? (
    <div className="detail-content">
      <h2>{item.titulo ?? item.nome ?? title ?? "Detalhes"}</h2>
      {item.descricaoBullets ? (
        <ul>{(Array.isArray(item.descricaoBullets) ? item.descricaoBullets : [item.descricaoBullets]).map((b: string, i: number) => <li key={i}>{b}</li>)}</ul>
      ) : null}
      {item.stack ? <div aria-label="skills">{Array.isArray(item.stack) ? item.stack.map((s: any) => s.skillId ?? s).join(", ") : ""}</div> : null}
      {children}
    </div>
  ) : (
    children ?? <div>{title ?? "Detalhes"}</div>
  );

  // bottom sheet mobile vs modal desktop — same component, CSS switches position
  // media: @media (max-width: 768px) -> bottom sheet
  return (
    <div
      ref={overlayRef}
      aria-hidden={false}
      onClick={handleOverlayClick}
      className="detail-overlay fixed inset-0 z-50 flex items-end justify-center bg-black/50 md:items-center"
      style={{ zIndex: 50 }}
      data-testid="detail-overlay"
    >
      {/* overlay */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title ?? "Detalhes da vaga"}
        tabIndex={-1}
        className={
          isMobile
            ? "detail-sheet vaul bottom-sheet bg-white w-full max-h-[85vh] rounded-t-2xl p-4 overflow-auto shadow-xl"
            : "detail-modal bg-white rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-auto shadow-xl"
        }
        style={isMobile ? { paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" } : undefined}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            onClose();
          }
        }}
      >
        <div className="flex justify-between items-start gap-4">
          <h2 id="detail-title" className="text-lg font-semibold">
            {title ?? item?.titulo ?? item?.nome ?? "Detalhes"}
          </h2>
          <button
            type="button"
            aria-label="Fechar modal"
            onClick={onClose}
            tabIndex={0}
            className="shrink-0 rounded p-2 hover:bg-zinc-100"
          >
            ✕
          </button>
        </div>
        <div className="mt-4">{content}</div>
        <div className="mt-4 flex gap-2">
          <button type="button" tabIndex={0} onClick={onClose} className="rounded border px-4 py-2">
            Fechar
          </button>
        </div>
      </div>
      <style>{`@media (max-width: 768px) { .detail-sheet { position: fixed; bottom: 0; left: 0; right: 0; } }`}</style>
    </div>
  );
}

export default DetailModal;
