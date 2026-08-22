"use client";

import React, { useState, useEffect } from "react";
import { X, Send, MessageCircle } from "lucide-react";
import { useGame } from "@/lib/game-context";
import { sounds } from "@/lib/sound-effects";
import { getSocket } from "@/lib/socket-client";

interface ChatMessage {
  id: string;
  sender: string;
  avatarColor: string;
  text: string;
  time: string;
}

const INITIAL_MESSAGES: ChatMessage[] = [
  { id: "1", sender: "Minh Quân", avatarColor: "from-blue-400 to-indigo-600", text: "Ai vào phòng solo nối từ tiếng Việt không?", time: "14:20" },
  { id: "2", sender: "Linh Đan", avatarColor: "from-purple-400 to-pink-600", text: "Vừa phá đảo xong màn 25 Vua Tiếng Việt, câu cuối hay quá 😂", time: "14:22" },
  { id: "3", sender: "Admin WordFight", avatarColor: "from-amber-400 to-orange-600", text: "Chào mừng các chiến binh đến với đấu trường WordFight Real-time!", time: "14:28" },
];

export function GlobalChatDrawer() {
  const { profile, activeModal, closeModal } = useGame();
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [inputText, setInputText] = useState("");

  // Listen to live socket messages
  useEffect(() => {
    if (typeof window === "undefined") return;
    const socket = getSocket();

    const handleNewMessage = (msg: ChatMessage) => {
      setMessages((prev) => {
        // Prevent duplicate IDs
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      sounds.playClick();
    };

    socket.on("chat:global:message", handleNewMessage);

    return () => {
      socket.off("chat:global:message", handleNewMessage);
    };
  }, []);

  if (activeModal !== "globalChat") return null;

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const socket = getSocket();
    const payload = {
      sender: profile.nickname,
      avatarColor: profile.avatarColor,
      text: inputText.trim(),
    };

    // Emit live global chat message
    socket.emit("chat:global:send", payload);

    setInputText("");
    sounds.playClick();
  };

  return (
    <div className="fixed inset-0 z-[200] flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md h-full bg-background border-l border-primary/20 p-5 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border/50 shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/20 text-primary">
              <MessageCircle className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-foreground">Kênh Chat Toàn Cầu (Live 🟢)</h2>
              <p className="text-[11px] text-muted-foreground">Trò chuyện trực tiếp cùng mọi người chơi</p>
            </div>
          </div>
          <button
            onClick={closeModal}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-muted/60 text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Message Feed */}
        <div className="wordfight-scrollbar flex-1 overflow-y-auto py-4 space-y-3.5 pr-1">
          {messages.map((msg) => {
            const isMe = msg.sender === profile.nickname;
            return (
              <div key={msg.id} className={`flex gap-2.5 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${msg.avatarColor || "from-emerald-400 to-green-600"} text-white font-bold text-xs shadow-sm`}
                >
                  {msg.sender[0]}
                </div>
                <div className={`max-w-[75%] ${isMe ? "items-end" : "items-start"} flex flex-col`}>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[11px] font-bold text-foreground">{msg.sender}</span>
                    <span className="text-[9px] text-muted-foreground">{msg.time}</span>
                  </div>
                  <div
                    className={`px-3.5 py-2 rounded-2xl text-xs font-medium leading-relaxed ${
                      isMe
                        ? "bg-primary text-primary-foreground rounded-tr-none"
                        : "bg-muted/70 text-foreground border border-border/50 rounded-tl-none"
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Input bar */}
        <form onSubmit={handleSendMessage} className="pt-3 border-t border-border/50 flex gap-2 shrink-0">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Nhắn tin trực tiếp vào kênh cộng đồng..."
            maxLength={150}
            className="flex-1 h-11 px-4 rounded-2xl border-2 border-border/80 bg-muted/30 text-xs font-medium focus:border-primary focus:outline-none transition-colors"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="btn-wf-primary h-11 w-11 rounded-2xl flex items-center justify-center text-primary-foreground disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
