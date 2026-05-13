import { NextRequest } from "next/server";
import { registerUser } from "@/lib/register";
import { handleApiError } from "@/lib/errors";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const user = await registerUser(body);
    return Response.json({ user }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
