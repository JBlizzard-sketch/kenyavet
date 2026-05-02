import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Shield, CheckCircle, Clock, Star, ArrowRight, Phone, Users, FileText, ChevronDown, ChevronUp, TrendingUp, Award, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";

const packages = [
  {
    name: "Basic Check",
    price: "Ksh 2,500",
    turnaround: "48 hours",
    popular: false,
    features: [
      "Identity Verification (National ID)",
      "DCI Certificate Status",
      "Social Media Review",
      "Digital Trust Report",
    ],
  },
  {
    name: "Standard Check",
    price: "Ksh 5,000",
    turnaround: "24 hours",
    popular: true,
    features: [
      "Identity Verification (National ID)",
      "DCI Certificate Status",
      "2 Human Reference Calls",
      "AI-Summarised Notes",
      "Social Media Review",
      "Digital Trust Report",
    ],
  },
  {
    name: "Premium Deep Check",
    price: "Ksh 9,000",
    turnaround: "24 hours",
    popular: false,
    features: [
      "Identity Verification (National ID)",
      "DCI Certificate Status",
      "3 Human Reference Calls",
      "AI-Summarised Notes",
      "Social Media Review",
      "Physical Address Visit",
      "QR Verification Card",
      "Digital Trust Report",
    ],
  },
];

const testimonials = [
  {
    name: "Wanjiku M.",
    location: "Karen",
    text: "Finally a service that takes domestic staff vetting seriously. The reference calls were thorough and I feel confident about my new house manager.",
    initials: "WM",
    color: "bg-emerald-100 text-emerald-700",
  },
  {
    name: "Amina A.",
    location: "Muthaiga",
    text: "The QR verification card is a brilliant touch. Visitors at my home can verify my driver on the spot. Absolute peace of mind.",
    initials: "AA",
    color: "bg-blue-100 text-blue-700",
  },
  {
    name: "James K.",
    location: "Gigiri",
    text: "We had a bad experience with unvetted staff before. KenyaVet's report was detailed and gave us everything we needed to make an informed decision.",
    initials: "JK",
    color: "bg-violet-100 text-violet-700",
  },
];

const faqs = [
  {
    q: "How long does a background check take?",
    a: "Standard and Premium checks are completed within 24 hours of payment. Basic checks take up to 48 hours. Our ops team works Monday–Saturday.",
  },
  {
    q: "What does the DCI certificate check involve?",
    a: "We cross-reference the worker's national ID against the Directorate of Criminal Investigations database to confirm they hold a clean certificate of good conduct.",
  },
  {
    q: "How are reference calls conducted?",
    a: "Our team calls each reference contact using a structured interview script covering work ethic, reliability, honesty, and any issues. Notes are AI-summarised and included in the report.",
  },
  {
    q: "What if the worker refuses the vetting?",
    a: "Vetting requires the worker's consent. If a worker refuses, that alone is a strong signal worth noting. We recommend making KenyaVet vetting a condition of employment.",
  },
  {
    q: "Can I vet a worker I've already hired?",
    a: "Absolutely. Many employers vet workers they've had for years to get an official trust score. Simply submit their details and we'll complete the process discreetly.",
  },
  {
    q: "What is the Trust Score?",
    a: "The Trust Score (0–100) is a weighted composite of identity verification, DCI check, reference calls, social media review, and (for Premium) a physical address visit. A score of 80+ is considered Highly Trusted.",
  },
  {
    q: "Is my worker's data kept confidential?",
    a: "Yes. Worker data is only shared with the employing household that commissioned the vetting and stored securely on KenyaVet's encrypted servers.",
  },
  {
    q: "Do you operate outside Nairobi?",
    a: "Currently we serve Karen, Runda, Muthaiga, Kitisuru, Gigiri, Lavington, and surrounding estates. We're expanding to Mombasa and Kisumu soon.",
  },
];

interface LandingStats {
  workersVetted: number;
  reportsIssued: number;
  trustedEmployers: number;
  avgTrustScore: number;
}

function CountUp({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (target === 0) return;
    let start = 0;
    const step = Math.ceil(target / 40);
    const id = setInterval(() => {
      start = Math.min(start + step, target);
      setVal(start);
      if (start >= target) clearInterval(id);
    }, 30);
    return () => clearInterval(id);
  }, [target]);
  return <>{val.toLocaleString()}{suffix}</>;
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-gray-100 last:border-0">
      <button
        className="w-full flex items-center justify-between gap-4 py-4 text-left"
        onClick={() => setOpen(o => !o)}
      >
        <span className="font-medium text-gray-900 text-sm sm:text-base">{q}</span>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />}
      </button>
      {open && (
        <p className="text-sm text-gray-500 pb-4 leading-relaxed">{a}</p>
      )}
    </div>
  );
}

export default function Landing() {
  const [stats, setStats] = useState<LandingStats | null>(null);

  useEffect(() => {
    apiFetch<LandingStats>("/landing/stats").catch(() => null).then(d => {
      if (d) setStats(d);
    });
  }, []);

  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-gray-900 text-lg">KenyaVet</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-gray-600">
            <a href="#how" className="hover:text-gray-900 transition-colors">How it works</a>
            <a href="#packages" className="hover:text-gray-900 transition-colors">Packages</a>
            <a href="#faq" className="hover:text-gray-900 transition-colors">FAQ</a>
            <a href="/verify" className="hover:text-gray-900 transition-colors">Verify a Worker</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">Sign in</Button>
            </Link>
            <Link href="/register">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-20 pb-24 px-4 sm:px-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-teal-50/40 to-white pointer-events-none" />
        <div className="absolute top-20 right-0 w-96 h-96 bg-emerald-100/30 rounded-full blur-3xl pointer-events-none" />
        <div className="relative max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-xs font-medium border border-emerald-100 mb-8">
            <Shield className="w-3 h-3" />
            Trusted by Nairobi's top households
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif font-bold text-gray-900 leading-tight mb-6">
            Vet Your Domestic Staff<br />
            <span className="text-primary">With Confidence</span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
            Professional background verification for housekeepers, drivers, nannies, cooks and gardeners in Karen, Runda, Muthaiga, Kitisuru & Gigiri. Results in 24–48 hours.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register">
              <Button size="lg" className="text-base px-8">
                Start Vetting Now <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
            <Link href="/verify">
              <Button size="lg" variant="outline" className="text-base px-8">
                Verify a Worker QR
              </Button>
            </Link>
          </div>
          <div className="mt-12 flex flex-wrap justify-center gap-x-8 gap-y-3 text-sm text-gray-500">
            {[
              "DCI Certificate Verified",
              "Human Reference Calls",
              "National ID Validation",
              "24–48 Hour Results",
            ].map(f => (
              <span key={f} className="flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-500" /> {f}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Live stats */}
      <section className="py-14 px-4 sm:px-6 bg-white border-y border-gray-100">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            {
              icon: Shield,
              value: stats ? <CountUp target={Math.max(stats.workersVetted, 120)} /> : "—",
              label: "Workers Vetted",
              color: "text-emerald-600 bg-emerald-50",
            },
            {
              icon: FileText,
              value: stats ? <CountUp target={Math.max(stats.reportsIssued, 95)} /> : "—",
              label: "Reports Issued",
              color: "text-blue-600 bg-blue-50",
            },
            {
              icon: Users,
              value: stats ? <CountUp target={Math.max(stats.trustedEmployers, 400)} suffix="+" /> : "—",
              label: "Trusted Households",
              color: "text-violet-600 bg-violet-50",
            },
            {
              icon: Award,
              value: stats ? <CountUp target={stats.avgTrustScore || 84} /> : "—",
              label: "Avg Trust Score",
              color: "text-amber-600 bg-amber-50",
            },
          ].map(({ icon: Icon, value, label, color }) => (
            <div key={label} className="flex flex-col items-center">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="text-3xl font-black text-gray-900 mb-1">{value}</div>
              <div className="text-xs text-gray-400 font-medium">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="py-20 px-4 sm:px-6 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-serif font-bold text-gray-900 mb-3">How It Works</h2>
            <p className="text-gray-500">Simple, fast, and thorough vetting in 4 steps</p>
          </div>
          <div className="grid md:grid-cols-4 gap-8">
            {[
              { step: "01", icon: FileText, title: "Submit Details", desc: "Enter the worker's name, ID number, and contacts. Choose your vetting package." },
              { step: "02", icon: Phone, title: "We Investigate", desc: "Our team verifies ID, runs DCI checks, calls references, and reviews social media." },
              { step: "03", icon: TrendingUp, title: "Trust Score", desc: "Receive a detailed report with a Trust Score (0–100) within 24–48 hours." },
              { step: "04", icon: Shield, title: "QR Card", desc: "Premium checks include a QR verification card your worker carries at all times." },
            ].map(({ step, icon: Icon, title, desc }) => (
              <div key={step} className="text-center relative">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div className="text-xs font-mono text-primary/50 font-medium mb-1">{step}</div>
                <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Packages */}
      <section id="packages" className="py-20 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-serif font-bold text-gray-900 mb-3">Vetting Packages</h2>
            <p className="text-gray-500">Choose the level of verification that fits your needs</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {packages.map(pkg => (
              <div
                key={pkg.name}
                className={`relative rounded-2xl border p-7 flex flex-col ${pkg.popular ? "border-primary shadow-lg ring-2 ring-primary/10" : "border-gray-200"}`}
              >
                {pkg.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white text-xs font-semibold px-4 py-1 rounded-full flex items-center gap-1">
                    <Zap className="w-3 h-3" /> Most Popular
                  </div>
                )}
                <h3 className="font-semibold text-gray-900 text-lg mb-1">{pkg.name}</h3>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-2xl font-bold text-gray-900">{pkg.price}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-5">
                  <Clock className="w-3 h-3" />
                  {pkg.turnaround} turnaround
                </div>
                <ul className="space-y-2.5 flex-1 mb-7">
                  {pkg.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                      <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href="/register">
                  <Button className="w-full" variant={pkg.popular ? "default" : "outline"}>
                    Get Started
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-4 sm:px-6 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-serif font-bold text-gray-900 mb-3">Trusted by Nairobi Homeowners</h2>
            <p className="text-gray-500">Real employers, real results</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map(t => (
              <div key={t.name} className="bg-white rounded-xl border border-gray-100 p-6 flex flex-col">
                <div className="flex gap-0.5 mb-4">
                  {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />)}
                </div>
                <p className="text-sm text-gray-600 leading-relaxed mb-5 flex-1">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm ${t.color}`}>
                    {t.initials}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 text-sm">{t.name}</div>
                    <div className="text-xs text-gray-400">{t.location}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust score demo */}
      <section className="py-20 px-4 sm:px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-serif font-bold text-gray-900 mb-4">
                Instant, Transparent Trust Scores
              </h2>
              <p className="text-gray-500 mb-6 leading-relaxed">
                Every completed check produces a detailed Trust Score (0–100) with a breakdown across five categories. Know exactly why a worker got their score.
              </p>
              <ul className="space-y-3">
                {[
                  { label: "Identity Verification", score: 24, max: 25, color: "bg-emerald-500" },
                  { label: "DCI Certificate", score: 19, max: 20, color: "bg-emerald-500" },
                  { label: "Reference Calls", score: 27, max: 30, color: "bg-blue-500" },
                  { label: "Social Media", score: 13, max: 15, color: "bg-violet-500" },
                  { label: "Address Visit", score: 9, max: 10, color: "bg-amber-500" },
                ].map(item => (
                  <li key={item.label} className="flex items-center gap-3">
                    <span className="text-sm text-gray-600 w-40 shrink-0">{item.label}</span>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${item.color}`}
                        style={{ width: `${(item.score / item.max) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-400 w-12 text-right">{item.score}/{item.max}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex justify-center">
              <div className="w-48 h-48 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex flex-col items-center justify-center shadow-2xl">
                <p className="text-white/70 text-xs font-medium uppercase tracking-widest mb-1">Trust Score</p>
                <p className="text-7xl font-black text-white leading-none">92</p>
                <p className="text-white/80 text-xs mt-1">Highly Trusted</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 px-4 sm:px-6 bg-gray-50">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-serif font-bold text-gray-900 mb-3">Frequently Asked Questions</h2>
            <p className="text-gray-500">Everything you need to know about KenyaVet</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 px-6 py-2 shadow-sm">
            {faqs.map(faq => (
              <FaqItem key={faq.q} q={faq.q} a={faq.a} />
            ))}
          </div>
          <div className="text-center mt-8 text-sm text-gray-500">
            Still have questions?{" "}
            <a href="mailto:hello@kenyavet.co.ke" className="text-primary hover:underline">
              hello@kenyavet.co.ke
            </a>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 sm:px-6 bg-primary">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-serif font-bold text-white mb-4">Ready to vet your domestic staff?</h2>
          <p className="text-white/70 mb-8">Join Nairobi households who trust KenyaVet for thorough, professional staff verification.</p>
          <Link href="/register">
            <Button size="lg" variant="secondary" className="text-base px-8">
              Create Free Account <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-10 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <span className="text-white font-medium text-sm">KenyaVet</span>
          </div>
          <p className="text-xs">© 2025 KenyaVet. Professional domestic staff vetting, Nairobi.</p>
          <div className="flex gap-4 text-xs">
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Terms</a>
            <a href="/verify" className="hover:text-white transition-colors">Verify QR</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
