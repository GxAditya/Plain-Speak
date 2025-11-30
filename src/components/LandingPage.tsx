import React from 'react';
import { 
  Check, 
  FileText,
  Github
} from 'lucide-react';
import { FeaturesSectionWithHoverEffects } from './ui/feature-section-with-hover-effects';
import { AnimatedHero } from './ui/animated-hero';
import { FloatingHeader } from './ui/floating-header';
import { PricingTable } from './ui/pricing-table';

interface LandingPageProps {
  onGetStarted: () => void;
}

const features = [
  { name: "3 documents per day", included: "starter" },
  { name: "All document contexts", included: "starter" },
  { name: "Basic export", included: "starter" },
  { name: "Your own Gemini API key", included: "starter" },
  { name: "Unlimited documents", included: "pro" },
  { name: "Advanced analysis", included: "pro" },
  { name: "Priority processing", included: "pro" },
  { name: "Export & history", included: "pro" },
  { name: "Team collaboration", included: "all" },
  { name: "API access", included: "all" },
  { name: "24/7 support", included: "all" },
];

const plans = [
  {
    name: "Free",
    price: { monthly: 0, yearly: 0 },
    level: "starter",
  },
  {
    name: "Pro",
    price: { monthly: 15, yearly: 144 },
    level: "pro",
    popular: true,
  },
  {
    name: "Enterprise",
    price: { monthly: 20, yearly: 192 },
    level: "all",
  },
];

export function LandingPage({ onGetStarted }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-bolt-gray-50">
      {/* Floating Navigation */}
      <div className="px-4 pt-4">
        <FloatingHeader onGetStarted={onGetStarted} onLogin={onGetStarted} />
      </div>

      {/* Hero */}
      <AnimatedHero onGetStarted={onGetStarted} />

      {/* How it Works */}
      <section id="features" className="py-16 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-semibold text-bolt-gray-900 text-center mb-12">How it works</h2>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-10 h-10 bg-bolt-gray-900 text-white rounded-full flex items-center justify-center text-sm font-medium mx-auto mb-4">1</div>
              <h3 className="text-base font-medium text-bolt-gray-900 mb-2">Paste your text</h3>
              <p className="text-sm text-bolt-gray-600">Upload a document or paste any complex text you need to understand.</p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 bg-bolt-gray-900 text-white rounded-full flex items-center justify-center text-sm font-medium mx-auto mb-4">2</div>
              <h3 className="text-base font-medium text-bolt-gray-900 mb-2">Select context</h3>
              <p className="text-sm text-bolt-gray-600">Choose the domain (legal, medical, etc.) or let AI auto-detect.</p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 bg-bolt-gray-900 text-white rounded-full flex items-center justify-center text-sm font-medium mx-auto mb-4">3</div>
              <h3 className="text-base font-medium text-bolt-gray-900 mb-2">Get clarity</h3>
              <p className="text-sm text-bolt-gray-600">Receive plain English explanations you can actually understand.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-4 sm:px-6 bg-white border-y border-bolt-gray-200">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl font-semibold text-bolt-gray-900 text-center mb-4">Everything you need</h2>
          <p className="text-bolt-gray-600 text-center mb-8 max-w-2xl mx-auto">
            Powerful features to help you understand any document, regardless of complexity.
          </p>
          <FeaturesSectionWithHoverEffects />
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-16 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-semibold text-bolt-gray-900 text-center mb-3">Simple pricing</h2>
          <p className="text-bolt-gray-600 text-center mb-12">Start free, upgrade when you need more.</p>

          <PricingTable
            features={features}
            plans={plans}
            defaultPlan="pro"
            defaultInterval="monthly"
            onPlanSelect={(plan) => console.log("Selected plan:", plan)}
            onGetStarted={(plan) => {
              console.log("Get started with plan:", plan);
              onGetStarted();
            }}
            containerClassName="py-0"
            buttonClassName="bg-bolt-gray-900 hover:bg-bolt-gray-800"
          />
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 px-4 sm:px-6 bg-bolt-gray-900">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 bg-white rounded flex items-center justify-center">
              <FileText className="h-3.5 w-3.5 text-bolt-gray-900" />
            </div>
            <span className="text-sm text-white">PlainSpeak</span>
          </div>

          <div className="flex items-center gap-6 text-sm text-bolt-gray-400">
            <a href="#" className="hover:text-white transition-colors">Terms</a>
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors flex items-center gap-1">
              <Github className="h-4 w-4" />
              GitHub
            </a>
          </div>

          <p className="text-xs text-bolt-gray-500">© 2025 PlainSpeak</p>
        </div>
      </footer>
    </div>
  );
}