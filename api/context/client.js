import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { AzureOpenAI } from "openai";

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON;

export const openai = new AzureOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  deployment: "text-embedding-3-small",
  endpoint: process.env.OPENAI_API_URL,
  apiVersion: "2024-04-01-preview",
});

export const supabase = createClient(supabaseUrl, supabaseKey);
