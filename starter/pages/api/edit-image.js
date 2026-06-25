import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const DEFAULT_PROMPT =
  "A high-contrast, flat black and white vector graphic of the design. Strictly two-tone: solid black lines and pure white background. No gradients, no shading, no color.";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { imageBase64, prompt } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: "Missing imageBase64" });
    }

    const finalPrompt = prompt?.trim() || DEFAULT_PROMPT;

    console.log("[GENERATE] Starting image generation for prompt:", finalPrompt.substring(0, 50));

    // Convert base64 -> proper data URL
    const imageUrl = imageBase64.startsWith("data:")
      ? imageBase64
      : `data:image/png;base64,${imageBase64}`;

    // Call OpenAI Responses API with image_generation tool
    console.log("[GENERATE] Calling OpenAI Responses API...");
    const response = await openai.responses.create({
      model: "gpt-5.5",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: finalPrompt,
            },
            {
              type: "input_image",
              image_url: imageUrl,
              detail: "auto",
            },
          ],
        },
      ],
      tools: [{ type: "image_generation" }],
    });

    console.log("[GENERATE] OpenAI Response received");

    // Extract image result from image_generation_call
    const imageOutput = response.output.find(
      (o) => o.type === "image_generation_call"
    );

    if (!imageOutput?.result) {
      console.error("[GENERATE] No image in response:", JSON.stringify(response).substring(0, 200));
      throw new Error("No image returned from OpenAI Responses API");
    }

    const generatedBase64 = imageOutput.result;
    console.log("[GENERATE] Image generated successfully. Size:", generatedBase64.length);

    // Upload to Supabase Storage
    console.log("[GENERATE] Uploading to Supabase Storage...");
    const fileName = `${randomUUID()}.png`;
    const filePath = `generated/${fileName}`;
    
    const buffer = Buffer.from(generatedBase64, "base64");

    const { error: uploadError } = await supabase.storage
      .from("generated-images")
      .upload(filePath, buffer, {
        contentType: "image/png",
        cacheControl: "3600",
      });

    if (uploadError) {
      console.error("[GENERATE] Storage upload error:", uploadError);
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    console.log("[GENERATE] Image uploaded to storage");

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from("generated-images")
      .getPublicUrl(filePath);

    const publicUrl = publicUrlData.publicUrl;
    console.log("[GENERATE] Public URL:", publicUrl);

    // Save to database
    console.log("[GENERATE] Saving to database...");
    const { error: dbError } = await supabase
      .from("image_generations")
      .insert({
        prompt: finalPrompt,
        generated_image_url: publicUrl,
      });

    if (dbError) {
      console.error("[GENERATE] Database error:", dbError);
      throw new Error(`Database save failed: ${dbError.message}`);
    }

    console.log("[GENERATE] Saved to database successfully");

    return res.status(200).json({
      success: true,
      imageUrl: publicUrl,
      imageBase64: generatedBase64,
      prompt: finalPrompt,
    });
  } catch (error) {
    console.error("[GENERATE] Error:", error);

    const errorMessage = error instanceof Error ? error.message : String(error);

    if (errorMessage.includes("401") || errorMessage.includes("Unauthorized")) {
      return res.status(401).json({
        error: "Invalid API key",
        message: "Check your OpenAI and Supabase credentials",
      });
    }

    if (errorMessage.includes("quota") || errorMessage.includes("429")) {
      return res.status(429).json({
        error: "Rate limited",
        message: "Please try again later",
      });
    }

    return res.status(500).json({
      error: "Failed to generate image",
      message: errorMessage,
    });
  }
}