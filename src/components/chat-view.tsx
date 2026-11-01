"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowRight, Bot, MoreVertical, Paperclip, Send } from "lucide-react";
import { useApp } from "@/components/providers";
import { Breadcrumbs } from "@/components/ui";
import { agentReplies, chatSeed, type ChatMessage } from "@/lib/account-data";

function formatTime(t: (text: string) => string) {
  const now = new Date();
  const hours = ((now.getHours() + 11) % 12) + 1;
  const minutes = String(now.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes} ${t(now.getHours() < 12 ? "ص" : "م")}`;
}

export function ChatView() {
  const { t } = useApp();
  const [messages, setMessages] = useState<ChatMessage[]>(chatSeed);
  const [draft, setDraft] = useState("");
  const [attachment, setAttachment] = useState<string | null>(null);
  const [dayLabel] = useState(() => `${t("اليوم")} - ${formatTime(t)}`);
  const fileRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const replyIndex = useRef(0);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  const send = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    const time = formatTime(t);
    setMessages((current) => [
      ...current,
      {
        id: `u-${Date.now()}`,
        from: "user",
        text: attachment ? `📎 ${attachment} , ${text}` : text,
        time,
      },
    ]);
    setDraft("");
    setAttachment(null);
    const reply = agentReplies[replyIndex.current % agentReplies.length];
    replyIndex.current += 1;
    setTimeout(() => {
      setMessages((current) => [
        ...current,
        { id: `a-${Date.now()}`, from: "agent", text: reply, time: formatTime(t) },
      ]);
    }, 1200);
  };

  return (
    <div className="pb-10">
      <div className="shell">
        <div className="hidden pt-6 lg:block">
          <Breadcrumbs
            items={[
              { label: "الرئيسية", href: "/" },
              { label: "حسابي", href: "/profile" },
              { label: "الدعم الفني", href: "/help/chat" },
            ]}
          />
        </div>

        <div className="mx-auto max-w-[640px] px-4 pt-6 lg:max-w-3xl lg:px-0">
          <div className="relative lg:mt-6 lg:rounded-[28px] lg:bg-cream-50 lg:p-8 lg:shadow-soft">
            <Link
              href="/help"
              aria-label={t("رجوع")}
              className="absolute start-6 top-6 hidden size-12 place-items-center rounded-full border border-line bg-white text-ink transition hover:text-brand lg:grid"
            >
              <ArrowRight className="size-5 ltr:rotate-180" strokeWidth={2.2} />
            </Link>

            <div className="card flex items-center gap-3 p-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-peach text-ink">
                <MoreVertical className="size-5" strokeWidth={2.2} />
              </span>
              <div className="min-w-0 flex-1 text-start">
                <h1 className="truncate text-base font-extrabold lg:text-lg">{t("الدعم الفني")}</h1>
                <p className="text-xs font-bold text-success">{t("متصل حاليا")}</p>
              </div>
              <span className="grid size-12 shrink-0 place-items-center rounded-full bg-brand text-white shadow-[0_14px_26px_-14px_rgba(232,69,44,0.9)]">
                <Bot className="size-6" strokeWidth={1.9} />
              </span>
              <Link
                href="/help"
                aria-label={t("رجوع")}
                className="grid size-10 shrink-0 place-items-center rounded-full bg-peach text-ink transition hover:bg-brand-soft lg:hidden"
              >
                <ArrowRight className="size-5 ltr:rotate-180" strokeWidth={2.2} />
              </Link>
            </div>

            <div className="mt-6 flex justify-center">
              <span className="rounded-full bg-white px-5 py-2.5 text-xs font-bold text-muted shadow-soft">
                {dayLabel}
              </span>
            </div>

            <div className="mt-6 space-y-4">
              {messages.map((message) =>
                message.from === "agent" ? (
                  <div key={message.id} className="flex items-end justify-start gap-2">
                    <div className="max-w-[82%] rounded-2xl bg-white p-4 shadow-soft">
                      <p className="text-sm font-semibold leading-7">{t(message.text)}</p>
                      <span className="mt-1 block text-end text-[11px] text-muted">{message.time}</span>
                    </div>
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand text-white">
                      <Bot className="size-4" strokeWidth={2} />
                    </span>
                  </div>
                ) : (
                  <div key={message.id} className="flex justify-end">
                    <div className="max-w-[82%] rounded-2xl bg-brand p-4 text-white shadow-[0_18px_32px_-20px_rgba(232,69,44,0.9)]">
                      <p className="text-sm font-semibold leading-7">{t(message.text)}</p>
                      <span className="mt-1 block text-start text-[11px] text-white/70">{message.time}</span>
                    </div>
                  </div>
                ),
              )}
              <div ref={bottomRef} />
            </div>

            <form onSubmit={send} className="mt-6 flex items-center gap-2 rounded-full bg-white p-2 shadow-soft">
              <button
                type="button"
                aria-label={t("إرفاق صورة")}
                onClick={() => fileRef.current?.click()}
                className="grid size-10 shrink-0 place-items-center rounded-full bg-peach text-ink transition hover:bg-brand-soft"
              >
                <Paperclip className="size-5" strokeWidth={2} />
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) setAttachment(file.name);
                  event.target.value = "";
                }}
              />
              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder={attachment ? attachment : t("اكتب رسالتك...")}
                aria-label={t("اكتب رسالتك...")}
                className="min-w-0 flex-1 bg-transparent px-1 text-sm outline-none"
              />
              <button
                type="submit"
                aria-label={t("إرسال")}
                className="grid size-11 shrink-0 place-items-center rounded-full bg-brand text-white shadow-[0_14px_24px_-14px_rgba(232,69,44,0.9)] transition hover:bg-brand-dark active:scale-95"
              >
                <Send className="size-5 rtl:rotate-180" strokeWidth={2} />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
