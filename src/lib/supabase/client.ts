import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Lazy initialization to avoid build-time errors
let supabaseInstance: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn("Supabase credentials not configured");
    // Return a dummy client that will fail gracefully at runtime
    return createClient("https://placeholder.supabase.co", "placeholder-key");
  }

  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
  return supabaseInstance;
}

// Proxy para lazy initialization
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop: keyof SupabaseClient) {
    const client = getSupabaseClient();
    const value = client[prop];
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  },
});

// Bucket names
export const EVIDENCIAS_BUCKET = "evidencias";
export const FIRMAS_BUCKET = "firmas";

// Helper to get public URL for an evidencia
export function getEvidenciaPublicUrl(path: string): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return "";

  const { data } = supabase.storage
    .from(EVIDENCIAS_BUCKET)
    .getPublicUrl(path);

  return data.publicUrl;
}

// Helper to get public URL for a firma
export function getFirmaPublicUrl(path: string): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return "";

  const { data } = supabase.storage
    .from(FIRMAS_BUCKET)
    .getPublicUrl(path);

  return data.publicUrl;
}

// Helper to generate file path for firma
export function generateFirmaPath(ordenId: string): string {
  const timestamp = Date.now();
  return `ordenes/${ordenId}/firma_${timestamp}.png`;
}

// Helper to generate file path for evidencia
export function generateEvidenciaPath(
  ordenId: string,
  tipo: string,
  filename: string
): string {
  const timestamp = Date.now();
  const extension = filename.split(".").pop() || "jpg";
  return `ordenes/${ordenId}/${tipo}_${timestamp}.${extension}`;
}
