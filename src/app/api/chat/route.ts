import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { getChatResponse } from "@/lib/chat/anthropic";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { messages } = body as { messages: ChatMessage[] };

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Mensajes requeridos" },
        { status: 400 }
      );
    }

    const assistantMessage = await getChatResponse(messages);

    return NextResponse.json({ message: assistantMessage });
  } catch (error) {
    console.error("Error en chat:", error);
    return NextResponse.json(
      { error: "Error al procesar el mensaje" },
      { status: 500 }
    );
  }
}
