"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { X, Send, Trash2, RefreshCw } from "lucide-react";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  error?: boolean;
}

const WELCOME_MESSAGE: ChatMessage = {
  role: "assistant",
  content: "Hola, soy Maq. ¿En qué te puedo ayudar?",
  timestamp: Date.now(),
};

// Markdown básico: **bold**, *italic*, listas (- item), `code`
function renderMarkdown(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, '<code class="bg-gray-200 px-1 rounded text-sm">$1</code>')
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
    .replace(/\n/g, "<br />");
}

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const hasInitialized = useRef(false);

  // Load conversation from API on mount
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    async function loadConversation() {
      try {
        const res = await fetch("/api/chat/conversaciones?activa=true&limit=1");
        if (!res.ok) throw new Error();

        const data = await res.json();
        const convs = data.conversaciones;

        if (convs && convs.length > 0) {
          const conv = convs[0];
          setConversationId(conv.id);

          // Load messages
          const msgRes = await fetch(`/api/chat/conversaciones/${conv.id}`);
          if (msgRes.ok) {
            const msgData = await msgRes.json();
            const loaded: ChatMessage[] = msgData.conversacion.mensajes.map(
              (m: { role: string; content: string; createdAt: string }) => ({
                role: m.role === "USER" ? "user" : "assistant",
                content: m.content,
                timestamp: new Date(m.createdAt).getTime(),
              })
            );
            setMessages(loaded.length > 0 ? loaded : [WELCOME_MESSAGE]);
          } else {
            setMessages([WELCOME_MESSAGE]);
          }
        } else {
          setMessages([WELCOME_MESSAGE]);
        }
      } catch {
        setMessages([WELCOME_MESSAGE]);
      } finally {
        setLoadingHistory(false);
      }
    }

    loadConversation();
  }, []);

  // Scroll al último mensaje
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Focus input al abrir
  useEffect(() => {
    if (isOpen) {
      setHasNewMessage(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Escape para cerrar
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen]);

  const sendMessage = useCallback(async (retryContent?: string) => {
    const content = retryContent || input.trim();
    if (!content || isLoading) return;

    const userMessage: ChatMessage = {
      role: "user",
      content,
      timestamp: Date.now(),
    };

    const newMessages = retryContent
      ? [...messages.filter((m) => !m.error), userMessage]
      : [...messages, userMessage];

    setMessages(newMessages);
    if (!retryContent) setInput("");
    setIsLoading(true);

    try {
      let data: { respuesta: string; conversacionId?: string; conversacion?: { id: string } };

      if (!conversationId) {
        // Create new conversation
        const res = await fetch("/api/chat/conversaciones", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mensaje: content }),
        });

        if (!res.ok) throw new Error("Error del servidor");
        data = await res.json();
        setConversationId(data.conversacion?.id || null);
      } else {
        // Send to existing conversation
        const res = await fetch(`/api/chat/conversaciones/${conversationId}/mensajes`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mensaje: content }),
        });

        if (!res.ok) throw new Error("Error del servidor");
        data = await res.json();

        // If conversation was rotated (100+ messages)
        if (data.conversacionId && data.conversacionId !== conversationId) {
          setConversationId(data.conversacionId);
        }
      }

      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: data.respuesta,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      if (!isOpen) {
        setHasNewMessage(true);
      }
    } catch {
      const errorMessage: ChatMessage = {
        role: "assistant",
        content: "No pude procesar tu mensaje. Verifica tu conexión e intenta de nuevo.",
        timestamp: Date.now(),
        error: true,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages, isOpen, conversationId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearConversation = async () => {
    if (conversationId) {
      try {
        await fetch(`/api/chat/conversaciones/${conversationId}`, {
          method: "DELETE",
        });
      } catch {
        // ignore — still clear locally
      }
    }
    setConversationId(null);
    setMessages([WELCOME_MESSAGE]);
  };

  return (
    <>
      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-96 h-[70vh] sm:h-[500px] flex flex-col bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-[#092139] text-white flex-shrink-0">
            <div className="flex items-center gap-2">
              <img
                src="/images/maq-icon.png"
                alt="Maq"
                className="w-8 h-8 rounded-full"
              />
              <div>
                <p className="font-semibold text-sm">Maq</p>
                <p className="text-xs text-gray-300">IA de ayuda</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={clearConversation}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                title="Limpiar conversación"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {loadingHistory ? (
              <div className="space-y-3">
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-3 w-3/4 animate-pulse h-10" />
                </div>
                <div className="flex justify-end">
                  <div className="bg-[#31A7D4]/30 rounded-2xl rounded-br-md px-4 py-3 w-2/3 animate-pulse h-8" />
                </div>
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-3 w-4/5 animate-pulse h-12" />
                </div>
              </div>
            ) : (
              messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-[#31A7D4] text-white rounded-br-md"
                        : msg.error
                        ? "bg-red-50 text-red-700 border border-red-200 rounded-bl-md"
                        : "bg-gray-100 text-gray-900 rounded-bl-md"
                    }`}
                  >
                    <div
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
                    />
                    {msg.error && (
                      <button
                        onClick={() => {
                          const lastUserMsg = messages
                            .slice(0, i)
                            .filter((m) => m.role === "user")
                            .pop();
                          if (lastUserMsg) {
                            sendMessage(lastUserMsg.content);
                          }
                        }}
                        className="mt-2 flex items-center gap-1 text-xs text-red-600 hover:text-red-800 font-medium"
                      >
                        <RefreshCw className="w-3 h-3" />
                        Reintentar
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}

            {/* Typing indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 px-4 py-3 rounded-2xl rounded-bl-md">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-gray-200 flex-shrink-0">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Escribe tu pregunta..."
                disabled={isLoading || loadingHistory}
                className="flex-1 px-4 py-2.5 rounded-full border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#31A7D4] focus:border-transparent disabled:opacity-50"
              />
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || isLoading || loadingHistory}
                className="w-10 h-10 bg-[#31A7D4] hover:bg-[#2891ba] disabled:opacity-50 disabled:hover:bg-[#31A7D4] text-white rounded-full flex items-center justify-center transition-colors flex-shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-[#31A7D4] hover:bg-[#2891ba] text-white rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center"
      >
        {isOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <>
            <img src="/images/maq-icon.png" alt="Maq" className="w-8 h-8 rounded-full" />
            {hasNewMessage && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#D57828] rounded-full border-2 border-white" />
            )}
          </>
        )}
      </button>
    </>
  );
}
