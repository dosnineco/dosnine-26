import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const limit = parseInt(req.query.limit || '12', 10) || 12;

    console.log("[HISTORY] Fetching generations...");

    const { data, error } = await supabase
      .from("image_generations")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("[HISTORY] Fetch error:", error);
      throw new Error(`Failed to fetch: ${error.message}`);
    }

    console.log("[HISTORY] Fetched", data?.length || 0, "generations");

    return res.status(200).json({
      success: true,
      data: data || [],
    });
  } catch (error) {
    console.error("[HISTORY] Error:", error);

    const errorMessage = error instanceof Error ? error.message : String(error);

    return res.status(500).json({
      error: "Failed to fetch history",
      message: errorMessage,
    });
  }
}
