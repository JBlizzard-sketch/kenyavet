import { useState, useEffect, useRef, useCallback } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { apiFetch, API_BASE } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Link } from "wouter";
import {
  MessageSquare, ExternalLink, Send, ChevronLeft,
  User, Clock, RefreshCw,
} from "lucide-react";

interface Thread {
  requestId: number;
  workerName: string;
  workerRole: string;
  requestStatus: string;
  employerName: string;
  employerId: number;
  lastMessageBody: string;
  lastMessageSender: string;
  lastMessageRole: string;
  lastMessageAt: string;
  unreadCount: number;
  totalMessages: number;
}

interface Message {
  id: number;
  requestId: number;
  userId: number;
  role: string;
  senderName: string;
  body: string;
  isRead: boolean;
  createdAt: string;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(iso).toLocaleDateString("en-KE", { day: "numeric", month: "short" });
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    pending: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
    in_review: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    completed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
    rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  };
  const label: Record<string, string> = {
    pending: "Pending", in_review: "In Review", completed: "Completed", rejected: "Rejected",
  };
  return (
    <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full uppercase tracking-wide", map[status] ?? "bg-muted text-muted-foreground")}>
      {label[status] ?? status}
    </span>
  );
}

export default function Messages() {
  const { user } = useAuth();
  const isEmployer = user?.role === "employer";

  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [msgLoading, setMsgLoading] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [showThread, setShowThread] = useState(false); // mobile: show thread panel
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadThreads = useCallback(async () => {
    try {
      const data = await apiFetch<{ threads: Thread[] }>("/messages/threads");
      setThreads(data.threads);
    } catch {
      toast({ title: "Could not load message threads", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadThreads(); }, [loadThreads]);

  const loadMessages = useCallback(async (requestId: number) => {
    setMsgLoading(true);
    try {
      const data = await apiFetch<{ messages: Message[] }>(`/vetting-requests/${requestId}/messages`);
      setMessages(data.messages);
      // Mark as read (fire and forget)
      const hasUnread = data.messages.some(m =>
        !m.isRead && (isEmployer ? m.role !== "employer" : m.role === "employer")
      );
      if (hasUnread) {
        apiFetch(`/vetting-requests/${requestId}/messages/read`, { method: "PATCH" })
          .then(() => {
            // Update local thread unread count
            setThreads(prev => prev.map(t =>
              t.requestId === requestId ? { ...t, unreadCount: 0 } : t
            ));
          })
          .catch(() => {});
      }
    } catch {
      toast({ title: "Could not load messages", variant: "destructive" });
    } finally {
      setMsgLoading(false);
    }
  }, [isEmployer]);

  useEffect(() => {
    if (activeId !== null) {
      loadMessages(activeId);
      setShowThread(true);
    }
  }, [activeId, loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage() {
    if (!draft.trim() || activeId === null) return;
    setSending(true);
    try {
      const msg = await apiFetch<Message>(`/vetting-requests/${activeId}/messages`, {
        method: "POST",
        body: { body: draft.trim() },
      });
      setMessages(prev => [...prev, msg]);
      setDraft("");
      // Update thread last message
      setThreads(prev => prev.map(t =>
        t.requestId === activeId
          ? { ...t, lastMessageBody: msg.body, lastMessageSender: msg.senderName, lastMessageAt: msg.createdAt, lastMessageRole: msg.role }
          : t
      ).sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()));
    } catch {
      toast({ title: "Failed to send message", variant: "destructive" });
    } finally {
      setSending(false);
    }
  }

  const activeThread = threads.find(t => t.requestId === activeId);

  return (
    <AppLayout title="Messages" subtitle="Communicate with the KenyaVet team about your requests">
      <div className="h-[calc(100vh-7rem)] flex rounded-xl border border-border overflow-hidden bg-background shadow-sm">

        {/* Thread list */}
        <div className={cn(
          "w-full lg:w-80 xl:w-96 border-r border-border flex flex-col shrink-0",
          showThread ? "hidden lg:flex" : "flex"
        )}>
          {/* Header */}
          <div className="px-4 py-3.5 border-b border-border flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Inbox</h2>
              <p className="text-xs text-muted-foreground">
                {threads.length} conversation{threads.length !== 1 ? "s" : ""}
              </p>
            </div>
            <button
              onClick={loadThreads}
              className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              title="Refresh"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto divide-y divide-border">
            {loading ? (
              <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
                Loading…
              </div>
            ) : threads.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 gap-3 px-6 text-center">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">No conversations yet.</p>
                {isEmployer && (
                  <p className="text-xs text-muted-foreground">
                    Messages will appear here once you submit a vetting request.
                  </p>
                )}
              </div>
            ) : (
              threads.map(t => (
                <button
                  key={t.requestId}
                  onClick={() => setActiveId(t.requestId)}
                  className={cn(
                    "w-full text-left px-4 py-3.5 hover:bg-muted/40 transition-colors",
                    activeId === t.requestId && "bg-primary/5 border-l-2 border-l-primary"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <span className={cn(
                          "text-sm truncate",
                          t.unreadCount > 0 ? "font-semibold text-foreground" : "font-medium text-foreground/80"
                        )}>
                          {t.workerName}
                        </span>
                        <span className="text-[10px] text-muted-foreground shrink-0">{timeAgo(t.lastMessageAt)}</span>
                      </div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-xs text-muted-foreground truncate">{t.workerRole}</span>
                        <span className="text-muted-foreground/40">·</span>
                        {statusBadge(t.requestStatus)}
                      </div>
                      {!isEmployer && (
                        <div className="text-[11px] text-muted-foreground/70 mb-1 truncate">
                          {t.employerName}
                        </div>
                      )}
                      <div className="flex items-center justify-between gap-2">
                        <p className={cn(
                          "text-xs truncate",
                          t.unreadCount > 0 ? "text-foreground font-medium" : "text-muted-foreground"
                        )}>
                          <span className="text-muted-foreground/60">{t.lastMessageSender.split(" ")[0]}: </span>
                          {t.lastMessageBody}
                        </p>
                        {t.unreadCount > 0 && (
                          <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold shrink-0">
                            {t.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Thread view */}
        <div className={cn(
          "flex-1 flex flex-col min-w-0",
          !showThread ? "hidden lg:flex" : "flex"
        )}>
          {activeThread ? (
            <>
              {/* Thread header */}
              <div className="px-4 py-3 border-b border-border flex items-center gap-3 shrink-0">
                <button
                  className="lg:hidden p-1.5 rounded-md hover:bg-muted text-muted-foreground"
                  onClick={() => { setShowThread(false); setActiveId(null); }}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-foreground truncate">{activeThread.workerName}</h3>
                    <span className="text-muted-foreground/40 text-xs">·</span>
                    <span className="text-xs text-muted-foreground">{activeThread.workerRole}</span>
                    {statusBadge(activeThread.requestStatus)}
                  </div>
                  {!isEmployer && (
                    <p className="text-xs text-muted-foreground mt-0.5">Client: {activeThread.employerName}</p>
                  )}
                </div>
                <Link
                  href={`/vetting-requests/${activeThread.requestId}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span className="hidden sm:inline">View Request</span>
                </Link>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                {msgLoading ? (
                  <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">Loading…</div>
                ) : messages.length === 0 ? (
                  <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">No messages yet.</div>
                ) : (
                  messages.map((m, i) => {
                    const isOwn = isEmployer
                      ? m.role === "employer"
                      : m.role !== "employer";
                    const showName = i === 0 || messages[i - 1].role !== m.role;
                    return (
                      <div key={m.id} className={cn("flex flex-col", isOwn ? "items-end" : "items-start")}>
                        {showName && (
                          <span className="text-[10px] text-muted-foreground mb-1 px-1">
                            {m.senderName}
                          </span>
                        )}
                        <div className={cn(
                          "max-w-[75%] sm:max-w-[60%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed",
                          isOwn
                            ? "bg-primary text-primary-foreground rounded-br-md"
                            : "bg-muted text-foreground rounded-bl-md"
                        )}>
                          {m.body}
                        </div>
                        <div className="flex items-center gap-1 mt-0.5 px-1">
                          <Clock className="w-2.5 h-2.5 text-muted-foreground/50" />
                          <span className="text-[10px] text-muted-foreground/60">{timeAgo(m.createdAt)}</span>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={bottomRef} />
              </div>

              {/* Compose */}
              <div className="px-4 py-3 border-t border-border shrink-0">
                <div className="flex items-end gap-2 bg-muted/40 rounded-xl border border-border px-3 py-2">
                  <textarea
                    className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground resize-none outline-none min-h-[36px] max-h-32 leading-relaxed"
                    placeholder="Type a message… (Enter to send, Shift+Enter for new line)"
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    rows={1}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!draft.trim() || sending}
                    className="p-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-8">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
                <MessageSquare className="w-7 h-7 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground mb-1">Select a conversation</h3>
                <p className="text-sm text-muted-foreground max-w-xs">
                  Choose a thread from the left panel to read and reply to messages.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
