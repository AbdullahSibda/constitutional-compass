import express from "express";
import pdfParse from "pdf-parse";
import { encode, decode } from "gpt-tokenizer";
import { supabase, openai } from "../context/client.js"; // your existing clients.js

const router = express.Router();

/**
 * POST /api/process-document
 * body: { documentId, storagePath, mimeType }
 */
router.post("/", async (req, res) => {
  try {
    const { documentId, storagePath, mimeType } = req.body;
    console.log("storagePath:", storagePath);
    if (!documentId || !storagePath) {
      return res
        .status(400)
        .json({ error: "documentId and storagePath are required" });
    }

    // 1) DOWNLOAD the file from Supabase Storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("documents")
      .download(storagePath);
    if (downloadError || !fileData)
      throw downloadError || new Error("Download failed");

    // 2) EXTRACT TEXT
    let fullText;
    if (mimeType === "application/pdf") {
      // pdf-parse accepts a Buffer
      const buffer = Buffer.isBuffer(fileData)
        ? fileData
        : Buffer.from(await fileData.arrayBuffer());
      const { text } = await pdfParse(buffer);
      fullText = text;
    } else if (mimeType.startsWith("text/")) {
      const buffer = Buffer.isBuffer(fileData)
        ? fileData
        : Buffer.from(await fileData.arrayBuffer());
      fullText = buffer.toString("utf-8");
    } else {
      return res.status(415).json({ error: "Unsupported mimeType" });
    }

    // 3) SPLIT into ~500-token chunks
    const CHUNK_SIZE = 500;
    const STRIDE = 250;
    const chunks = [];
    const tokens = encode(fullText);
    for (let i = 0; i < tokens.length; i += STRIDE) {
      const slice = tokens.slice(i, i + CHUNK_SIZE);
      const textChunk = decode(slice);
      chunks.push(textChunk);
    }

    // (Optional) DELETE any old chunks for this doc:
    await supabase
      .from("document_chunks")
      .delete()
      .eq("document_id", documentId);

    // 4) BATCH-EMBED & UPSERT
    const BATCH_SIZE = 10;
    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE);
      const resp = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: batch,
      });

      const records = resp.data.map((d, idx) => ({
        document_id: documentId,
        chunk_index: i + idx,
        chunk_text: batch[idx].replace(/\u0000/g, ""), // 🚫 remove null bytes
        chunk_embedding: d.embedding,
        token_count: encode(batch[idx]).length,
      }));

      const { error: upsertError } = await supabase
        .from("document_chunks")
        .upsert(records);
      if (upsertError) throw upsertError;
    }

    return res.json({ ok: true, chunks: chunks.length });
  } catch (err) {
    console.error("process-document error:", err);
    return res.status(500).json({ error: err.message });
  }
});

export default router;
