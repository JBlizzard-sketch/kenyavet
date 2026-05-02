import { Link } from "wouter";
import { Shield, ArrowLeft, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50/30 to-white flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
          <Shield className="w-8 h-8 text-primary" />
        </div>
        <div className="text-6xl font-serif font-black text-primary/20 mb-4 leading-none">404</div>
        <h1 className="text-2xl font-serif font-bold text-gray-900 mb-3">Page not found</h1>
        <p className="text-gray-500 text-sm mb-8 leading-relaxed">
          The page you're looking for doesn't exist or has been moved. Let's get you back on track.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/dashboard">
            <Button className="gap-2">
              <ArrowLeft className="w-4 h-4" /> Go to Dashboard
            </Button>
          </Link>
          <Link href="/">
            <Button variant="outline" className="gap-2">
              <Shield className="w-4 h-4" /> Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
