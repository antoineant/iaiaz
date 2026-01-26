import { NextResponse } from "next/server";

// This endpoint is deprecated as of trainer credit simplification.
// Trainers now draw directly from the org pool without needing transfers.

export async function POST() {
  return NextResponse.json(
    {
      error: "Credit transfers deprecated. Trainers now use organization credits directly.",
      deprecated: true,
    },
    { status: 410 }
  );
}

export async function GET() {
  return NextResponse.json(
    {
      error: "Credit transfers deprecated. Trainers now use organization credits directly.",
      deprecated: true,
      can_transfer: false,
    },
    { status: 410 }
  );
}
