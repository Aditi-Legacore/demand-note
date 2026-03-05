import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface LoadingSkeletonProps {
  /**
   * Message shown above the skeleton bars.
   * Set to `null` or `undefined` to hide the message.
   */
  message?: string | null;
  /** Number of skeleton rows rendered beneath the message. */
  rowCount?: number;
  /** Width classes to apply per row. Defaults to `w-full`. */
  rowWidths?: string[];
  /** Height/shape classes to apply per row. Defaults to `h-4 rounded-full`. */
  rowClassNames?: string[];
  /** Optional extra classes for the wrapping card. */
  cardClassName?: string;
  /** Additional classes for the CardContent container. */
  contentClassName?: string;
}

export default function LoadingSkeleton({
  message = "Loading...",
  rowCount = 3,
  rowWidths = [],
  rowClassNames = [],
  cardClassName,
  contentClassName,
}: LoadingSkeletonProps) {
  const widths = rowWidths.length
    ? rowWidths
    : Array.from({ length: rowCount }, () => "w-full");
  const defaultRowClass = "h-4 rounded-full";
  const rowClasses =
    rowClassNames.length > 0
      ? rowClassNames
      : Array.from({ length: rowCount }, () => defaultRowClass);

  return (
    <Card className={cardClassName}>
      <CardContent className={cn("p-6 space-y-4", contentClassName)}>
        {message && (
          <p className="text-center text-sm text-muted-foreground">{message}</p>
        )}
        <div className="space-y-3">
          {Array.from({ length: rowCount }).map((_, index) => {
            const widthClass =
              widths[index] ?? widths[widths.length - 1] ?? "w-full";
            const rowClass =
              rowClasses[index] ?? rowClasses[rowClasses.length - 1] ?? defaultRowClass;

            return (
              <div
                key={`loading-skeleton-${index}`}
                className={cn(
                  "bg-slate-200/80 dark:bg-slate-700/60 animate-pulse",
                  widthClass,
                  rowClass
                )}
              />
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
