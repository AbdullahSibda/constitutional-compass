import express from "express";
import { openai, supabase } from "../context/client.js";

const router = express.Router();
const MATCH_COUNT = 200;

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

    // chunks = chunks.filter((c) => c.similarity_score < 0.5);

    if (chunkError) throw chunkError;
    if (!chunks || chunks.length === 0)
      return res.json({ query: q, results: [] });

    // 3. Group by best match per document
    const bestByDocument = {};
    for (const chunk of chunks) {
      const docId = chunk.document_id;
      if (
        !bestByDocument[docId] ||
        chunk.similarity_score < bestByDocument[docId].similarity_score
      ) {
        bestByDocument[docId] = chunk;
      }
    }

    // 4. Sort and pick top 10 docs
    const sortedDocs = Object.values(bestByDocument)
      .sort((a, b) => a.similarity_score - b.similarity_score)
      .slice(0, 10);

    // 5. Fetch metadata from `documents` table
    const docIds = sortedDocs.map((d) => d.document_id);
    const { data: docs, error: docError } = await supabase
      .from("documents")
      .select("id, name, storage_path, metadata")
      .in("id", docIds);

    if (docError) throw docError;

    // 6. Combine results
    const results = sortedDocs.map((chunk) => {
      const doc = docs.find((d) => d.id === chunk.document_id);

      // after you fetch `chunk.chunk_text`…
      let text = chunk.chunk_text
        .replace(/\s+/g, " ") // collapse spaces, newlines, tabs
        .trim(); // strip leading/trailing

      // find where your query phrase lives
      const lowText = text.toLowerCase();
      const lowQuery = q.toLowerCase();
      const pos = lowText.indexOf(lowQuery);

      // if we found it, grab 100 characters before & after; else take the first 200 chars
      let snippet;
      if (pos !== -1) {
        const start = Math.max(0, pos - 100);
        const end = Math.min(text.length, pos + lowQuery.length + 200);
        snippet = text.slice(start, end);
      } else {
        snippet = text.slice(0, 300);
      }
      snippet = snippet + "…";

      const { publicURL, error: urlError } = supabase.storage
        .from("documents")
        .getPublicUrl(doc.storage_path);

      if (urlError) throw urlError;

      return {
        document_id: doc.id,
        title: doc.name,
        snippet,
        url: publicURL,
        score: chunk.similarity_score,
        metadata: doc.metadata,
      };
    });

    return res.json({ query: q, results });
  } catch (err) {
    console.error("search error:", err);
    return res.status(500).json({ error: "Search failed" });
  }
});

export default router;
