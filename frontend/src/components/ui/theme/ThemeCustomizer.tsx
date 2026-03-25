import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";
import LightDarkMode from "./LightDarkMode";
import ThemeDirection from "./ThemeDirection";
import ColorCustomization from "./ColorCustomization";

interface ThemeCustomizerProps {
  open: boolean;
  onClose: () => void;
}

const ThemeCustomizer = ({ open, onClose }: ThemeCustomizerProps) => {
  const { direction } = useTheme();

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40 transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      <div
        className={cn(
          "fixed max-w-[420px] w-full h-screen bg-card top-0 z-50 shadow-2xl transition-transform duration-500 flex flex-col",
          direction === "rtl"
            ? open
              ? "left-0 translate-x-0"
              : "left-0 -translate-x-full"
            : open
              ? "right-0 translate-x-0"
              : "right-0 translate-x-full"
        )}
      >
        <div className="flex items-center gap-6 px-6 py-4 border-b border-border justify-between">
          <div>
            <h6 className="text-sm font-semibold text-foreground">Theme Settings</h6>
            <p className="text-xs text-muted-foreground">Customize and preview instantly</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="hover:rotate-90 transition-transform duration-300"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex flex-col gap-8 px-6 py-6 overflow-y-auto flex-1">
          <LightDarkMode />
          <ThemeDirection />
          <ColorCustomization />
        </div>
      </div>
    </>
  );
};

export default ThemeCustomizer;