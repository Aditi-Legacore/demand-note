"use client";

import { AnimatePresence, motion } from "framer-motion";
import React, { createContext, useContext, useMemo, useState, type ReactNode, type Dispatch, type SetStateAction, type MouseEvent as ReactMouseEvent, type MouseEventHandler } from "react";

type PopoverContextValue = {
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
};

const PopoverContext = createContext<PopoverContextValue | null>(null);

interface PopoverProps {
  children: ReactNode;
}

export function Popover({ children }: PopoverProps) {
  const [open, setOpen] = useState(false);
  const context = useMemo(
    () => ({ open, setOpen }),
    [open]
  );

  return (
    <PopoverContext.Provider value={context}>
      <div className="relative inline-flex">{children}</div>
    </PopoverContext.Provider>
  );
}

interface PopoverTriggerProps {
  children: ReactNode;
  asChild?: boolean;
}

export function PopoverTrigger({ children, asChild }: PopoverTriggerProps) {
  const context = useContext(PopoverContext);
  if (!context) return null;
  const { open, setOpen } = context;

  const child = React.isValidElement(children)
    ? (children as React.ReactElement<{ onClick?: MouseEventHandler<HTMLElement | Element> }>)
    : null;
  const handleClick = () => setOpen(!open);

  const trigger = asChild && child
    ? child
    : (
      <button type="button" onClick={handleClick} className="inline-flex">
        {children}
      </button>
    );

  if (!child) return trigger;

  const existingOnClick = child.props.onClick;

  return React.cloneElement(child, {
    onClick: (event: ReactMouseEvent<HTMLElement | Element>) => {
      existingOnClick?.(event);
      handleClick();
    },
  });
}

interface PopoverContentProps {
  children: ReactNode;
  className?: string;
}

export function PopoverContent({ children, className = "" }: PopoverContentProps) {
  const context = useContext(PopoverContext);
  if (!context) return null;
  const { open, setOpen } = context;

  const close = () => setOpen(false);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          className={`absolute z-50 mt-2 shadow-lg ${className}`}
          style={{ left: 0 }}
          onMouseLeave={close}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
