import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { callAI } from "@/lib/ai/providers";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ModelId } from "@/lib/pricing";

interface TestRequest {
  modelId: string;
  prompt?: string;
}

interface TestLog {
  timestamp: string;
  modelId: string;
  status: "success" | "error";
  responseTime: number;
  tokensInput?: number;
  tokensOutput?: number;
  error?: string;
  response?: string;
}

export async function POST(request: NextRequest) {
  // Check admin access
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body: TestRequest = await request.json();
  const { modelId, prompt = "Say 'Hello, I am working!' in exactly 5 words." } = body;

  if (!modelId) {
    return NextResponse.json({ error: "Model ID required" }, { status: 400 });
  }

  const startTime = Date.now();
  const log: TestLog = {
    timestamp: new Date().toISOString(),
    modelId,
    status: "error",
    responseTime: 0,
  };

  console.log(`[model-test] Testing model: ${modelId}`);

  try {
    // Call the AI model
    const response = await callAI(modelId as ModelId, [
      { role: "user", content: prompt },
    ]);

    const responseTime = Date.now() - startTime;

    log.status = "success";
    log.responseTime = responseTime;
    log.tokensInput = response.tokensInput;
    log.tokensOutput = response.tokensOutput;
    log.response = response.content.slice(0, 500); // Truncate for logging

    console.log(`[model-test] SUCCESS: ${modelId} responded in ${responseTime}ms`);
    console.log(`[model-test] Tokens: ${response.tokensInput} in, ${response.tokensOutput} out`);
    console.log(`[model-test] Response: ${response.content.slice(0, 100)}...`);

    // Log to database
    const adminClient = createAdminClient();
    await adminClient.from("model_test_logs").insert({
      model_id: modelId,
      status: "success",
      response_time_ms: responseTime,
      tokens_input: response.tokensInput,
      tokens_output: response.tokensOutput,
      prompt,
      response: response.content.slice(0, 1000),
    });

    return NextResponse.json({
      success: true,
      modelId,
      responseTime,
      tokensInput: response.tokensInput,
      tokensOutput: response.tokensOutput,
      response: response.content,
    });
  } catch (error) {
    const responseTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    log.status = "error";
    log.responseTime = responseTime;
    log.error = errorMessage;

    console.error(`[model-test] ERROR: ${modelId} failed after ${responseTime}ms`);
    console.error(`[model-test] Error: ${errorMessage}`);

    // Log error to database
    try {
      const adminClient = createAdminClient();
      await adminClient.from("model_test_logs").insert({
        model_id: modelId,
        status: "error",
        response_time_ms: responseTime,
        prompt,
        error_message: errorMessage,
      });
    } catch (e) {
      console.error("[model-test] Failed to log to DB:", e);
    }

    return NextResponse.json({
      success: false,
      modelId,
      responseTime,
      error: errorMessage,
    });
  }
}

// GET - Fetch test logs for a model
export async function GET(request: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const modelId = searchParams.get("modelId");
  const limit = parseInt(searchParams.get("limit") || "10");

  const adminClient = createAdminClient();

  let query = adminClient
    .from("model_test_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (modelId) {
    query = query.eq("model_id", modelId);
  }

  const { data, error } = await query;

  if (error) {
    // Table might not exist yet - return empty array
    if (error.code === "42P01") {
      return NextResponse.json([]);
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
