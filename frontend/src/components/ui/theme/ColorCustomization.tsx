import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";
import { Button } from "../button";

const colorPresets = [
  { name: "Blue", value: "221.2 83.2% 53.3%" },
  { name: "Green", value: "142 71% 45%" },
  { name: "Purple", value: "271 91% 65%" },
  { name: "Orange", value: "25 95% 53%" },
  { name: "Red", value: "0 84% 60%" },
  { name: "Pink", value: "330 81% 60%" },
];

const ColorCustomization = () => {
  const { primaryColor, setPrimaryColor } = useTheme();

  return (
    <div>
      <h6 className="text-sm font-semibold text-foreground mb-4">Primary Color</h6>
      <div className="grid grid-cols-3 gap-3">
        {colorPresets.map((color) => (
          <Button
            key={color.name}
            onClick={() => setPrimaryColor(color.value)}
            variant="outline"
            className={cn(
              "flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all h-auto",
              primaryColor === color.value
                ? "border-primary ring-2 ring-primary/20"
                : "border-border hover:border-primary/50"
            )}
          >
            <div
              className="w-8 h-8 rounded-full"
              style={{ backgroundColor: `hsl(${color.value})` }}
            />
            <span className="text-xs font-medium">{color.name}</span>
          </Button>
        ))}
      </div>
    </div>
  );
};

export default ColorCustomization;
