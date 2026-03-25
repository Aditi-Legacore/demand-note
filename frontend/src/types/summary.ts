export interface SummaryCommentUser {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
}

export interface SummaryCommentWithUser {
  id: string;
  comment: string;
  createdAt: string;
  user: SummaryCommentUser | null;
  promptId: string | null;
}

export interface PromptVersionOption {
  id: string;
  version: number;
}

export interface SummaryCommentRow {
  id: string;
  createdAt: string;
  comment: string;
  user: SummaryCommentUser | null;
  promptId: string | null;
  promptVersionId: string | null;
  promptVersionNumber: number | null;
  editedSummary: string | null;
  outputSummary: string | null;
  demandNote: {
    id: string;
    clientName?: string | null;
  } | null;
  demandFile: {
    demandNoteId?: string | null;
    clientName?: string | null;
  } | null;
}

export interface SummaryFilters {
  fromDate: string;
  toDate: string;
  promptVersionId: string;
}
