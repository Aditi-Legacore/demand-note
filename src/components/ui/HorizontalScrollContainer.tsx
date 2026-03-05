"use client";

import React, { useRef, useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface HorizontalScrollContainerProps {
    children: React.ReactNode;
    className?: string;
    scrollAmount?: number;
}

export function HorizontalScrollContainer({
    children,
    className,
    scrollAmount = 300,
}: HorizontalScrollContainerProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const [showLeftArrow, setShowLeftArrow] = useState(false);
    const [showRightArrow, setShowRightArrow] = useState(false);
    const [mouseY, setMouseY] = useState<number | null>(null);

    const checkScroll = () => {
        if (scrollRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
            setShowLeftArrow(scrollLeft > 0);
            setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 5); // 5px buffer
        }
    };

    useEffect(() => {
        const scrollContainer = scrollRef.current;
        if (scrollContainer) {
            checkScroll();
            scrollContainer.addEventListener("scroll", checkScroll);
            window.addEventListener("resize", checkScroll);

            const timer = setTimeout(checkScroll, 500);

            return () => {
                scrollContainer.removeEventListener("scroll", checkScroll);
                window.removeEventListener("resize", checkScroll);
                clearTimeout(timer);
            };
        }
    }, [children]);

    const scroll = (direction: "left" | "right") => {
        if (scrollRef.current) {
            const currentScroll = scrollRef.current.scrollLeft;
            const newScroll =
                direction === "left"
                    ? currentScroll - scrollAmount
                    : currentScroll + scrollAmount;

            scrollRef.current.scrollTo({
                left: newScroll,
                behavior: "smooth",
            });
        }
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const relativeY = e.clientY - rect.top;

            // Keep button within container bounds with some padding
            const padding = 20;
            const limitedY = Math.max(padding, Math.min(relativeY, rect.height - padding));

            setMouseY(limitedY);
        }
    };

    return (
        <div
            ref={containerRef}
            className={cn("relative group", className)}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setMouseY(null)}
        >
            {showLeftArrow && (
                <Button
                    variant="outline"
                    size="icon"
                    className="absolute left-2 z-10 h-8 w-8 rounded-full shadow-md bg-white/80 backdrop-blur-sm border-gray-200 hover:bg-white hover:scale-110 transition-opacity duration-200 opacity-0 group-hover:opacity-100"
                    style={{
                        top: mouseY !== null ? `${mouseY}px` : "50%",
                        transform: "translateY(-50%)",
                        transition: "opacity 0.2s, transform 0.1s ease-out"
                    }}
                    onClick={() => scroll("left")}
                >
                    <ChevronLeft className="h-4 w-4" />
                </Button>
            )}

            <div
                ref={scrollRef}
                className="overflow-x-auto no-scrollbar"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
                {children}
            </div>

            {showRightArrow && (
                <Button
                    variant="outline"
                    size="icon"
                    className="absolute right-2 z-10 h-8 w-8 rounded-full shadow-md bg-white/80 backdrop-blur-sm border-gray-200 hover:bg-white hover:scale-110 transition-opacity duration-200 opacity-0 group-hover:opacity-100"
                    style={{
                        top: mouseY !== null ? `${mouseY}px` : "50%",
                        transform: "translateY(-50%)",
                        transition: "opacity 0.2s, transform 0.1s ease-out"
                    }}
                    onClick={() => scroll("right")}
                >
                    <ChevronRight className="h-4 w-4" />
                </Button>
            )}
        </div>
    );
}
