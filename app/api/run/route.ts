import { NextResponse } from "next/server";
import { userClient } from "@/lib/server";
import { runModule } from "@/lib/modules";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { projectId, module } = await req.json();
    const data = await runModule(userClient(req), projectId, module);
    return NextResponse.json({ data });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}