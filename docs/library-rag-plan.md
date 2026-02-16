# Plan: Library / Desk with pgvector RAG for Familia Children

## Context

Familia children use custom assistants for homework, writing, sciences, etc. Currently, conversations have no persistent knowledge beyond the system prompt. This plan adds a personal document library ("Ma bibliothèque") where children can upload school documents (PDFs, Word docs, images) and create text notes. Documents are chunked, embedded via OpenAI, and stored in pgvector. At chat time, relevant chunks are retrieved and injected into the assistant's system prompt — giving each conversation grounded, personalized context from the child's own materials.

Documents can be assigned to specific assistants (maths docs → Maths assistant) or left global (available to all).

---

## Phase 1: Database & Dependencies

### Migration `supabase/migrations/073_library_pgvector_rag.sql`

**Enable pgvector:**
```sql
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;
```

**Tables:**

| Table | Purpose |
|-------|---------|
| `library_documents` | Metadata: id, user_id, title, description, doc_type (pdf/docx/image/note), storage_path, mime_type, file_size, text_content, original_filename, processing_status (pending→extracting→embedding→ready/failed), error_message, chunk_count |
| `document_chunks` | id, document_id (FK cascade), chunk_index, content, token_count, embedding vector(1536) |
| `assistant_documents` | Junction: assistant_id (FK cascade) + document_id (FK cascade), PK on both |

**Indexes:**
- HNSW on `document_chunks.embedding` using `vector_cosine_ops` (best for <1M rows, no training needed)
- Standard B-tree indexes on user_id, document_id, processing_status

**RLS:** Users manage own documents. Parents can SELECT children's documents (via family org membership check). API routes use admin client for chunk operations.

**Similarity search function:** `match_document_chunks(query_embedding, match_user_id, match_assistant_id, match_threshold, match_count)` — returns chunks matching the query, scoped to documents assigned to the given assistant + global docs (not assigned to any assistant).

**Storage bucket:** `library-documents` (private, 20MB limit, RLS scoped to `{user_id}/*` paths)

### Dependency

Add `pdf-parse` to `package.json` for PDF text extraction. DOCX extraction already available via `mammoth` in `src/lib/files.ts:extractWordText()`.

---

## Phase 2: Processing Pipeline

Four new files under `src/lib/library/`:

### `chunker.ts`
- Split text on paragraph boundaries with ~500 token chunks, 50 token overlap
- Returns `{ index, content, tokenCount }[]`

### `extract.ts`
- `extractText(docType, storagePath, textContent)` — router
- PDF: use `pdf-parse` on downloaded buffer
- DOCX: reuse existing `extractWordText()` from `src/lib/files.ts`
- Image: return empty string (visual reference only, no OCR for now)
- Note: return `textContent` as-is

### `embeddings.ts`
- `generateEmbeddings(texts[])` — batch OpenAI `text-embedding-3-small` (1536 dims, $0.02/1M tokens)
- `generateSingleEmbedding(text)` — for query-time embedding
- Pin `dimensions: 1536` explicitly to prevent future API changes

### `process-document.ts`
- `processDocument(documentId)` — full pipeline: extract → chunk → embed → store
- Updates `processing_status` at each stage
- Idempotent: deletes existing chunks before re-inserting (supports retry)
- On failure: sets status to `failed` with `error_message`

---

## Phase 3: API Routes

### `src/app/api/familia/library/route.ts`
- **GET**: List all documents for authenticated user (with assistant assignment info via left join)
- **POST**: Create document — handles both multipart form (file upload) and JSON (text notes). Uploads file to `library-documents` bucket, creates DB record, fires off `processDocument()` in background. `maxDuration = 60`.

### `src/app/api/familia/library/[id]/route.ts`
- **PUT**: Update title/description
- **DELETE**: Delete document (cascade removes chunks + assignments), also delete storage file if exists

### `src/app/api/familia/library/[id]/reprocess/route.ts`
- **POST**: Re-trigger processing pipeline for failed documents

### `src/app/api/familia/library/[id]/assign/route.ts`
- **PUT**: `{ assistant_ids: string[] }` — replace all assignments for this document. Empty array = global doc.

All routes follow existing familia API pattern: auth check → admin client → validate familia membership → operate.

---

## Phase 4: RAG Integration

### `src/lib/library/rag.ts`
- `retrieveRelevantChunks(query, userId, assistantId?, maxChunks=5, threshold=0.7)`
  - Early exit: count user's ready documents first (cheap query, no embedding call if 0)
  - Generate query embedding
  - Call `match_document_chunks` RPC
  - Return `{ content, documentTitle, similarity }[]`

- `buildRAGContext(chunks[])` — formats chunks as a system prompt section:
  ```
  REFERENCE DOCUMENTS FROM THE STUDENT'S LIBRARY:
  [Source: Chapter 3 Notes]
  ...content...
  ---
  [Source: Physics Textbook]
  ...content...
  END OF REFERENCE DOCUMENTS.
  ```

### Modify `src/app/api/chat/route.ts` (child branch, ~line 289)
After `familiaSystemPrompt = buildFamiliaSystemPrompt(...)`:
```typescript
const ragChunks = await retrieveRelevantChunks(message, user.id, assistantId);
if (ragChunks.length > 0) {
  familiaSystemPrompt += buildRAGContext(ragChunks);
}
```

Only runs for familia children. Skips entirely if no library documents exist (no embedding API cost).

---

## Phase 5: UI

### Add "Library" tab to `src/components/familia/child-settings-panel.tsx`
- Extend `Tab` type to include `"library"`
- Add tab button between "assistants" and "activity"
- Render `<LibraryTab>` component

### New: `src/components/familia/library-tab.tsx`
Main library UI inside the settings panel:
- **Upload button**: File picker (PDF, DOCX, images, max 20MB)
- **Create note button**: Opens note editor modal
- **Document list**: Cards showing title, type icon, status badge, chunk count, assistant assignments
- **Actions per document**: Edit title, assign to assistants, delete (with confirm), retry (if failed)
- **Status polling**: `setInterval` every 3s for documents in processing states

### New: `src/components/familia/note-editor-modal.tsx`
Modal with title input, optional description, text content textarea (max 10000 chars), save/cancel.

### New: `src/components/familia/document-assistant-picker.tsx`
Multi-select dropdown of user's assistants with checkboxes. Unchecking all = global document.

---

## Phase 6: i18n

Add `familia.childSettings.library` keys to `messages/en.json` and `messages/fr.json`. Update `tabs` to include "library" / "Ma bibliothèque". ~30 keys covering upload, status, assignment, note editor, errors.

---

## Files Summary

### New (13 files)
| File | Purpose |
|------|---------|
| `supabase/migrations/073_library_pgvector_rag.sql` | DB schema + pgvector + search function |
| `src/lib/library/chunker.ts` | Text chunking |
| `src/lib/library/extract.ts` | PDF/DOCX/note text extraction |
| `src/lib/library/embeddings.ts` | OpenAI embedding generation |
| `src/lib/library/process-document.ts` | Async processing pipeline |
| `src/lib/library/rag.ts` | Retrieval + context builder |
| `src/app/api/familia/library/route.ts` | GET list + POST create |
| `src/app/api/familia/library/[id]/route.ts` | PUT update + DELETE |
| `src/app/api/familia/library/[id]/reprocess/route.ts` | POST retry |
| `src/app/api/familia/library/[id]/assign/route.ts` | PUT assignments |
| `src/components/familia/library-tab.tsx` | Library UI |
| `src/components/familia/note-editor-modal.tsx` | Note creation modal |
| `src/components/familia/document-assistant-picker.tsx` | Assistant assignment picker |

### Modified (5 files)
| File | Change |
|------|--------|
| `package.json` | Add `pdf-parse` |
| `src/types/index.ts` | Add `LibraryDocument`, `DocumentChunk` interfaces |
| `src/app/api/chat/route.ts` | Import RAG, retrieve + inject context in child branch |
| `src/components/familia/child-settings-panel.tsx` | Add "library" tab |
| `messages/en.json` + `messages/fr.json` | Add library i18n keys |

### Existing code reused
- `extractWordText()` from `src/lib/files.ts` — DOCX extraction
- `createAdminClient()` from `src/lib/supabase/admin` — bypass RLS
- `buildFamiliaSystemPrompt()` from `src/lib/familia/guardian-prompt.ts` — prompt building
- Upload patterns from `src/app/api/upload/route.ts` — multipart handling, `maxDuration`
- CRUD patterns from `src/app/api/familia/assistants/` — auth + ownership validation

---

## Verification

1. `pnpm tsc --noEmit` compiles
2. Run migration: `supabase db push` or equivalent
3. Create `library-documents` storage bucket in Supabase Dashboard
4. Log in as familia child → open "Mon espace" → see 4 tabs including "Ma bibliothèque"
5. **Upload a PDF** → status shows extracting → embedding → ready with chunk count
6. **Create a text note** → immediately processes and shows ready
7. **Assign a document** to an assistant → verify in DB junction table
8. **Start a chat** with that assistant, ask about content in the document → response references the document content
9. **Global doc test**: Upload doc without assignment → verify it surfaces in all assistant conversations
10. **Empty library**: User with no documents → chat works normally, no embedding API calls
11. Parent dashboard: Parent can see child's library documents (read-only)
