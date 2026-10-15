"use client";

import Link from "next/link";
import { useRef, type ReactNode } from "react";
import { IconClose } from "./icons";

export function PolicyDialog({
  trigger,
  title,
  subtitle,
  moreHref,
  moreLabel,
  children,
}: {
  trigger: ReactNode;
  title: string;
  subtitle?: string;
  moreHref?: string;
  moreLabel?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const close = () => ref.current?.close();
  return (
    <>
      <button type="button" className="policy-trigger" aria-haspopup="dialog" onClick={() => ref.current?.showModal()}>
        {trigger}
      </button>
      <dialog
        ref={ref}
        className="policy-dialog"
        aria-labelledby="policy-dialog-title"
        onClick={(e) => {
          if (e.target === e.currentTarget) close();
        }}
      >
        <header className="policy-head">
          <div>
            <strong id="policy-dialog-title">{title}</strong>
            {subtitle ? <small>{subtitle}</small> : null}
          </div>
          <button type="button" className="policy-x" aria-label="Kapat" onClick={close}>
            <IconClose />
          </button>
        </header>
        <div className="policy-body">{children}</div>
        <footer className="policy-foot">
          {moreHref ? <Link href={moreHref}>{moreLabel ?? "Devamını oku"}</Link> : <span />}
          <button type="button" className="btn btn-primary" onClick={close}>
            Anladım
          </button>
        </footer>
      </dialog>
    </>
  );
}
