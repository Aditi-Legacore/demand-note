'use client';

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const tabs = [
  { id: "intakes", label: "Intakes" },
  { id: "leads", label: "Leads" },
  { id: "documents", label: "Documents" },
];

export default function TabsNav({ activeTab, onChange }: { activeTab: string; onChange: (tab: "intakes" | "leads" | "documents") => void }) {
  return (
    <div className="flex items-center gap-2 border-b border-border pb-2">
      {tabs.map((tab) => (
        <Button
          key={tab.id}
          variant={activeTab === tab.id ? "default" : "ghost"}
          className={cn(
            "rounded-md text-sm font-medium transition-all",
            activeTab === tab.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
          )}
          onClick={() => onChange(tab.id as "intakes" | "leads" | "documents")}
        >
          {tab.label}
        </Button>
      ))}
    </div>
  );
}
