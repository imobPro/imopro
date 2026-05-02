import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;

  const supabase = await createClient();

  // getUser valida o JWT contra o servidor de auth (não confia só no cookie).
  // Recomendação oficial do Supabase para uso server-side. getSession() puro
  // aceitaria cookies adulterados até a expiração.
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  // Sessão validada — agora podemos pegar o access_token para repassar ao backend.
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: "Sessão indisponível" }, { status: 401 });
  }

  const backendUrl = process.env.BACKEND_URL ?? "http://localhost:3000";
  const upstream = await fetch(`${backendUrl}/api/reports/${id}/download`, {
    headers: { Authorization: `Bearer ${session.access_token}` },
    cache: "no-store",
  });

  if (!upstream.ok) {
    const text = await upstream.text().catch(() => "");
    return NextResponse.json(
      { error: text || `Backend respondeu ${upstream.status}` },
      { status: upstream.status },
    );
  }

  const arrayBuffer = await upstream.arrayBuffer();
  return new NextResponse(arrayBuffer, {
    status: 200,
    headers: {
      "Content-Type":
        upstream.headers.get("Content-Type") ?? "application/pdf",
      "Content-Disposition":
        upstream.headers.get("Content-Disposition") ?? "attachment",
    },
  });
}
