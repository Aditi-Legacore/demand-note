import DemandNoteForm from "@/components/demand-notes/DemandNoteForm";

export default async function EditDemandNotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  return <DemandNoteForm id={resolvedParams.id} />;
}
