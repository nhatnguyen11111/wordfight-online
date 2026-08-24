"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, Send, MessageCircle, Users, Sparkles } from "lucide-react";
import { useGame } from "@/lib/game-context";
import { sounds } from "@/lib/sound-effects";
import { supabase, isSupabaseConfigured, SupabaseService } from "@/lib/supabase";
import { RealtimeChannel } from "@supabase/supabase-js";

interface ChatMessage {
  id: string;
  sender: string;
  avatarColor: string;
  text: string;
  time: string;
}

const DEFAULT_WELCOME_MESSAGES: ChatMessage[] = [
  { id: "1", sender: "Minh Quân", avatarColor: "from-blue-400 to-indigo-600", text: "Ai vào phòng solo nối từ tiếng Việt không?", time: "14:20" },
  { id: "2", sender: "Linh Đan", avatarColor: "from-purple-400 to-pink-600", text: "Vừa phá đảo xong màn 25 Vua Tiếng Việt, câu cuối hay quá 😂", time: "14:22" },
  { id: "3", sender: "Admin WordFight", avatarColor: "from-amber-400 to-orange-600", text: "Chào mừng các chiến binh đến với Kênh Chat Toàn Cầu WordFight!", time: "14:28" },
];

export function GlobalChatDrawer() {
  const { profile, activeModal, closeModal } = useGame();
  const [messages, setMessages] = useState<ChatMessage[]>(DEFAULT_WELCOME_MESSAGES);
  const [inputText, setInputText] = useState("");
  const [onlineCount, setOnlineCount] = useState<number>(1);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load chat history and connect Supabase Realtime Channel
  useEffect(() => {
    let isMounted = true;

    // 1. Fetch DB Chat History
    SupabaseService.fetchGlobalChatMessages(50).then((dbMsgs) => {
      if (isMounted && dbMsgs.length > 0) {
        setMessages(dbMsgs);
      }
    });

    if (!isSupabaseConfigured()) return;

    // 2. Connect to Supabase Realtime Broadcast & Presence Channel
    const channel = supabase.channel("global_community_chat", {
      config: {
        presence: { key: profile.id || String(Date.now()) },
        broadcast: { self: false },
      },
    });

    channelRef.current = channel;

    // Handle incoming live broadcast messages
    channel.on("broadcast", { event: "new_global_message" }, ({ payload }) => {
      if (payload && isMounted) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === payload.id)) return prev;
          return [...prev, payload];
        });
        sounds.playClick();
      }
    });

    // Handle presence (count online chatters)
    const handlePresence = () => {
      const state = channel.presenceState();
      const count = Object.keys(state).length;
      if (isMounted) {
        setOnlineCount(Math.max(count, 1));
      }
    };

    channel.on("presence", { event: "sync" }, handlePresence);
    channel.on("presence", { event: "join" }, handlePresence);
    channel.on("presence", { event: "leave" }, handlePresence);

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.track({
          id: profile.id,
          nickname: profile.nickname,
          avatarColor: profile.avatarColor,
        });
      }
    });

    return () => {
      isMounted = false;
      channel.unsubscribe();
    };
  }, [profile.id, profile.nickname, profile.avatarColor]);

  if (activeModal !== "globalChat") return null;

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const textToSend = inputText.trim();
    setInputText("");

    const newMsg: ChatMessage = {
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      sender: profile.nickname || "Chiến Binh",
      avatarColor: profile.avatarColor || "from-emerald-400 to-green-600",
      text: textToSend,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    // 1. Optimistically append locally
    setMessages((prev) => [...prev, newMsg]);
    sounds.playClick();

    // 2. Broadcast to all online users via Supabase Realtime
    channelRef.current?.send({
      type: "broadcast",
      event: "new_global_message",
      payload: newMsg,
    });

    // 3. Persist to Supabase Database
    try {
      await SupabaseService.sendGlobalChatMessage(
        profile.nickname || "Chiến Binh",
        profile.avatarColor || "from-emerald-400 to-green-600",
        textToSend,
        profile.id
      );
    } catch (err) {
      console.warn("[GlobalChat] Error saving message to DB:", err);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md h-full bg-background border-l border-primary/20 p-5 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border/50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 text-primary shadow-inner">
              <MessageCircle className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-foreground">Kênh Chat Toàn Cầu</h2>
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 text-[10px] font-black border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live 🟢
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                <span>Trò chuyện trực tiếp cùng mọi người</span>
                <span>•</span>
                <span className="font-bold text-primary flex items-center gap-0.5">
                  <Users className="h-3 w-3 inline" /> {onlineCount} online
                </span>
              </p>
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
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${
                    msg.avatarColor || "from-emerald-400 to-green-600"
                  } text-white font-black text-xs shadow-sm`}
                >
                  {msg.sender[0]}
                </div>
                <div className={`max-w-[78%] ${isMe ? "items-end" : "items-start"} flex flex-col`}>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[11px] font-bold text-foreground">{msg.sender}</span>
                    <span className="text-[9px] text-muted-foreground opacity-70">{msg.time}</span>
                  </div>
                  <div
                    className={`px-4 py-2 rounded-2xl text-xs font-medium leading-relaxed shadow-sm ${
                      isMe
                        ? "bg-primary text-primary-foreground rounded-tr-none font-semibold"
                        : "bg-muted/70 text-foreground border border-border/60 rounded-tl-none"
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input bar */}
        <form onSubmit={handleSendMessage} className="pt-3 border-t border-border/50 flex gap-2 shrink-0">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Nhắn tin trực tiếp vào kênh cộng đồng..."
            maxLength={200}
            className="flex-1 h-11 px-4 rounded-2xl border-2 border-border/80 bg-muted/30 text-xs font-medium text-foreground focus:border-primary focus:outline-none transition-colors"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="btn-wf-primary h-11 w-11 rounded-2xl flex items-center justify-center text-primary-foreground disabled:opacity-50 disabled:pointer-events-none cursor-pointer shadow-md"
          >
            <Send className="h-4 w-4 stroke-[2.5]" />
          </button>
        </form>
      </div>
    </div>
  );
}
