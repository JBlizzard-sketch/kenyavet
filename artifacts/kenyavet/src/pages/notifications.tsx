import { useEffect, useState } from "react";
import { Link } from "wouter";
import AppLayout from "@/components/layout/AppLayout";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { Bell, CheckCircle, TrendingUp, CreditCard, AlertCircle, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NotifItem {
  id: number;
  type: string;
  message: string;
  workerName: string | null;
  linkId: number | null;
  readAt: string | null;
  createdAt: string;
}

function formatRelative(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  return new Date(dateStr).toLocaleDateString("en-KE", { day: "numeric", month: "short" });
}

function groupByDate(items: NotifItem[]) {
  const groups: { label: string; items: NotifItem[] }[] = [];
  const labels: Record<string, string> = {};
  for (const item of items) {
    const d = new Date(item.createdAt);
    const now = new Date();
    const key = d.toDateString();
    if (!labels[key]) {
      const diff = Math.floor((now.getTime() - d.getTime()) / 86400000);
      labels[key] = diff === 0 ? "Today" : diff === 1 ? "Yesterday" : d.toLocaleDateString("en-KE", { weekday: "long", day: "numeric", month: "short" });
    }
    let group = groups.find(g => g.label === labels[key]);
    if (!group) { group = { label: labels[key], items: [] }; groups.push(group); }
    group.items.push(item);
  }
  return groups;
}

function NotifIcon({ type }: { type: string }) {
  switch (type) {
    case "report_ready": return <CheckCircle className="w-5 h-5 text-emerald-500" />;
    case "vetting_in_progress": return <TrendingUp className="w-5 h-5 text-blue-500" />;
    case "payment_received": return <CreditCard className="w-5 h-5 text-violet-500" />;
    default: return <AlertCircle className="w-5 h-5 text-muted-foreground" />;
  }
}

const TYPE_LABEL: Record<string, string> = {
  report_ready: "Report Ready",
  vetting_in_progress: "In Progress",
  payment_received: "Payment",
};

export default function Notifications() {
  const { token } = useAuth();
  const [items, setItems] = useState<NotifItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  async function load() {
    try {
      const data = await apiFetch<NotifItem[]>("/dashboard/activity", { token });
      setItems(data);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [token]);

  async function markRead(id: number) {
    try {
      await apiFetch(`/notifications/${id}/read`, { method: "PATCH", token, body: {} });
      setItems(prev => prev.map(i => i.id === id ? { ...i, readAt: new Date().toISOString() } : i));
    } catch {
      toast({ title: "Could not mark as read", variant: "destructive" });
    }
  }

  async function markAllRead() {
    setMarkingAll(true);
    try {
      await apiFetch("/notifications/mark-all-read", { method: "POST", token, body: {} });
      const now = new Date().toISOString();
      setItems(prev => prev.map(i => ({ ...i, readAt: i.readAt ?? now })));
      toast({ title: "All notifications marked as read" });
    } catch {
      toast({ title: "Could not mark all as read", variant: "destructive" });
    } finally {
      setMarkingAll(false);
    }
  }

  const unread = items.filter(i => !i.readAt).length;
  const groups = groupByDate(items);

  return (
    <AppLayout>
      <div className="p-6 max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-serif font-bold text-foreground">Notifications</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {unread > 0 ? `${unread} unread` : "All caught up"} · {items.length} total
            </p>
          </div>
          {unread > 0 && (
            <Button
              size="sm"
              variant="outline"
              className="gap-2 text-xs"
              onClick={markAllRead}
              disabled={markingAll}
            >
              <Check className="w-3.5 h-3.5" />
              {markingAll ? "Marking…" : "Mark all read"}
            </Button>
          )}
        </div>

        {loading ? (
          <div className="py-16 text-center text-muted-foreground text-sm">Loading…</div>
        ) : items.length === 0 ? (
          <div className="py-20 text-center">
            <Bell className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
            <p className="text-foreground font-medium">No notifications yet</p>
            <p className="text-sm text-muted-foreground mt-1">Updates about your vetting requests will appear here.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {groups.map(group => (
              <div key={group.label}>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{group.label}</p>
                <div className="bg-card rounded-xl border border-card-border divide-y divide-border overflow-hidden">
                  {group.items.map(item => (
                    <div
                      key={item.id}
                      className={`flex items-start gap-3 px-4 py-4 transition-colors ${!item.readAt ? "bg-primary/3" : "hover:bg-muted/20"}`}
                    >
                      {/* Unread dot */}
                      <div className="mt-0.5 shrink-0 relative">
                        <NotifIcon type={item.type} />
                        {!item.readAt && (
                          <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-primary rounded-full border-2 border-background" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className={`text-sm leading-snug ${!item.readAt ? "font-medium text-foreground" : "text-foreground/80"}`}>
                          {item.message}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          {item.type in TYPE_LABEL && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                              {TYPE_LABEL[item.type]}
                            </span>
                          )}
                          <span className="text-[10px] text-muted-foreground">{formatRelative(item.createdAt)}</span>
                          {item.linkId && (
                            <Link href={`/vetting-requests/${item.linkId}`}>
                              <span className="text-[10px] text-primary hover:underline cursor-pointer">View request →</span>
                            </Link>
                          )}
                        </div>
                      </div>

                      {!item.readAt && (
                        <button
                          onClick={() => markRead(item.id)}
                          title="Mark as read"
                          className="shrink-0 mt-0.5 text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
