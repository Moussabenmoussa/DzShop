"use client";

import { useChat, type UIMessage } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  ContentTypeSelector,
  type ContentType,
} from "@/components/content-type-selector";
import {
  Send,
  Sparkles,
  Copy,
  Check,
  RefreshCw,
  User,
  Bot,
  ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

function getUIMessageText(msg: UIMessage): string {
  if (!msg.parts || !Array.isArray(msg.parts)) return "";
  return msg.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
}

export function ChatInterface() {
  const [selectedType, setSelectedType] = useState<ContentType | null>(null);
  const [input, setInput] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status, setMessages } = useChat({
    transport: new DefaultChatTransport({ api: "/api/generate" }),
  });

  const isLoading = status === "streaming" || status === "submitted";

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleTypeSelect = (type: ContentType, prompt: string) => {
    setSelectedType(type);
    setMessages([]);
    sendMessage({ text: prompt });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage({ text: input });
    setInput("");
  };

  const handleCopy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleReset = () => {
    setSelectedType(null);
    setMessages([]);
    setInput("");
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-border bg-card">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent">
              <Sparkles className="h-4 w-4 text-accent-foreground" />
            </div>
            <span className="text-lg font-bold">KatibAI</span>
          </div>
        </div>
        {selectedType && (
          <Button variant="ghost" size="sm" onClick={handleReset}>
            <RefreshCw className="h-4 w-4 mr-2" />
            New Content
          </Button>
        )}
      </header>

      <main className="flex-1 overflow-hidden">
        {!selectedType ? (
          <div className="h-full flex flex-col items-center justify-center p-4 sm:p-6">
            <div className="max-w-2xl w-full">
              <div className="text-center mb-8">
                <h1 className="text-2xl sm:text-3xl font-bold mb-2">
                  What would you like to create?
                </h1>
                <p className="text-muted-foreground">
                  Choose a content type to get started
                </p>
              </div>
              <ContentTypeSelector
                selected={selectedType}
                onSelect={handleTypeSelect}
              />
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col">
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
              {messages.map((message) => {
                const text = getUIMessageText(message);
                const isUser = message.role === "user";

                return (
                  <div
                    key={message.id}
                    className={cn(
                      "flex gap-4 animate-fade-in",
                      isUser ? "justify-end" : "justify-start"
                    )}
                  >
                    {!isUser && (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent">
                        <Bot className="h-4 w-4 text-accent-foreground" />
                      </div>
                    )}
                    <div
                      className={cn(
                        "max-w-[80%] rounded-2xl p-4",
                        isUser
                          ? "bg-accent text-accent-foreground"
                          : "bg-card border border-border"
                      )}
                    >
                      <div className="whitespace-pre-wrap text-sm leading-relaxed">
                        {text}
                      </div>
                      {!isUser && text && (
                        <div className="mt-3 pt-3 border-t border-border/50 flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopy(text, message.id)}
                            className="h-8 text-xs"
                          >
                            {copiedId === message.id ? (
                              <>
                                <Check className="h-3 w-3 mr-1" />
                                Copied
                              </>
                            ) : (
                              <>
                                <Copy className="h-3 w-3 mr-1" />
                                Copy
                              </>
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                    {isUser && (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary">
                        <User className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                );
              })}

              {isLoading && messages.length > 0 && (
                <div className="flex gap-4 justify-start animate-fade-in">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent">
                    <Bot className="h-4 w-4 text-accent-foreground" />
                  </div>
                  <div className="bg-card border border-border rounded-2xl p-4">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-accent animate-pulse" />
                      <div
                        className="h-2 w-2 rounded-full bg-accent animate-pulse"
                        style={{ animationDelay: "0.2s" }}
                      />
                      <div
                        className="h-2 w-2 rounded-full bg-accent animate-pulse"
                        style={{ animationDelay: "0.4s" }}
                      />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 sm:p-6 border-t border-border bg-card">
              <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
                <div className="flex gap-3">
                  <Textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Describe what you need..."
                    className="min-h-[60px] max-h-[200px] resize-none"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmit(e);
                      }
                    }}
                  />
                  <Button
                    type="submit"
                    variant="accent"
                    size="icon"
                    className="h-[60px] w-[60px] shrink-0"
                    disabled={isLoading || !input.trim()}
                  >
                    <Send className="h-5 w-5" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground text-center mt-3">
                  Press Enter to send, Shift + Enter for new line
                </p>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
