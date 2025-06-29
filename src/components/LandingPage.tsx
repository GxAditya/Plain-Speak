import React, { useState } from 'react';
import { 
  Sparkles, 
  ArrowRight, 
  Check, 
  Star,
  Zap,
  Shield,
  Users,
  Globe,
  ChevronRight,
  Github,
  Twitter,
  Linkedin,
  Mail
} from 'lucide-react';

interface LandingPageProps {
  onGetStarted: () => void;
}

export function LandingPage({ onGetStarted }: LandingPageProps) {
  const [email, setEmail] = useState('');

  const features = [
    {
      icon: Zap,
      title: "Lightning Fast",
      description: "Get instant explanations of complex jargon with our AI-powered translation engine."
    },
    {
      icon: Shield,
      title: "Enterprise Security",
      description: "Your documents are processed securely with enterprise-grade encryption and privacy."
    },
    {
      icon: Users,
      title: "Multi-Domain Expertise",
      description: "Specialized tools for legal, medical, financial, and technical document analysis."
    },
    {
      icon: Globe,
      title: "Universal Access",
      description: "Making complex information accessible to everyone, regardless of technical background."
    }
  ];

  const testimonials = [
    {
      name: "Sarah Chen",
      role: "Small Business Owner",
      content: "PlainSpeak saved me thousands in legal fees. I can now understand contracts before signing them.",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah&backgroundColor=b6e3f4&clothesColor=262e33"
    },
    {
      name: "Dr. Michael Rodriguez",
      role: "Healthcare Professional",
      content: "This tool helps me explain complex medical terms to patients in a way they actually understand.",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Michael&backgroundColor=c0aede&clothesColor=3c4f5c"
    },
    {
      name: "Jennifer Park",
      role: "Real Estate Agent",
      content: "My clients love how I can instantly explain any confusing terms in their contracts.",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Jennifer&backgroundColor=ffd5dc&clothesColor=929598"
    }
  ];

  const pricingPlans = [
    {
      name: "Starter",
      price: "$5",
      period: "/month",
      description: "Perfect for individuals getting started",
      features: [
        "3 specialized AI tools",
        "50 document uploads/month",
        "Basic analysis mode",
        "Email support",
        "Standard processing speed"
      ],
      popular: false,
      buttonText: "Get Started"
    },
    {
      name: "Professional",
      price: "$15",
      period: "/month",
      description: "Ideal for professionals and small teams",
      features: [
        "All 9 specialized AI tools",
        "500 document uploads/month",
        "Advanced analysis mode",
        "Priority support",
        "Fast processing speed",
        "Document history & search",
        "Export capabilities"
      ],
      popular: true,
      buttonText: "Get Started"
    },
    {
      name: "Enterprise",
      price: "$20",
      period: "/month",
      description: "For teams and organizations",
      features: [
        "All 9 specialized AI tools",
        "Unlimited document uploads",
        "Deep analysis mode",
        "24/7 priority support",
        "Fastest processing speed",
        "Advanced document management",
        "Team collaboration features",
        "Custom integrations",
        "Dedicated account manager"
      ],
      popular: false,
      buttonText: "Contact Sales"
    }
  ];

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onGetStarted();
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md border-b border-bolt-gray-200 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-r from-bolt-blue-600 to-bolt-blue-700 rounded-xl">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold text-bolt-gray-900">PlainSpeak</span>
            </div>
            
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-bolt-gray-600 hover:text-bolt-gray-900 transition-colors">Features</a>
              <a href="#how-it-works" className="text-bolt-gray-600 hover:text-bolt-gray-900 transition-colors">How it Works</a>
              <a href="#testimonials" className="text-bolt-gray-600 hover:text-bolt-gray-900 transition-colors">Testimonials</a>
              <a href="#pricing" className="text-bolt-gray-600 hover:text-bolt-gray-900 transition-colors">Pricing</a>
            </div>

            <div className="flex items-center space-x-4">
              <button 
                onClick={onGetStarted}
                className="text-bolt-gray-600 hover:text-bolt-gray-900 transition-colors"
              >
                Sign In
              </button>
              <button 
                onClick={onGetStarted}
                className="bg-bolt-blue-600 hover:bg-bolt-blue-700 text-white px-4 py-2 rounded-lg transition-colors font-medium"
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-bolt-gray-50 via-white to-bolt-blue-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <div className="inline-flex items-center px-4 py-2 bg-bolt-blue-100 text-bolt-blue-800 rounded-full text-sm font-medium mb-8 animate-fade-in">
              <Sparkles className="h-4 w-4 mr-2" />
              AI-Powered Jargon Translation
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold text-bolt-gray-900 mb-6 animate-slide-up">
              Complex Jargon,
              <span className="block bg-gradient-to-r from-bolt-blue-600 to-bolt-blue-700 bg-clip-text text-transparent">
                Simple Explanations
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-bolt-gray-600 mb-12 max-w-4xl mx-auto leading-relaxed animate-slide-up">
              Transform legal documents, medical reports, financial terms, and technical jargon 
              into clear, understandable language with our AI-powered platform.
            </p>

            <div className="flex justify-center mb-16 animate-slide-up">
              <button 
                onClick={onGetStarted}
                className="group bg-bolt-blue-600 hover:bg-bolt-blue-700 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-200 flex items-center space-x-2 shadow-lg hover:shadow-xl"
              >
                <span>Start Translating</span>
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
              <div className="text-center">
                <div className="text-3xl font-bold text-bolt-gray-900">10K+</div>
                <div className="text-bolt-gray-600">Documents Processed</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-bolt-gray-900">99.9%</div>
                <div className="text-bolt-gray-600">Accuracy Rate</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-bolt-gray-900">5K+</div>
                <div className="text-bolt-gray-600">Happy Users</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-bolt-gray-900">9</div>
                <div className="text-bolt-gray-600">Specialized Tools</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-bolt-gray-900 mb-6">
              Why Choose PlainSpeak?
            </h2>
            <p className="text-xl text-bolt-gray-600 max-w-3xl mx-auto">
              Our AI-powered platform makes complex information accessible to everyone, 
              saving you time and money while ensuring you understand what matters.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => {
              const IconComponent = feature.icon;
              return (
                <div 
                  key={index}
                  className="group p-8 bg-bolt-gray-50 hover:bg-white rounded-2xl transition-all duration-300 hover:shadow-xl border border-transparent hover:border-bolt-gray-200"
                >
                  <div className="p-3 bg-bolt-blue-100 rounded-xl w-fit mb-6 group-hover:bg-bolt-blue-600 transition-colors">
                    <IconComponent className="h-6 w-6 text-bolt-blue-600 group-hover:text-white transition-colors" />
                  </div>
                  <h3 className="text-xl font-semibold text-bolt-gray-900 mb-3">{feature.title}</h3>
                  <p className="text-bolt-gray-600 leading-relaxed">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8 bg-bolt-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-bolt-gray-900 mb-6">
              How It Works
            </h2>
            <p className="text-xl text-bolt-gray-600 max-w-3xl mx-auto">
              Get clear explanations in three simple steps
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-bolt-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6">
                1
              </div>
              <h3 className="text-xl font-semibold text-bolt-gray-900 mb-4">Upload Document</h3>
              <p className="text-bolt-gray-600">
                Upload your legal contract, medical report, or any complex document in PDF, DOCX, or text format.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-bolt-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6">
                2
              </div>
              <h3 className="text-xl font-semibold text-bolt-gray-900 mb-4">AI Analysis</h3>
              <p className="text-bolt-gray-600">
                Our AI identifies complex terms and jargon, then provides context-aware explanations in plain English.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-bolt-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6">
                3
              </div>
              <h3 className="text-xl font-semibold text-bolt-gray-900 mb-4">Get Insights</h3>
              <p className="text-bolt-gray-600">
                Receive clear explanations, risk assessments, and actionable insights you can actually understand.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-bolt-gray-900 mb-6">
              Trusted by Thousands
            </h2>
            <p className="text-xl text-bolt-gray-600 max-w-3xl mx-auto">
              See how PlainSpeak is helping people understand complex information
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-bolt-gray-50 p-8 rounded-2xl">
                <div className="flex items-center mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-bolt-gray-700 mb-6 leading-relaxed">"{testimonial.content}"</p>
                <div className="flex items-center">
                  <div className="w-12 h-12 rounded-full mr-4 overflow-hidden bg-bolt-gray-200 flex items-center justify-center">
                    <img 
                      src={testimonial.avatar} 
                      alt={testimonial.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Fallback to initials if image fails to load
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent) {
                          parent.innerHTML = `<span class="text-bolt-gray-600 font-medium text-sm">${testimonial.name.split(' ').map(n => n[0]).join('')}</span>`;
                        }
                      }}
                    />
                  </div>
                  <div>
                    <div className="font-semibold text-bolt-gray-900">{testimonial.name}</div>
                    <div className="text-bolt-gray-600 text-sm">{testimonial.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8 bg-bolt-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-bolt-gray-900 mb-6">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-bolt-gray-600 max-w-3xl mx-auto">
              Choose the plan that fits your needs. Start using PlainSpeak today.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {pricingPlans.map((plan, index) => (
              <div 
                key={index}
                className={`relative bg-white rounded-2xl shadow-lg border-2 transition-all duration-300 hover:shadow-xl ${
                  plan.popular 
                    ? 'border-bolt-blue-500 scale-105' 
                    : 'border-bolt-gray-200 hover:border-bolt-blue-300'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <div className="bg-bolt-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium">
                      Most Popular
                    </div>
                  </div>
                )}
                
                <div className="p-8">
                  <div className="text-center mb-8">
                    <h3 className="text-2xl font-bold text-bolt-gray-900 mb-2">{plan.name}</h3>
                    <div className="flex items-baseline justify-center mb-2">
                      <span className="text-5xl font-bold text-bolt-gray-900">{plan.price}</span>
                      <span className="text-bolt-gray-600 ml-1">{plan.period}</span>
                    </div>
                    <p className="text-bolt-gray-600">{plan.description}</p>
                  </div>

                  <ul className="space-y-4 mb-8">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-start space-x-3">
                        <Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-bolt-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={onGetStarted}
                    className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors ${
                      plan.popular
                        ? 'bg-bolt-blue-600 hover:bg-bolt-blue-700 text-white'
                        : 'bg-bolt-gray-100 hover:bg-bolt-gray-200 text-bolt-gray-900'
                    }`}
                  >
                    {plan.buttonText}
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <p className="text-bolt-gray-600 mb-4">
              All plans include secure document processing • Cancel anytime
            </p>
            <p className="text-sm text-bolt-gray-500">
              Need a custom solution? <a href="#" className="text-bolt-blue-600 hover:text-bolt-blue-700 font-medium">Contact our sales team</a>
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-bolt-gray-900 text-white py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center mb-12">
            {/* Logo and Tagline */}
            <div className="text-center md:text-left mb-8 md:mb-0">
              <div className="flex items-center justify-center md:justify-start space-x-3 mb-4">
                <div className="p-2 bg-bolt-blue-600 rounded-xl">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
                <span className="text-xl font-bold">PlainSpeak</span>
              </div>
              <p className="text-bolt-gray-400 leading-relaxed">
                Making complex information accessible to everyone.
              </p>
            </div>

            {/* Connect */}
            <div className="text-center md:text-left">
              <h3 className="font-semibold mb-4">Connect</h3>
              <div className="flex justify-center md:justify-start space-x-4">
                <a href="#" className="p-2 bg-bolt-gray-800 rounded-lg hover:bg-bolt-gray-700 transition-colors">
                  <Twitter className="h-5 w-5" />
                </a>
                <a href="#" className="p-2 bg-bolt-gray-800 rounded-lg hover:bg-bolt-gray-700 transition-colors">
                  <Github className="h-5 w-5" />
                </a>
                <a href="#" className="p-2 bg-bolt-gray-800 rounded-lg hover:bg-bolt-gray-700 transition-colors">
                  <Linkedin className="h-5 w-5" />
                </a>
                <a href="#" className="p-2 bg-bolt-gray-800 rounded-lg hover:bg-bolt-gray-700 transition-colors">
                  <Mail className="h-5 w-5" />
                </a>
              </div>
            </div>
          </div>

          <div className="border-t border-bolt-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center">
            <div className="text-center md:text-left mb-4 md:mb-0">
              <p className="text-bolt-gray-400 text-sm mb-2">
                © 2025 PlainSpeak. All rights reserved.
              </p>
              <p className="text-bolt-gray-500 text-xs">
                Built with <a href="https://bolt.new" target="_blank" rel="noopener noreferrer" className="text-bolt-blue-400 hover:text-bolt-blue-300 transition-colors">Bolt.new</a>
              </p>
            </div>
            <div className="flex space-x-6 text-sm text-bolt-gray-400">
              <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-white transition-colors">Cookie Policy</a>
              <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}