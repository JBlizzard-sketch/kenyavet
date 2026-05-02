import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "wouter";
import AppLayout from "@/components/layout/AppLayout";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { getTrustScoreBg, getTrustScoreLabel, formatDate } from "@/lib/utils";
import { ArrowLeft, Shield, CheckCircle, QrCode, MapPin, Clock, Languages, Repeat, Star, MessageSquare, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

interface WorkerDetail {
  id: number;
  name: string;
  role: string;
  trustScore: number | null;
  photoUrl: string | null;
  neighbourhood: string | null;
  yearsExperience: number | null;
  languages: string[];
  badges: string[];
  qrCode: string | null;
  vetCount: number;
  verifiedAt: string | null;
  createdAt: string;
  avgRating: number | null;
  reviewCount: number;
}

interface Review {
  id: number;
  rating: number;
  review: string | null;
  createdAt: string;
  employerName: string;
  employerNeighbourhood: string | null;
}

function TrustRing({ score }: { score: number }) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const filled = (score / 100) * circumference;
  const color = score >= 80 ? "#10b981" : score >= 60 ? "#f59e0b" : "#ef4444";
  return (
    <div className="relative w-36 h-36 mx-auto">
      <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="10" />
        <circle cx="60" cy="60" r={radius} fill="none" stroke={color} strokeWidth="10"
          strokeDasharray={`${filled} ${circumference}`} strokeLinecap="round"
          className="transition-all duration-700" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-foreground">{score}</span>
        <span className="text-xs text-muted-foreground mt-0.5">/ 100</span>
      </div>
    </div>
  );
}

const BADGE_ICONS: Record<string, string> = {
  "Identity Verified": "🪪",
  "DCI Cleared": "🏛️",
  "References Checked": "📞",
  "Social Media Reviewed": "🌐",
  "No Flags": "✅",
  "Top Rated": "⭐",
  "Highly Rated": "⭐",
};

function StarRow({ value, onChange, size = "md" }: { value: number; onChange?: (v: number) => void; size?: "sm" | "md" }) {
  const [hovered, setHovered] = useState(0);
  const dim = size === "sm" ? "w-3.5 h-3.5" : "w-5 h-5";
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange?.(n)}
          onMouseEnter={() => onChange && setHovered(n)}
          onMouseLeave={() => onChange && setHovered(0)}
          className={onChange ? "cursor-pointer" : "cursor-default"}
          disabled={!onChange}
        >
          <Star
            className={`${dim} transition-colors ${
              n <= (hovered || value)
                ? "fill-amber-400 text-amber-400"
                : "fill-muted text-muted-foreground/30"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

export default function WorkerProfile() {
  const { id } = useParams<{ id: string }>();
  const { token, user } = useAuth();
  const [worker, setWorker] = useState<WorkerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [myReview, setMyReview] = useState<Review | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (!id) return;
    apiFetch<WorkerDetail>(`/workers/${id}`, { token })
      .then(setWorker)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id, token]);

  const loadReviews = useCallback(() => {
    if (!id) return;
    setReviewsLoading(true);
    apiFetch<{ reviews: Review[]; avgRating: number | null; totalReviews: number }>(`/workers/${id}/reviews`, { token })
      .then(data => {
        setReviews(data.reviews);
        const mine = data.reviews.find(r => r.employerName === user?.name);
        if (mine) {
          setMyReview(mine);
          setRating(mine.rating);
          setReviewText(mine.review ?? "");
        }
      })
      .catch(() => {})
      .finally(() => setReviewsLoading(false));
  }, [id, token, user?.name]);

  useEffect(() => { loadReviews(); }, [loadReviews]);

  async function handleSubmitReview(e: React.FormEvent) {
    e.preventDefault();
    if (rating === 0) { toast({ title: "Please select a rating", variant: "destructive" }); return; }
    setSubmitting(true);
    try {
      await apiFetch(`/workers/${id}/review`, {
        method: "POST",
        token,
        body: { rating, review: reviewText.trim() || null },
      });
      toast({ title: myReview ? "Review updated" : "Review submitted", description: "Thank you for your feedback." });
      setShowForm(false);
      loadReviews();
      if (id) {
        const updated = await apiFetch<WorkerDetail>(`/workers/${id}`, { token });
        setWorker(updated);
      }
    } catch {
      toast({ title: "Failed to submit review", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <AppLayout><div className="p-6 text-muted-foreground text-sm">Loading…</div></AppLayout>;
  if (notFound || !worker) return (
    <AppLayout>
      <div className="p-6 max-w-2xl mx-auto text-center py-20">
        <Shield className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
        <p className="text-lg font-semibold text-foreground mb-1">Worker not found</p>
        <p className="text-sm text-muted-foreground mb-6">This worker may not yet be in the verified registry.</p>
        <Link href="/workers"><Button variant="outline">Back to Workers</Button></Link>
      </div>
    </AppLayout>
  );

  const trustLabel = worker.trustScore != null ? getTrustScoreLabel(worker.trustScore) : null;
  const recommendation = worker.trustScore != null
    ? worker.trustScore >= 80 ? "Safe to Hire" : worker.trustScore >= 60 ? "Hire with Caution" : "Do Not Hire"
    : null;
  const recColor = worker.trustScore != null
    ? worker.trustScore >= 80 ? "text-emerald-700 bg-emerald-50 border-emerald-200"
    : worker.trustScore >= 60 ? "text-amber-700 bg-amber-50 border-amber-200"
    : "text-red-700 bg-red-50 border-red-200"
    : "text-muted-foreground bg-muted border-border";

  return (
    <AppLayout>
      <div className="p-6 max-w-4xl mx-auto">
        <Link href="/workers">
          <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Workers
          </button>
        </Link>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left: identity card */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-card rounded-xl border border-card-border p-6 text-center">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <span className="text-primary text-3xl font-bold">{worker.name.charAt(0)}</span>
              </div>
              <h1 className="text-xl font-serif font-bold text-foreground">{worker.name}</h1>
              <p className="text-sm text-muted-foreground mt-0.5">{worker.role}</p>

              {worker.avgRating != null && (
                <div className="mt-2 flex items-center justify-center gap-2">
                  <StarRow value={Math.round(worker.avgRating)} size="sm" />
                  <span className="text-xs text-muted-foreground">{worker.avgRating} ({worker.reviewCount})</span>
                </div>
              )}

              {worker.trustScore != null && (
                <div className="mt-6">
                  <TrustRing score={worker.trustScore} />
                  <p className="text-sm font-semibold text-foreground mt-2">{trustLabel}</p>
                  {recommendation && (
                    <span className={`inline-block text-xs px-3 py-1 rounded-full border font-medium mt-2 ${recColor}`}>
                      {recommendation}
                    </span>
                  )}
                </div>
              )}

              <div className="mt-5 space-y-2 text-sm text-muted-foreground text-left">
                {worker.neighbourhood && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    <span>{worker.neighbourhood}</span>
                  </div>
                )}
                {worker.yearsExperience && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                    <span>{worker.yearsExperience} year{worker.yearsExperience !== 1 ? "s" : ""} experience</span>
                  </div>
                )}
                {worker.languages && worker.languages.length > 0 && (
                  <div className="flex items-start gap-2">
                    <Languages className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>{worker.languages.join(", ")}</span>
                  </div>
                )}
                {worker.vetCount > 1 && (
                  <div className="flex items-center gap-2">
                    <Repeat className="w-3.5 h-3.5 shrink-0" />
                    <span>Vetted {worker.vetCount} times</span>
                  </div>
                )}
              </div>

              {worker.qrCode && (
                <div className="mt-5 pt-4 border-t border-border">
                  <p className="text-xs text-muted-foreground mb-2">QR Code: <span className="font-mono">{worker.qrCode}</span></p>
                  <Link href={`/verify?qr=${worker.qrCode}`}>
                    <Button size="sm" className="w-full gap-2" variant="outline">
                      <QrCode className="w-3.5 h-3.5" /> Verify on Public Portal
                    </Button>
                  </Link>
                </div>
              )}

              <div className="mt-4">
                <Link href={`/vetting-requests/new?workerName=${encodeURIComponent(worker.name)}&workerRole=${encodeURIComponent(worker.role)}`}>
                  <Button size="sm" className="w-full gap-2 mt-1">
                    <Shield className="w-3.5 h-3.5" /> Submit New Vetting
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Right: details */}
          <div className="lg:col-span-2 space-y-5">
            {/* Verification badges */}
            {worker.badges && worker.badges.length > 0 && (
              <div className="bg-card rounded-xl border border-card-border p-5">
                <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500" /> Verification Badges
                </h2>
                <div className="grid sm:grid-cols-2 gap-3">
                  {worker.badges.map(badge => (
                    <div key={badge} className="flex items-center gap-3 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50">
                      <span className="text-xl">{BADGE_ICONS[badge] ?? "✓"}</span>
                      <div>
                        <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">{badge}</p>
                        <p className="text-xs text-emerald-600 dark:text-emerald-500">Verified by KenyaVet</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Verification record */}
            <div className="bg-card rounded-xl border border-card-border p-5">
              <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" /> Verification Record
              </h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-border">
                  <span className="text-sm text-muted-foreground">KenyaVet ID</span>
                  <span className="font-mono text-sm font-medium text-foreground">KV-{worker.id.toString().padStart(5, "0")}</span>
                </div>
                {worker.qrCode && (
                  <div className="flex items-center justify-between py-3 border-b border-border">
                    <span className="text-sm text-muted-foreground">QR Certificate</span>
                    <span className="font-mono text-sm font-medium text-foreground">{worker.qrCode}</span>
                  </div>
                )}
                {worker.verifiedAt && (
                  <div className="flex items-center justify-between py-3 border-b border-border">
                    <span className="text-sm text-muted-foreground">Last Verified</span>
                    <span className="text-sm font-medium text-foreground">{formatDate(worker.verifiedAt)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between py-3 border-b border-border">
                  <span className="text-sm text-muted-foreground">Vetting Count</span>
                  <span className="text-sm font-medium text-foreground">{worker.vetCount} background check{worker.vetCount !== 1 ? "s" : ""}</span>
                </div>
                <div className="flex items-center justify-between py-3">
                  <span className="text-sm text-muted-foreground">Registry Added</span>
                  <span className="text-sm font-medium text-foreground">{formatDate(worker.createdAt)}</span>
                </div>
              </div>
            </div>

            {/* Trust score breakdown */}
            {worker.trustScore != null && (
              <div className="bg-card rounded-xl border border-card-border p-5">
                <h2 className="font-semibold text-foreground mb-4">Trust Score Breakdown</h2>
                <div className="space-y-3">
                  {[
                    { label: "Identity Verification", max: 25, icon: "🪪" },
                    { label: "Reference Calls", max: 30, icon: "📞" },
                    { label: "DCI Certificate", max: 20, icon: "🏛️" },
                    { label: "Social Media Review", max: 15, icon: "🌐" },
                    { label: "Address Verification", max: 10, icon: "📍" },
                  ].map(({ label, max, icon }) => {
                    const pct = Math.min(100, Math.round((worker.trustScore! / 100) * max / max * 100));
                    return (
                      <div key={label}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <span>{icon}</span> {label}
                          </span>
                          <span className="text-xs text-muted-foreground">/ {max} pts</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              worker.trustScore! >= 80 ? "bg-emerald-500" : worker.trustScore! >= 60 ? "bg-amber-500" : "bg-red-400"
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground mt-4 italic">
                  Detailed score breakdown available in the full vetting report.
                </p>
              </div>
            )}

            {/* Reviews section */}
            <div className="bg-card rounded-xl border border-card-border p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-foreground flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-primary" />
                  Employer Reviews
                  {reviews.length > 0 && (
                    <span className="text-xs font-normal text-muted-foreground ml-1">({reviews.length})</span>
                  )}
                </h2>
                {user?.role === "employer" && !showForm && (
                  <button
                    onClick={() => setShowForm(true)}
                    className="text-xs text-primary hover:underline"
                  >
                    {myReview ? "Edit my review" : "Leave a review"}
                  </button>
                )}
              </div>

              {/* Rating summary */}
              {worker.avgRating != null && reviews.length > 0 && (
                <div className="flex items-center gap-4 mb-4 p-3 bg-muted/40 rounded-lg">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-foreground">{worker.avgRating}</div>
                    <div className="text-xs text-muted-foreground">out of 5</div>
                  </div>
                  <div>
                    <StarRow value={Math.round(worker.avgRating)} />
                    <p className="text-xs text-muted-foreground mt-1">{reviews.length} review{reviews.length !== 1 ? "s" : ""}</p>
                  </div>
                </div>
              )}

              {/* Leave review form */}
              {showForm && (
                <form onSubmit={handleSubmitReview} className="mb-5 p-4 bg-muted/30 rounded-lg border border-border space-y-3">
                  <p className="text-sm font-medium text-foreground">{myReview ? "Edit your review" : "Rate this worker"}</p>
                  <div>
                    <StarRow value={rating} onChange={setRating} />
                    {rating > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {["", "Poor", "Fair", "Good", "Very Good", "Excellent"][rating]}
                      </p>
                    )}
                  </div>
                  <textarea
                    value={reviewText}
                    onChange={e => setReviewText(e.target.value)}
                    placeholder="Share your experience with this worker (optional)…"
                    rows={3}
                    className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground resize-none outline-none focus:ring-2 focus:ring-ring"
                  />
                  <div className="flex items-center gap-2">
                    <Button type="submit" size="sm" disabled={submitting || rating === 0} className="gap-1.5">
                      <Send className="w-3.5 h-3.5" />
                      {submitting ? "Submitting…" : myReview ? "Update Review" : "Submit Review"}
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setShowForm(false)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              )}

              {/* Reviews list */}
              {reviewsLoading ? (
                <div className="text-sm text-muted-foreground py-4 text-center">Loading reviews…</div>
              ) : reviews.length === 0 ? (
                <div className="text-center py-8">
                  <Star className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No reviews yet.</p>
                  {user?.role === "employer" && !showForm && (
                    <button onClick={() => setShowForm(true)} className="text-xs text-primary hover:underline mt-1">
                      Be the first to review
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {reviews.map(r => (
                    <div key={r.id} className="border-b border-border last:border-0 pb-4 last:pb-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div>
                          <span className="text-sm font-medium text-foreground">{r.employerName}</span>
                          {r.employerNeighbourhood && (
                            <span className="text-xs text-muted-foreground ml-2">· {r.employerNeighbourhood}</span>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">{formatDate(r.createdAt)}</span>
                      </div>
                      <StarRow value={r.rating} size="sm" />
                      {r.review && <p className="text-sm text-foreground mt-1.5 leading-relaxed">{r.review}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
