import express from "express";
import cors from "cors";
import processDocumentRouter from "./routes/processDocument.js";
import searchRouter from "./routes/search.js";

const app = express();
// Enable CORS with specific options
const corsOptions = {
  origin: "http://localhost:3000",
  methods: ["POST", "OPTIONS"], // Add OPTIONS here
  allowedHeaders: ["Content-Type", "Authorization"],
  //   credentials: true,
};

app.use(cors(corsOptions));

// Handle preflight requests for all routes
// app.options("*", cors(corsOptions)); // This is crucial

app.use(express.json());

// ... your other routes ...

// plug in the new endpoint
app.use("/api/process-document", processDocumentRouter);
app.use("/api/search", searchRouter);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Listening on http://localhost:${PORT}`);
});
