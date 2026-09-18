import { NextRequest, NextResponse } from "next/server";
import { authenticateAgent } from "@/lib/agent-auth";

export async function GET(
  request: NextRequest
) {
  try {

    const agent =
      await authenticateAgent(request);

    return NextResponse.json({
      success: true,
      message: "Agent authentication successful",
      agent,
    });

  } catch (error) {

    console.error(
      "Agent authentication failed:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Authentication failed",
      },
      {
        status: 401,
      }
    );
  }
}