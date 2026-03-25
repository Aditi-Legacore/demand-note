import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";
import { Button } from "../button";

const LightDarkMode = () => {
  const { theme, setTheme } = useTheme();

  return (
    <div>
      <h6 className="text-sm font-semibold text-foreground mb-4">Theme Mode</h6>
      <div className="grid grid-cols-2 gap-3">
        <Button
          onClick={() => setTheme("light")}
          variant="outline"
          className={cn(
            "flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all h-auto",
            theme === "light"
              ? "border-primary bg-primary/10"
              : "border-border hover:border-primary/50"
          )}
        >
          <Sun className="w-6 h-6" />
          <span className="text-sm font-medium">Light</span>
        </Button>
        <Button
          onClick={() => setTheme("dark")}
          variant="outline"
          className={cn(
            "flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all h-auto",
            theme === "dark"
              ? "border-primary bg-primary/10"
              : "border-border hover:border-primary/50"
          )}
        >
          <Moon className="w-6 h-6" />
          <span className="text-sm font-medium">Dark</span>
        </Button>
      </div>
    </div>
  );
};

export default LightDarkMode;
