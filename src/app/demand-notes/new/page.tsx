import DemandNoteForm from "@/components/demand-notes/DemandNoteForm";

export default function EditDemandNotePage({ params }: { params: { id: string } }) {
  return <DemandNoteForm id={params.id} />;
}
