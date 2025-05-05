import express from "express";
import { openai, supabase } from "../context/client.js";

const router = express.Router();
const MATCH_COUNT = 300;

router.get("/", async (req, res) => {
  try {
    const raw = req.query.q;
    if (!raw)
      return res.status(400).json({ error: "Missing search query (`q`)" });
    const q = raw.trim();

    // 1. Generate query embedding
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: q,
    });

    const queryEmbedding = embeddingResponse.data[0].embedding;

    // 2. Search for top matching chunks (limit 50)
    let { data: chunks, error: chunkError } = await supabase.rpc(
      "match_document_chunks",
      {
        query_embedding: queryEmbedding,
        match_count: MATCH_COUNT,
      }
    );

    chunks = chunks.filter((c) => c.similarity_score < -0.3);

    if (chunkError) throw chunkError;
    if (!chunks || chunks.length === 0)
      return res.json({ query: q, results: [] });

    // 3. Group by best match per document
    const byDoc = {};
    const SNIPPETS_PER_DOC = 3;

    // Group all chunks by document_id
    chunks.forEach((chunk) => {
      const docId = chunk.document_id;
      if (!byDoc[docId]) byDoc[docId] = [];
      byDoc[docId].push(chunk);
    });

    // For each doc, sort its chunks by score ascending, keep top K
    const docsWithSnippets = Object.entries(byDoc).map(([docId, chunkArr]) => {
      const topChunks = chunkArr
        .sort((a, b) => a.similarity_score - b.similarity_score)
        .slice(0, SNIPPETS_PER_DOC);
      return { docId, snippets: topChunks };
    });

    // Sort documents by the best (first) snippet’s score
    docsWithSnippets.sort(
      (a, b) => a.snippets[0].similarity_score - b.snippets[0].similarity_score
    );

    // Limit to top-10 documents overall
    const topDocs = docsWithSnippets.slice(0, 10);

    // Pull in their metadata in one go
    const docIds = topDocs.map((d) => d.docId);
    const { data: docs, error: docError } = await supabase
      .from("documents")
      .select("id, name, storage_path, metadata")
      .in("id", docIds);

    if (docError) throw docError;

    // Helper to clean & trim snippet text
    function makeSnippetText(raw, query) {
      const text = raw.replace(/\s+/g, " ").trim();
      const qlow = query.toLowerCase();
      const pos = text.toLowerCase().indexOf(qlow);
      if (pos !== -1) {
        const start = Math.max(0, pos - 100);
        const end = Math.min(text.length, pos + query.length + 100);
        return text.slice(start, end) + "…";
      }
      return text.slice(0, 200) + "…";
    }

    const results = await Promise.all(
      topDocs.map(async ({ docId, snippets }) => {
        const doc = docs.find((d) => d.id === docId);

        // generate a signed url (or getPublicUrl) as before
        const { data, error: urlError } = await supabase.storage
          .from("documents")
          .createSignedUrl(doc.storage_path, 120);
        if (urlError) throw urlError;

        // map each top chunk into a cleaned snippet
        const snippetResults = snippets.map((ch) => ({
          text: makeSnippetText(ch.chunk_text, q),
          score: ch.similarity_score,
        }));

        return {
          document_id: doc.id,
          title: doc.name,
          url: data.signedUrl,
          metadata: doc.metadata,
          snippets: snippetResults, // array of up to 3 { text, score }
        };
      })
    );

    const seen = new Set();
    const uniqueResults = [];

    for (const r of results) {
      // pick whichever key makes sense—here I use the snippet
      if (!seen.has(r.document_id)) {
        seen.add(r.document_id);
        uniqueResults.push(r);
      }
    }

    // finally:
    return res.json({ query: q, results: uniqueResults });
  } catch (err) {
    console.error("search error:", err);
    return res.status(500).json({ error: "Search failed" });
  }
});

export default router;
