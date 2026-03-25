import { Badge } from "@/components/ui/badge";

export type DemandNoteStatus =
  | "initiated"
  | "doc-uploading"
  | "doc-uploaded"
  | "verified"
  | "generated"
  | "sent"
  | "notified"
  | "editing"
  | "review";

interface StatusBadgeProps {
  status: DemandNoteStatus;
}

const statusConfig = {
  initiated: {
    label: "Initiated",
    color: "bg-gray-100 text-gray-700",
  },
  "doc-uploading": {
    label: "Uploading",
    color: "bg-yellow-100 text-yellow-700",
  },
  "doc-uploaded": {
    label: "Uploaded",
    color: "bg-blue-100 text-blue-700",
  },
  verified: {
    label: "Verified",
    color: "bg-green-100 text-green-700",
  },
  generated: {
    label: "Generated",
    color: "bg-purple-100 text-purple-700",
  },
  sent: {
    label: "Published",
    color: "bg-indigo-100 text-indigo-700",
  },
  notified: {
    label: "For Review",
    color: "bg-orange-100 text-orange-700",
  },
  review: {
    label: "Under Review",
    color: "bg-cyan-100 text-cyan-700",
  },
  editing: {
    label: "Editing",
    color: "bg-red-100 text-red-700",
  },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status] || { label: "Unknown", color: "bg-gray-400 text-white" };

  return (
    <Badge className={config.color}>
      {config.label}
    </Badge>
  );
}
