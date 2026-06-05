import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST() {
  return NextResponse.json(
    {
      ok: true,
      disabled: true
    },
    {
      headers: {
        "Cache-Control": "no-store"
      }
    }
  );
}
