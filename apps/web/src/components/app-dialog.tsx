"use client";

import { X } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

export type AppDialogSize = "sm" | "md" | "lg" | "xl" | "full";

export function AppDialog({
  busy = false,
  children,
  className,
  closeLabel = "إغلاق",
  confirmDiscardMessage,
  description,
  dismissOnBackdrop = false,
  eyebrow,
  headerAside,
  onClose,
  size = "lg",
  title,
  warnOnUnsavedChanges = true,
}: {
  busy?: boolean;
  children: ReactNode;
  className?: string;
  closeLabel?: string;
  confirmDiscardMessage?: string;
  description?: ReactNode;
  dismissOnBackdrop?: boolean;
  eyebrow?: ReactNode;
  headerAside?: ReactNode;
  onClose: () => void;
  size?: AppDialogSize;
  title: ReactNode;
  warnOnUnsavedChanges?: boolean;
}) {
  const [mounted, setMounted] = useState(false);
  const dialogRef = useRef<HTMLElement>(null);
  const busyRef = useRef(busy);
  const dirtyRef = useRef(false);
  const confirmDiscardRef = useRef(confirmDiscardMessage);
  const onCloseRef = useRef(onClose);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    busyRef.current = busy;
    confirmDiscardRef.current = confirmDiscardMessage;
    onCloseRef.current = onClose;
  }, [busy, confirmDiscardMessage, onClose]);

  const requestClose = useCallback(() => {
    if (busyRef.current) return;
    if (warnOnUnsavedChanges && dirtyRef.current) {
      const language = document.documentElement.lang.startsWith("en") ? "en" : "ar";
      const message =
        confirmDiscardRef.current ??
        (language === "ar"
          ? "لديك تعديلات غير محفوظة. هل تريد إغلاق النافذة وتجاهلها؟"
          : "You have unsaved changes. Close the dialog and discard them?");
      if (!window.confirm(message)) return;
    }
    dirtyRef.current = false;
    onCloseRef.current();
  }, [warnOnUnsavedChanges]);

  useEffect(() => {
    if (!mounted) return;
    const previousFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    const backgroundElements = [...document.body.children]
      .filter((element) => !element.classList.contains("app-dialog-backdrop"))
      .map((element) => ({
        element: element as HTMLElement,
        inert: (element as HTMLElement).inert,
        ariaHidden: element.getAttribute("aria-hidden"),
      }));
    document.body.style.overflow = "hidden";
    backgroundElements.forEach(({ element }) => {
      element.inert = true;
      element.setAttribute("aria-hidden", "true");
    });

    const dialog = dialogRef.current;
    const initialFocus =
      dialog?.querySelector<HTMLElement>("[data-dialog-initial-focus]") ??
      dialog?.querySelector<HTMLElement>(
        "input:not([disabled]), select:not([disabled]), textarea:not([disabled])",
      ) ??
      dialog?.querySelector<HTMLElement>("button:not([disabled])");
    window.requestAnimationFrame(() => (initialFocus ?? dialog)?.focus());

    function keydown(event: KeyboardEvent) {
      if (event.key === "Escape" && !busyRef.current) {
        event.preventDefault();
        requestClose();
        return;
      }
      if (event.key !== "Tab" || !dialog) return;

      const focusable = [...dialog.querySelectorAll<HTMLElement>(focusableSelector)].filter(
        (element) => !element.hidden && element.getAttribute("aria-hidden") !== "true",
      );
      if (focusable.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const first = focusable[0]!;
      const last = focusable.at(-1)!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", keydown);
    return () => {
      document.removeEventListener("keydown", keydown);
      document.body.style.overflow = previousOverflow;
      backgroundElements.forEach(({ element, inert, ariaHidden }) => {
        element.inert = inert;
        if (ariaHidden === null) element.removeAttribute("aria-hidden");
        else element.setAttribute("aria-hidden", ariaHidden);
      });
      previousFocus?.focus();
    };
  }, [mounted, requestClose]);

  if (!mounted) return null;

  return createPortal(
    <div
      className="app-dialog-backdrop"
      onMouseDown={(event) => {
        if (dismissOnBackdrop && !busy && event.target === event.currentTarget) requestClose();
      }}
    >
      <section
        aria-busy={busy || undefined}
        aria-describedby={description ? descriptionId : undefined}
        aria-labelledby={titleId}
        aria-modal="true"
        className={`app-dialog app-dialog-${size}${className ? ` ${className}` : ""}`}
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
        onInputCapture={(event) => {
          if (
            event.target instanceof HTMLInputElement ||
            event.target instanceof HTMLSelectElement ||
            event.target instanceof HTMLTextAreaElement
          ) {
            dirtyRef.current = true;
          }
        }}
      >
        <header className="app-dialog-header">
          <div className="app-dialog-heading">
            {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
            <h2 id={titleId}>{title}</h2>
            {description ? <p id={descriptionId}>{description}</p> : null}
          </div>
          <div className="app-dialog-header-actions">
            {headerAside}
            <button
              aria-label={closeLabel}
              className="icon-button"
              disabled={busy}
              title={closeLabel}
              type="button"
              onClick={requestClose}
            >
              <X aria-hidden="true" size={18} />
            </button>
          </div>
        </header>
        <div className="app-dialog-body">{children}</div>
      </section>
    </div>,
    document.body,
  );
}
