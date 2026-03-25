"use client";

import React, { createContext, useContext } from "react";
import { cn } from "@/lib/utils";

interface CarouselContextValue {
  next(): void;
  previous(): void;
}

const CarouselContext = createContext<CarouselContextValue>({
  next: () => undefined,
  previous: () => undefined,
});

interface CarouselProps {
  children: React.ReactNode;
  className?: string;
  opts?: Record<string, unknown>;
}

export function Carousel({ children, className }: CarouselProps) {
  const contextValue = {
    next: () => undefined,
    previous: () => undefined,
  };

  return (
    <CarouselContext.Provider value={contextValue}>
      <section className={cn("space-y-3", className)}>{children}</section>
    </CarouselContext.Provider>
  );
}

interface CarouselContentProps {
  children: React.ReactNode;
  className?: string;
}

export function CarouselContent({ children, className = "" }: CarouselContentProps) {
  return (
    <div className={cn("flex flex-wrap gap-4", className)}>
      {children}
    </div>
  );
}

interface CarouselItemProps {
  children: React.ReactNode;
  className?: string;
}

export function CarouselItem({ children, className = "" }: CarouselItemProps) {
  return <div className={cn("flex-1 min-w-[280px]", className)}>{children}</div>;
}

export function CarouselNext(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { next } = useContext(CarouselContext);

  return <button type="button" {...props} onClick={(event) => { props.onClick?.(event); next(); }} />;
}

export function CarouselPrevious(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { previous } = useContext(CarouselContext);

  return <button type="button" {...props} onClick={(event) => { props.onClick?.(event); previous(); }} />;
}
