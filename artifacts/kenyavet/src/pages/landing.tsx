import { Link } from "wouter";
import { Shield, CheckCircle, Clock, Star, ArrowRight, Phone, Users, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

const packages = [
  {
    name: "Basic Check",
    price: "Ksh 2,500",
    turnaround: "48 hours",
    popular: false,
    features: ["Identity Verification (National ID)", "DCI Certificate Status", "Social Media Review", "Digital Trust Report"],
  },
  {
    name: "Standard Check",
    price: "Ksh 5,000",
    turnaround: "24 hours",
    popular: true,
    features: ["Identity Verification (National ID)", "DCI Certificate Status", "2 Human Reference Calls", "AI-Summarised Notes", "Social Media Review", "Digital Trust Report"],
  },
  {
    name: "Premium Deep Check",
    price: "Ksh 9,000",
    turnaround: "24 hours",
    popular: false,
    features: ["Identity Verification (National ID)", "DCI Certificate Status", "3 Human Reference Calls", "AI-Summarised Notes", "Social Media Review", "Physical Address Visit", "QR Verification Card", "Digital Trust Report"],
  },
];

const testimonials = [
  { name: "Wanjiku M.", location: "Karen", text: "Finally a service that takes domestic staff vetting seriously. The reference calls were thorough and I feel confident about my new house manager." },
  { name: "Amina A.", location: "Muthaiga", text: "The QR verification card is a brilliant touch. Visitors at my home can verify my driver on the spot. Absolute peace of mind." },
  { name: "James K.", location: "Gigiri", text: "We had a bad experience with unvetted staff before. KenyaVet's report was detailed and gave us everything we needed to make an informed decision." },
];

export default function Landing() {
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
            <a href="#verify" className="hover:text-gray-900 transition-colors">Verify a Worker</a>
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
        <div className="relative max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-xs font-medium border border-emerald-100 mb-8">
            <Shield className="w-3 h-3" />
            Trusted by 400+ Nairobi Households
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
            <span className="flex items-center gap-1.5"><CheckCircle className="w-4 h-4 text-emerald-500" /> DCI Certificate Verified</span>
            <span className="flex items-center gap-1.5"><CheckCircle className="w-4 h-4 text-emerald-500" /> Human Reference Calls</span>
            <span className="flex items-center gap-1.5"><CheckCircle className="w-4 h-4 text-emerald-500" /> National ID Validation</span>
            <span className="flex items-center gap-1.5"><CheckCircle className="w-4 h-4 text-emerald-500" /> 24–48 Hour Results</span>
          </div>
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
              { step: "01", icon: FileText, title: "Submit Details", desc: "Enter the worker's name, ID number, and contacts. Upload their ID photo." },
              { step: "02", icon: Phone, title: "We Investigate", desc: "Our team verifies ID, runs DCI checks, calls references, and reviews social media." },
              { step: "03", icon: Star, title: "Trust Score", desc: "You receive a detailed report with a Trust Score (0–100) within 24–48 hours." },
              { step: "04", icon: Shield, title: "QR Card", desc: "Premium checks include a QR verification card your worker carries at all times." },
            ].map(({ step, icon: Icon, title, desc }) => (
              <div key={step} className="text-center">
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
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white text-xs font-semibold px-4 py-1 rounded-full">
                    Most Popular
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
                  <Button
                    className="w-full"
                    variant={pkg.popular ? "default" : "outline"}
                  >
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
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map(t => (
              <div key={t.name} className="bg-white rounded-xl border border-gray-100 p-6">
                <div className="flex gap-0.5 mb-3">
                  {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />)}
                </div>
                <p className="text-sm text-gray-600 leading-relaxed mb-4">"{t.text}"</p>
                <div className="font-medium text-gray-900 text-sm">{t.name}</div>
                <div className="text-xs text-gray-400">{t.location}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 sm:px-6 bg-primary">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-serif font-bold text-white mb-4">Ready to vet your domestic staff?</h2>
          <p className="text-white/70 mb-8">Join over 400 Nairobi households who trust KenyaVet for staff verification.</p>
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
