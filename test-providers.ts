// Test script to verify all AI providers work correctly
// Run with: npx tsx test-providers.ts

import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Mistral } from "@mistralai/mistralai";
import * as fs from "fs";

// Load env manually
const envFile = fs.readFileSync(".env.local", "utf-8");
envFile.split("\n").forEach((line) => {
  const [key, ...valueParts] = line.split("=");
  if (key && !key.startsWith("#")) {
    process.env[key.trim()] = valueParts.join("=").trim();
  }
});

// Create a small test image (1x1 red pixel PNG)
const TEST_IMAGE_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

// Create a minimal test PDF
const TEST_PDF_BASE64 = "JVBERi0xLjEKMSAwIG9iago8PCAvVHlwZSAvQ2F0YWxvZyAvUGFnZXMgMiAwIFIgPj4KZW5kb2JqCjIgMCBvYmoKPDwgL1R5cGUgL1BhZ2VzIC9LaWRzIFszIDAgUl0gL0NvdW50IDEgPj4KZW5kb2JqCjMgMCBvYmoKPDwgL1R5cGUgL1BhZ2UgL1BhcmVudCAyIDAgUiAvTWVkaWFCb3ggWzAgMCA2MTIgNzkyXQovQ29udGVudHMgNCAwIFIgL1Jlc291cmNlcyA8PCAvRm9udCA8PCAvRjEgNSAwIFIgPj4gPj4gPj4KZW5kb2JqCjQgMCBvYmoKPDwgL0xlbmd0aCA0NCA+PgpzdHJlYW0KQlQgL0YxIDI0IFRmIDEwMCA3MDAgVGQgKFRlc3QgUERGKSBUaiBFVAplbmRzdHJlYW0KZW5kb2JqCjUgMCBvYmoKPDwgL1R5cGUgL0ZvbnQgL1N1YnR5cGUgL1R5cGUxIC9CYXNlRm9udCAvSGVsdmV0aWNhID4+CmVuZG9iagp4cmVmCjAgNgowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAwMDkgMDAwMDAgbiAKMDAwMDAwMDA1OCAwMDAwMCBuIAowMDAwMDAwMTE1IDAwMDAwIG4gCjAwMDAwMDAyNzAgMDAwMDAgbiAKMDAwMDAwMDM2MyAwMDAwMCBuIAp0cmFpbGVyCjw8IC9TaXplIDYgL1Jvb3QgMSAwIFIgPj4Kc3RhcnR4cmVmCjQ0MgolJUVPRgo=";

async function testAnthropic() {
  console.log("\n========== ANTHROPIC (Claude) ==========");
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  // Test 1: Text only
  console.log("\n1. Testing text message...");
  try {
    const response = await client.messages.create({
      model: "claude-3-5-haiku-20241022",
      max_tokens: 100,
      messages: [{ role: "user", content: "Say 'test ok' in 2 words" }],
    });
    console.log("✅ Text: OK -", response.content[0].type === "text" ? response.content[0].text.slice(0, 50) : "");
  } catch (e: any) {
    console.log("❌ Text: FAILED -", e.message);
  }

  // Test 2: Image
  console.log("\n2. Testing image...");
  try {
    const response = await client.messages.create({
      model: "claude-3-5-haiku-20241022",
      max_tokens: 100,
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: "image/png", data: TEST_IMAGE_BASE64 } },
          { type: "text", text: "What color is this pixel? Reply in 2 words." }
        ]
      }],
    });
    console.log("✅ Image: OK -", response.content[0].type === "text" ? response.content[0].text.slice(0, 50) : "");
  } catch (e: any) {
    console.log("❌ Image: FAILED -", e.message);
  }

  // Test 3: PDF
  console.log("\n3. Testing PDF...");
  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 100,
      messages: [{
        role: "user",
        content: [
          { type: "document", source: { type: "base64", media_type: "application/pdf", data: TEST_PDF_BASE64 } },
          { type: "text", text: "What does this PDF say? Reply in 3 words." }
        ]
      }],
    });
    console.log("✅ PDF: OK -", response.content[0].type === "text" ? response.content[0].text.slice(0, 50) : "");
  } catch (e: any) {
    console.log("❌ PDF: FAILED -", e.message);
  }
}

async function testOpenAI() {
  console.log("\n========== OPENAI (GPT) ==========");
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  // Test 1: Text only
  console.log("\n1. Testing text message...");
  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      max_completion_tokens: 100,
      messages: [{ role: "user", content: "Say 'test ok' in 2 words" }],
    });
    console.log("✅ Text: OK -", response.choices[0]?.message?.content?.slice(0, 50));
  } catch (e: any) {
    console.log("❌ Text: FAILED -", e.message);
  }

  // Test 2: Image
  console.log("\n2. Testing image...");
  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      max_completion_tokens: 100,
      messages: [{
        role: "user",
        content: [
          { type: "image_url", image_url: { url: `data:image/png;base64,${TEST_IMAGE_BASE64}` } },
          { type: "text", text: "What color is this pixel? Reply in 2 words." }
        ]
      }],
    });
    console.log("✅ Image: OK -", response.choices[0]?.message?.content?.slice(0, 50));
  } catch (e: any) {
    console.log("❌ Image: FAILED -", e.message);
  }

  // Test 3: PDF (GPT-5 only)
  console.log("\n3. Testing PDF with GPT-5...");
  try {
    const response = await client.chat.completions.create({
      model: "gpt-5",
      max_completion_tokens: 100,
      messages: [{
        role: "user",
        content: [
          { type: "file", file: { filename: "test.pdf", file_data: `data:application/pdf;base64,${TEST_PDF_BASE64}` } } as any,
          { type: "text", text: "What does this PDF say? Reply in 3 words." }
        ]
      }],
    });
    console.log("✅ PDF: OK -", response.choices[0]?.message?.content?.slice(0, 50));
  } catch (e: any) {
    console.log("❌ PDF: FAILED -", e.message);
  }
}

async function testGoogle() {
  console.log("\n========== GOOGLE (Gemini) ==========");
  const client = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);

  // Test 1: Text only
  console.log("\n1. Testing text message...");
  try {
    const model = client.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent("Say 'test ok' in 2 words");
    console.log("✅ Text: OK -", result.response.text().slice(0, 50));
  } catch (e: any) {
    console.log("❌ Text: FAILED -", e.message);
  }

  // Test 2: Image
  console.log("\n2. Testing image...");
  try {
    const model = client.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent([
      { inlineData: { mimeType: "image/png", data: TEST_IMAGE_BASE64 } },
      { text: "What color is this pixel? Reply in 2 words." }
    ]);
    console.log("✅ Image: OK -", result.response.text().slice(0, 50));
  } catch (e: any) {
    console.log("❌ Image: FAILED -", e.message);
  }

  // Test 3: PDF
  console.log("\n3. Testing PDF...");
  try {
    const model = client.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent([
      { inlineData: { mimeType: "application/pdf", data: TEST_PDF_BASE64 } },
      { text: "What does this PDF say? Reply in 3 words." }
    ]);
    console.log("✅ PDF: OK -", result.response.text().slice(0, 50));
  } catch (e: any) {
    console.log("❌ PDF: FAILED -", e.message);
  }
}

async function testMistral() {
  console.log("\n========== MISTRAL ==========");
  const client = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });

  // Test 1: Text only
  console.log("\n1. Testing text message...");
  try {
    const response = await client.chat.complete({
      model: "mistral-small-latest",
      messages: [{ role: "user", content: "Say 'test ok' in 2 words" }],
    });
    const content = response.choices?.[0]?.message?.content;
    console.log("✅ Text: OK -", typeof content === "string" ? content.slice(0, 50) : "");
  } catch (e: any) {
    console.log("❌ Text: FAILED -", e.message);
  }

  // Test 2: Image
  console.log("\n2. Testing image with Mistral Large...");
  try {
    const response = await client.chat.complete({
      model: "mistral-large-latest",
      messages: [{
        role: "user",
        content: [
          { type: "image_url", imageUrl: `data:image/png;base64,${TEST_IMAGE_BASE64}` },
          { type: "text", text: "What color is this pixel? Reply in 2 words." }
        ]
      }],
    });
    const content = response.choices?.[0]?.message?.content;
    console.log("✅ Image: OK -", typeof content === "string" ? content.slice(0, 50) : "");
  } catch (e: any) {
    console.log("❌ Image: FAILED -", e.message);
  }

  // Test 3: PDF (not supported)
  console.log("\n3. PDF: SKIPPED (Mistral requires separate OCR API for PDFs)");
}

async function main() {
  console.log("🧪 Testing all AI providers...\n");
  console.log("Using env file:", process.env.ANTHROPIC_API_KEY ? "✅ ANTHROPIC_API_KEY set" : "❌ ANTHROPIC_API_KEY missing");
  console.log("Using env file:", process.env.OPENAI_API_KEY ? "✅ OPENAI_API_KEY set" : "❌ OPENAI_API_KEY missing");
  console.log("Using env file:", process.env.GOOGLE_AI_API_KEY ? "✅ GOOGLE_AI_API_KEY set" : "❌ GOOGLE_AI_API_KEY missing");
  console.log("Using env file:", process.env.MISTRAL_API_KEY ? "✅ MISTRAL_API_KEY set" : "❌ MISTRAL_API_KEY missing");

  await testAnthropic();
  await testOpenAI();
  await testGoogle();
  await testMistral();

  console.log("\n\n========== TESTS COMPLETE ==========\n");
}

main().catch(console.error);
