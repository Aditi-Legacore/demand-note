import { AlignLeft, AlignRight } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";
import { Button } from "../button";

const ThemeDirection = () => {
  const { direction, setDirection } = useTheme();

  return (
    <div>
      <h6 className="text-sm font-semibold text-foreground mb-4">Direction</h6>
      <div className="grid grid-cols-2 gap-3">
        <Button
          onClick={() => setDirection("ltr")}
          variant="outline"
          className={cn(
            "flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all h-auto",
            direction === "ltr"
              ? "border-primary bg-primary/10"
              : "border-border hover:border-primary/50"
          )}
        >
          <AlignLeft className="w-6 h-6" />
          <span className="text-sm font-medium">LTR</span>
        </Button>
        <Button
          onClick={() => setDirection("rtl")}
          variant="outline"
          className={cn(
            "flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all h-auto",
            direction === "rtl"
              ? "border-primary bg-primary/10"
              : "border-border hover:border-primary/50"
          )}
        >
          <AlignRight className="w-6 h-6" />
          <span className="text-sm font-medium">RTL</span>
        </Button>
      </div>
    </div>
  );
};

export default ThemeDirection;