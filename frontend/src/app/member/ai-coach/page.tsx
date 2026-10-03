"use client";

import React, { useState } from "react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  Sparkles,
  Send,
  ShieldAlert,
  Bot,
  User,
  Zap,
  Flame,
  Dumbbell,
  Apple,
  Moon,
} from "lucide-react";

interface ChatMessage {
  sender: "user" | "ai";
  text: string;
  timestamp: string;
}

export default function MemberAiCoachPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      sender: "ai",
      text: "Welcome back, Sarah! I am your contextual Apex AI Fitness Coach. I can analyze your logged attendance (5 visits this week), recent Barbell Bench Press PR (85.0 kg), and current BMI (24.23) to optimize your training splits, recovery protocols, and athletic habits. What would you like to explore today?",
      timestamp: "Just now",
    },
  ]);
  const [inputQuery, setInputQuery] = useState("");
  const [loading, setLoading] = useState(false);

  const promptSuggestions = [
    { label: "4-Day Athletic Split", icon: Dumbbell, query: "Recommend a 4-day upper/lower athletic hypertrophy split." },
    { label: "Macronutrient Guide", icon: Apple, query: "What are my daily protein and hydration targets for muscle growth?" },
    { label: "Recovery Protocol", icon: Moon, query: "How can I accelerate recovery between heavy lifting sessions?" },
    { label: "Progressive Overload", icon: Zap, query: "How should I progress my working weights over the next 4 weeks?" },
  ];

  const handleSend = async (queryToSend?: string) => {
    const text = queryToSend || inputQuery;
    if (!text.trim() || loading) return;

    const userMsg: ChatMessage = {
      sender: "user",
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!queryToSend) setInputQuery("");
    setLoading(true);

    try {
      const data = await api.getAiCoachAdvice(text);
      const aiMsg: ChatMessage = {
        sender: "ai",
        text: data.message,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      const fallbackMsg: ChatMessage = {
        sender: "ai",
        text: "Based on your logged training history, aim for progressive overload with 3-4 working sets per exercise in the 8-12 repetition range. Prioritize 1.8g protein per kg of bodyweight and 8 hours of sleep.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto flex flex-col h-[calc(100vh-8rem)]">
      {/* Header & Medical Disclaimer */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">AI Athletic Conditioning Coach</h1>
          <Badge variant="emerald">Personalized to Your Data</Badge>
        </div>

        {/* Clear Medical Disclaimer */}
        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <span>
            <strong>Medical Notice:</strong> This AI Fitness Coach provides athletic, lifestyle, and exercise educational
            guidance based on your gym activity. It does not provide medical diagnosis and does not substitute for licensed
            physicians, clinical dietitians, or physical therapists.
          </span>
        </div>
      </div>

      {/* Suggestion Chips */}
      <div className="flex flex-wrap gap-2">
        {promptSuggestions.map((s, idx) => {
          const Icon = s.icon;
          return (
            <button
              key={idx}
              onClick={() => handleSend(s.query)}
              className="px-3 py-1.5 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-300 hover:text-emerald-400 flex items-center gap-1.5 transition active:scale-95"
            >
              <Icon className="w-3.5 h-3.5 text-emerald-400" />
              <span>{s.label}</span>
            </button>
          );
        })}
      </div>

      {/* Chat Messages Container */}
      <Card className="glass-card border-slate-800 flex-1 p-4 overflow-y-auto space-y-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex items-start gap-3 ${msg.sender === "user" ? "flex-row-reverse" : ""}`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                msg.sender === "user"
                  ? "bg-slate-800 text-slate-200 border border-slate-700"
                  : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
              }`}
            >
              {msg.sender === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>

            <div
              className={`max-w-2xl rounded-2xl p-4 text-xs leading-relaxed ${
                msg.sender === "user"
                  ? "bg-emerald-500 text-slate-950 font-semibold rounded-tr-none shadow-md shadow-emerald-500/10"
                  : "bg-slate-950/80 border border-slate-800 text-slate-200 rounded-tl-none whitespace-pre-line"
              }`}
            >
              <div>{msg.text}</div>
              <div
                className={`text-[10px] mt-2 text-right ${
                  msg.sender === "user" ? "text-slate-900/70" : "text-slate-500"
                }`}
              >
                {msg.timestamp}
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-slate-950 p-3 rounded-2xl rounded-tl-none border border-slate-800 text-xs text-slate-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span>Analyzing athletic performance data...</span>
            </div>
          </div>
        )}
      </Card>

      {/* Input Box */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="flex gap-2"
      >
        <input
          type="text"
          value={inputQuery}
          onChange={(e) => setInputQuery(e.target.value)}
          placeholder="Ask your coach anything about programming, sets, nutrition, or recovery..."
          className="flex-1 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none transition shadow-inner"
        />
        <Button type="submit" isLoading={loading} className="font-bold shrink-0" rightIcon={<Send className="w-4 h-4" />}>
          Send
        </Button>
      </form>
    </div>
  );
}
