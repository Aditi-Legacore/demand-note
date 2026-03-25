# Summary Explorer + Comment Specification

## Purpose
Document how the Summary Explorer table and comment popover consume database rows so future UI work knows which Prisma tables/columns populate each attribute.

## 1. Summary comment popover
**Location:** `frontend/src/components/prompt-management/PromptManagementPage.tsx`, `renderCommentCell(...)` inside the Summary Explorer sheet.

### Data sources
| UI field | Prisma table | Column(s) / relation(s) | Notes |
|---|---|---|---|
| Comment body (`commentText`) | `SummaryComment` | `comment` | The text left by a user for a specific summary. |
| Relative time (`createdAt`) | `SummaryComment` | `created_at` | Formatted via `formatDistanceToNow` in the popover. |
| Commenter name / email | `User` | `first_name`, `last_name`, `email` | Joined via `SummaryComment.user_id` to show the author. |
| Prompt link (hidden metadata) | `SummaryComment.prompt_id` + `Task.prompt_version_id` | `prompt_id`, `task.prompt_version_id` | Determines which prompt revision the comment is associated with for filtering/copy actions. |

### Backend path
The `/api/summaries` route includes `user` and `task` relations when selecting `SummaryComment` rows, so the UI always has the comment text, timestamps, and author details needed for the popover.

## 2. Summary Explorer table view
**Location:** Same component, table rendered when `isSummaryExplorerOpen` is true. Rows come from `summaries` state provided by `useSummaries()` (initial load in `frontend/src/hooks/use-summaries.ts`).

### API contract
| Query param | Prisma columns | Filtering behavior |
|---|---|---|
| `fromDate`, `toDate` | `SummaryComment.created_at` | `gte`/`lte` on the comment timestamp.
| `promptVersionId` | `SummaryComment.prompt_id` + `Task.prompt_version_id` | Matches either the comment prompt link or the task prompt that produced the summary.

### Returned row (`SummaryCommentRow`) mapping
| Row field | Source table | Column(s) | Purpose in UI |
|---|---|---|---|
| `id` | `SummaryComment` | `id` | Primary key used for row expand/collapse and clipboard helpers. |
| `createdAt` | `SummaryComment` | `created_at` | Shown next to each comment and used for sorting. |
| `comment` | `SummaryComment` | `comment` | Rendered by `renderCommentCell`. |
| `user` | `User` | `first_name`, `last_name`, `email` | Displayed in the popover for attribution. |
| `promptId` | `SummaryComment` | `prompt_id` | Legacy prompt pointer stored on the comment. |
| `promptVersionId` | `Task` | `prompt_version_id` | Task-level prompt; if present, shows the prompt version that generated the summary. |
| `promptVersionNumber` | `Prompt` | `version` | Looked up by resolved prompt ID to display the published version label. |
| `editedSummary` | `Task` | `edited_summary` | Shows the human-edited summary text in the explorer. |
| `outputSummary` | `Task` | `output_summary` | Shows the AI-generated summary. |
| `demandNote` | `DemandNote` | `id`, `client_name` | Provides the demand note context linked to the file. |
| `demandFile` | `DemandFile` | `demand_note_id`, `demandNote.client_name` | Helps tie the row to a specific uploaded file when a note has multiple files. |

### Join chain
1. `SummaryComment.task` ? `Task` (needed for summary text and prompt metadata).  
2. `Task.demandFile` ? `DemandFile` ? `DemandNote` (used for `client_name` + note ID).  
3. `Prompt` (queried by `promptId` or `Task.promptVersionId`) ? returns `version` so the UI can label the prompt revision in filters/badges.

### UI behavior notes
- The badge `Summary comments: {summaries.length}` displays the number of rows returned after filtering.
- `expandedSummaryId` uses `SummaryComment.id` to keep a row expanded even when refreshed.
- Copy-to-clipboard and the `Summary` column both rely on the `editedSummary` / `outputSummary` columns pulled from the `Task` table.
