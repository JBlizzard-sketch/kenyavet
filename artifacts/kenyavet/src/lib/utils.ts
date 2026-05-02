import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getTrustScoreColor(score: number | null | undefined) {
  if (score == null) return "text-muted-foreground";
  if (score >= 80) return "text-emerald-600";
  if (score >= 60) return "text-amber-600";
  return "text-red-600";
}

export function getTrustScoreBg(score: number | null | undefined) {
  if (score == null) return "bg-muted text-muted-foreground";
  if (score >= 80) return "bg-emerald-50 text-emerald-700 border border-emerald-200";
  if (score >= 60) return "bg-amber-50 text-amber-700 border border-amber-200";
  return "bg-red-50 text-red-700 border border-red-200";
}

export function getTrustScoreLabel(score: number | null | undefined) {
  if (score == null) return "Pending";
  if (score >= 80) return "High Trust";
  if (score >= 60) return "Medium Trust";
  return "Low Trust";
}

export function getStatusColor(status: string) {
  switch (status) {
    case "completed": return "bg-emerald-50 text-emerald-700 border border-emerald-200";
    case "in_progress": return "bg-blue-50 text-blue-700 border border-blue-200";
    case "paid": return "bg-violet-50 text-violet-700 border border-violet-200";
    case "pending_payment": return "bg-amber-50 text-amber-700 border border-amber-200";
    case "cancelled": return "bg-red-50 text-red-700 border border-red-200";
    default: return "bg-muted text-muted-foreground";
  }
}

export function getStatusLabel(status: string) {
  switch (status) {
    case "pending_payment": return "Pending Payment";
    case "paid": return "Paid — Queued";
    case "in_progress": return "In Progress";
    case "completed": return "Completed";
    case "cancelled": return "Cancelled";
    default: return status;
  }
}

export function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });
}

export function formatKsh(amount: number) {
  return `Ksh ${amount.toLocaleString()}`;
}
