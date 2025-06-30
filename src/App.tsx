import React, { useState, useEffect } from 'react';
import { 
  Scale, 
  Heart, 
  DollarSign, 
  Hammer, 
  BookOpen, 
  Home, 
  Monitor, 
  TrendingUp, 
  Shield,
  ArrowLeft,
  Upload,
  MessageCircle,
  FileText,
  Sparkles,
  AlertCircle,
  Loader2,
  Brain,
  Zap,
  LogOut,
  User,
  BarChart3,
  Settings
} from 'lucide-react';
import { useCachedAPI } from './hooks/useCachedAPI';
import { useAuth } from './hooks/useAuth';
import { useNotification } from './hooks/useNotification';
import { CacheStats } from './components/CacheStats';
import { DocumentUpload } from './components/DocumentUpload';
import { LandingPage } from './components/LandingPage';
import { AuthForm } from './components/auth/AuthForm';
import { PasswordResetForm } from './components/auth/PasswordResetForm';
import { UserDashboard } from './components/UserDashboard';
import { AdminPanel } from './components/AdminPanel';
import { Notification } from './components/Notification';
import { ErrorBoundary } from './components/ErrorBoundary';
import { FullPageLoading } from './components/LoadingSpinner';
import { cleanAIResponse } from './utils/textCleaner';
import { ProcessedDocument } from './utils/documentProcessor';
import { parseError, logError } from './utils/errorHandler';

interface Tool {
  id: string;
  name: string;
  icon: React.ComponentType<any>;
  description: string;
  color: string;
  bgColor: string;
  problem: string;
  features: string[];
}

const tools: Tool[] = [
  {
    id: 'legalese',
    name: 'Legalese Decoder',
    icon: Scale,
    description: 'AI Contract Simplifier',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 hover:bg-blue-100',
    problem: 'Transform complex legal documents into clear, understandable language. No more paying lawyers hundreds of dollars just to understand what you\'re signing. Get instant explanations of contract terms, clauses, and legal obligations in plain English.',
    features: [
      'Instant contract analysis with jargon highlighting',
      'Plain-English explanations of legal terms',
      'Risk assessment and red flag identification',
      'Clause-by-clause breakdown with examples',
      'Legal obligation summaries you can actually understand'
    ]
  },
  {
    id: 'medispeak',
    name: 'MediSpeak',
    icon: Heart,
    description: 'Medical Jargon Translator',
    color: 'text-red-600',
    bgColor: 'bg-red-50 hover:bg-red-100',
    problem: 'Bridge the communication gap between healthcare providers and patients. Turn confusing medical terminology into clear explanations so you can make informed decisions about your health and treatment options.',
    features: [
      'Medical term translations with visual aids',
      'Drug interaction checker with safety alerts',
      'Treatment plan explanations in simple language',
      'Symptom description helper for doctor visits',
      'Lab result interpreter with normal ranges'
    ]
  },
  {
    id: 'finfriend',
    name: 'FinFriend',
    icon: DollarSign,
    description: 'Financial Product Demystifier',
    color: 'text-green-600',
    bgColor: 'bg-green-50 hover:bg-green-100',
    problem: 'Make smart financial decisions with confidence. Cut through the complexity of investment products, loan terms, and financial jargon to understand exactly what you\'re getting into and how it affects your money.',
    features: [
      'Investment product comparisons made simple',
      'Hidden fee detector and transparency alerts',
      'Personalized financial advice based on your goals',
      'Risk assessment in everyday language',
      'ROI calculator with real-world examples'
    ]
  },
  {
    id: 'buildbot',
    name: 'BuildBot',
    icon: Hammer,
    description: 'Construction Permit Assistant',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50 hover:bg-orange-100',
    problem: 'Navigate construction permits and building codes without the headache. Get step-by-step guidance through the bureaucratic maze so you can focus on your project, not paperwork.',
    features: [
      'Interactive permit requirement wizard',
      'Step-by-step application checklists',
      'Building code explanations with examples',
      'Timeline estimator for approval processes',
      'Local regulation compliance guides'
    ]
  },
  {
    id: 'edusimplify',
    name: 'EduSimplify',
    icon: BookOpen,
    description: 'Academic Paper Translator',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50 hover:bg-purple-100',
    problem: 'Accelerate your learning and research by making academic papers accessible. Transform dense research into digestible insights and spend more time understanding concepts, less time decoding jargon.',
    features: [
      'Research paper summarization with key insights',
      'Academic term definitions with context',
      'Automatic flashcard generation for studying',
      'Citation tracker and reference organizer',
      'Concept mapping for complex theories'
    ]
  },
  {
    id: 'homelingo',
    name: 'HomeLingo',
    icon: Home,
    description: 'Real Estate Contract Clarifier',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50 hover:bg-indigo-100',
    problem: 'Buy or sell property with complete understanding. Decode real estate contracts, understand market terms, and know exactly what each clause means for your biggest financial decision.',
    features: [
      'Contract analysis with buyer protection insights',
      'Market impact explanations for each clause',
      'Closing cost breakdown and timeline',
      'Property value factors in simple terms',
      'Negotiation point identification and advice'
    ]
  },
  {
    id: 'techtalk',
    name: 'TechTalk',
    icon: Monitor,
    description: 'IT Support Conversational Agent',
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-50 hover:bg-cyan-100',
    problem: 'Solve tech problems without the frustration. Get clear explanations of error messages, step-by-step troubleshooting guides, and solutions that actually make sense to non-technical users.',
    features: [
      'Error message translation into plain English',
      'Visual troubleshooting guides with screenshots',
      'Automated fix suggestions you can follow',
      'Hardware compatibility checker',
      'Software recommendation engine'
    ]
  },
  {
    id: 'adanalyst',
    name: 'AdAnalyst',
    icon: TrendingUp,
    description: 'Marketing Metric Translator',
    color: 'text-pink-600',
    bgColor: 'bg-pink-50 hover:bg-pink-100',
    problem: 'Turn marketing data into actionable business insights. Understand what your advertising metrics really mean and get clear recommendations to improve your campaigns and grow your business.',
    features: [
      'Campaign performance insights in business terms',
      'A/B test recommendations with predicted outcomes',
      'ROI explanations with profit projections',
      'Audience analysis in understandable language',
      'Budget optimization suggestions'
    ]
  },
  {
    id: 'policypal',
    name: 'PolicyPal',
    icon: Shield,
    description: 'Insurance Jargon Assistant',
    color: 'text-teal-600',
    bgColor: 'bg-teal-50 hover:bg-teal-100',
    problem: 'Understand your insurance coverage completely. Know exactly what\'s covered, what\'s not, and how much you\'ll actually receive when you need to file a claim.',
    features: [
      'Coverage explanations with real-world scenarios',
      'Claim estimator with payout predictions',
      'Policy comparison tool with pros and cons',
      'Deductible impact calculator',
      'Premium optimization recommendations'
    ]
  }
];

function App() {
  const { user, loading: authLoading, signOut } = useAuth();
  const { 
    notifications, 
    showSuccess, 
    showError, 
    showWarning, 
    showInfo,
    dismissNotification 
  } = useNotification();
  
  const [showLanding, setShowLanding] = useState(true);
  const [showAuth, setShowAuth] = useState(false);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [currentTool, setCurrentTool] = useState<string | null>(null);
  const [processedDocument, setProcessedDocument] = useState<ProcessedDocument | null>(null);
  const [messages, setMessages] = useState<Array<{type: 'user' | 'assistant', content: string, isDeepThinking?: boolean, fromCache?: boolean}>>([]);
  const [inputText, setInputText] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Use the cached API hook with enhanced error handling
  const { isLoading, callAPI, clearToolCache } = useCachedAPI({
    toolId: currentTool || '',
    onSuccess: (data, fromCache) => {
      setMessages(prev => [...prev, {
        type: 'assistant',
        content: cleanAIResponse(data.response),
        isDeepThinking: data.modelUsed === 'gemini-2.5-flash',
        fromCache
      }]);
      
      if (fromCache) {
        showInfo('Response loaded from cache', 'This response was retrieved instantly from our cache.');
      } else {
        showSuccess('Response generated', `Generated using ${data.modelUsed.includes('flash-lite') ? 'Fast Mode' : 'Deep Analysis Mode'}.`);
      }
    },
    onError: (err) => {
      const errorDetails = parseError(err);
      logError(err, { tool: currentTool, hasDocument: !!processedDocument });
      
      setError(errorDetails.userMessage);
      showError('Request Failed', errorDetails.userMessage, {
        persistent: errorDetails.severity === 'critical'
      });
      
      setMessages(prev => [...prev, {
        type: 'assistant',
        content: "I apologize, but I'm having trouble processing your request right now. " + 
                (errorDetails.retryable ? "Please try again in a moment." : "Please check your input and try again.")
      }]);
    }
  });

  // Check for password reset in URL
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const isPasswordReset = window.location.pathname === '/reset-password' || urlParams.has('type') && urlParams.get('type') === 'recovery';
    
    if (isPasswordReset) {
      setShowPasswordReset(true);
      setShowLanding(false);
      setShowAuth(false);
    }
  }, []);

  const handleGetStarted = () => {
    if (user) {
      setShowLanding(false);
      showSuccess('Welcome back!', `Good to see you again, ${user.email}`);
    } else {
      setShowAuth(true);
    }
  };

  const handleAuthSuccess = () => {
    setShowAuth(false);
    setShowPasswordReset(false);
    setShowLanding(false);
    showSuccess('Welcome to PlainSpeak!', 'Your account is ready. Start exploring our AI tools.');
  };

  const handlePasswordResetSuccess = () => {
    setShowPasswordReset(false);
    setShowAuth(true);
    showSuccess('Password updated!', 'You can now sign in with your new password.');
  };

  const handleBackToLanding = () => {
    setShowLanding(true);
    setShowAuth(false);
    setShowPasswordReset(false);
    setShowDashboard(false);
    setShowAdminPanel(false);
    setCurrentTool(null);
    setMessages([]);
    setProcessedDocument(null);
    setInputText('');
    setError(null);
    
    // Clear URL parameters
    window.history.replaceState({}, document.title, window.location.pathname);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      setShowLanding(true);
      setShowDashboard(false);
      setShowAdminPanel(false);
      setCurrentTool(null);
      setMessages([]);
      setProcessedDocument(null);
      setInputText('');
      setError(null);
      showInfo('Signed out successfully', 'You have been signed out of your account.');
    } catch (error) {
      const errorDetails = parseError(error);
      logError(error, { action: 'sign_out' });
      showError('Sign out failed', errorDetails.userMessage);
    }
  };

  const handleToolSelect = (toolId: string) => {
    setCurrentTool(toolId);
    setShowDashboard(false);
    setShowAdminPanel(false);
    setMessages([]);
    setProcessedDocument(null);
    setInputText('');
    setError(null);
    
    const tool = tools.find(t => t.id === toolId);
    if (tool) {
      showInfo(`${tool.name} activated`, 'Ready to help you understand complex information.');
    }
  };

  const handleShowDashboard = () => {
    setShowDashboard(true);
    setShowAdminPanel(false);
    setCurrentTool(null);
    setMessages([]);
    setProcessedDocument(null);
    setInputText('');
    setError(null);
  };

  const handleShowAdminPanel = () => {
    if (user?.isAdmin) {
      setShowAdminPanel(true);
      setShowDashboard(false);
      setCurrentTool(null);
      setMessages([]);
      setProcessedDocument(null);
      setInputText('');
      setError(null);
    } else {
      showError('Access Denied', 'You do not have permission to access the admin panel.');
    }
  };

  const handleDocumentProcessed = (document: ProcessedDocument) => {
    setProcessedDocument(document);
    setError(null);
    
    showSuccess(
      'Document processed successfully', 
      `Analyzed ${document.metadata.wordCount.toLocaleString()} words with ${document.analysis.complexity} complexity.`
    );
    
    // Generate initial analysis message
    const analysisMessage = `Perfect! I've successfully analyzed your document "${document.metadata.fileName}". Here's what I found:

📊 **Document Overview:**
- ${document.metadata.wordCount.toLocaleString()} words across ${document.structure.sections.length} sections
- Complexity level: ${document.analysis.complexity}
- Readability score: ${document.analysis.readabilityScore}
- Processing time: ${document.metadata.processingTime}ms

🔍 **Key Insights:**
- ${(document.analysis.jargonDensity * 100).toFixed(1)}% technical terminology density
- ${document.analysis.technicalTerms.length} technical terms identified
- Estimated reading time: ${Math.ceil(document.metadata.wordCount / 200)} minutes

I'm now ready to answer any questions about the content, explain complex terms, or provide detailed analysis of specific sections. What would you like to know?`;

    setMessages([{
      type: 'assistant',
      content: analysisMessage
    }]);
  };

  const handleDocumentError = (errorMessage: string) => {
    setError(errorMessage);
    setProcessedDocument(null);
    showError('Document processing failed', errorMessage);
  };

  const handleSendMessage = async (useDeepThinking: boolean = false) => {
    if (!inputText.trim() || isLoading || !currentTool) return;
    
    const userMessage = inputText.trim();
    const newMessages = [...messages, { 
      type: 'user' as const, 
      content: userMessage,
      isDeepThinking: useDeepThinking
    }];
    setMessages(newMessages);
    setInputText('');
    setError(null);

    try {
      await callAPI(userMessage, processedDocument?.content, useDeepThinking);
    } catch (err) {
      // Error handling is done in the hook
    }
  };

  const handleThinkDeeply = () => {
    handleSendMessage(true);
  };

  // Global error handler for the error boundary
  const handleGlobalError = (error: Error, errorInfo: any) => {
    logError(error, { errorInfo, component: 'App' });
    showError(
      'Application Error', 
      'A critical error occurred. The page will reload automatically.',
      { persistent: true }
    );
  };

  // Show loading spinner while checking auth
  if (authLoading) {
    return <FullPageLoading message="PlainSpeak" submessage="Initializing your session..." />;
  }

  return (
    <ErrorBoundary onError={handleGlobalError}>
      <div className="min-h-screen">
        {/* Global Notifications */}
        <Notification 
          notifications={notifications} 
          onDismiss={dismissNotification} 
        />

        {/* Show password reset form */}
        {showPasswordReset && (
          <PasswordResetForm 
            onSuccess={handlePasswordResetSuccess} 
            onBack={handleBackToLanding}
            onError={(error) => showError('Password Reset Error', error)}
            onInfo={(message) => showInfo('Info', message)}
          />
        )}

        {/* Show auth form */}
        {showAuth && !showPasswordReset && (
          <AuthForm 
            onSuccess={handleAuthSuccess} 
            onBack={handleBackToLanding}
            onError={(error) => showError('Authentication Error', error)}
            onInfo={(message) => showInfo('Info', message)}
          />
        )}

        {/* Show landing page */}
        {showLanding && !showAuth && !showPasswordReset && (
          <LandingPage onGetStarted={handleGetStarted} />
        )}

        {/* Show admin panel */}
        {showAdminPanel && user?.isAdmin && !showLanding && !showAuth && !showPasswordReset && (
          <AdminPanel 
            user={user} 
            onBack={() => setShowAdminPanel(false)}
            onError={(error) => showError('Admin Panel Error', error)}
            onSuccess={(message) => showSuccess('Success', message)}
          />
        )}

        {/* Show dashboard */}
        {showDashboard && user && !showLanding && !showAuth && !showPasswordReset && !showAdminPanel && (
          <UserDashboard 
            user={user} 
            onBack={() => setShowDashboard(false)}
            onError={(error) => showError('Dashboard Error', error)}
          />
        )}

        {/* Show tool interface */}
        {currentTool && !showLanding && !showAuth && !showPasswordReset && !showDashboard && !showAdminPanel && (() => {
          const selectedTool = tools.find(tool => tool.id === currentTool);
          if (!selectedTool) return null;

          const IconComponent = selectedTool.icon;
          
          return (
            <div className="min-h-screen bg-gradient-to-br from-bolt-gray-50 to-white">
              {/* Header */}
              <div className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <div className="flex items-center justify-between h-16">
                    <button
                      onClick={handleBackToLanding}
                      className="flex items-center space-x-2 text-bolt-gray-600 hover:text-bolt-gray-900 transition-colors"
                    >
                      <ArrowLeft className="h-5 w-5" />
                      <span className="font-medium">Back to Home</span>
                    </button>
                    
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${selectedTool.bgColor.split(' ')[0]}`}>
                        <IconComponent className={`h-6 w-6 ${selectedTool.color}`} />
                      </div>
                      <div>
                        <h1 className="text-xl font-bold text-bolt-gray-900">{selectedTool.name}</h1>
                        <p className="text-sm text-bolt-gray-500">{selectedTool.description}</p>
                      </div>
                    </div>

                    {/* User Menu */}
                    <div className="flex items-center space-x-4">
                      <button
                        onClick={handleShowDashboard}
                        className="flex items-center space-x-2 text-bolt-gray-600 hover:text-bolt-gray-900 transition-colors"
                      >
                        <BarChart3 className="h-4 w-4" />
                        <span className="hidden sm:inline">Dashboard</span>
                      </button>
                      
                      {/* Admin Panel Button - Only show for admins */}
                      {user?.isAdmin && (
                        <button
                          onClick={handleShowAdminPanel}
                          className="flex items-center space-x-2 text-bolt-gray-600 hover:text-bolt-gray-900 transition-colors"
                        >
                          <Settings className="h-4 w-4" />
                          <span className="hidden sm:inline">Admin</span>
                        </button>
                      )}
                      
                      <div className="flex items-center space-x-2 text-sm text-bolt-gray-600">
                        <User className="h-4 w-4" />
                        <span>{user?.email}</span>
                        {user?.isAdmin && (
                          <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full font-medium">
                            Admin
                          </span>
                        )}
                      </div>
                      <button
                        onClick={handleSignOut}
                        className="flex items-center space-x-2 text-bolt-gray-600 hover:text-bolt-gray-900 transition-colors"
                      >
                        <LogOut className="h-4 w-4" />
                        <span className="hidden sm:inline">Sign Out</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid lg:grid-cols-3 gap-8">
                  {/* Tool Info */}
                  <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white rounded-xl shadow-sm p-6 border border-bolt-gray-100">
                      <h3 className="text-lg font-semibold text-bolt-gray-900 mb-4">About This Tool</h3>
                      <p className="text-bolt-gray-600 mb-6 leading-relaxed">{selectedTool.problem}</p>
                      
                      <h4 className="font-medium text-bolt-gray-900 mb-3">Key Features:</h4>
                      <ul className="space-y-3">
                        {selectedTool.features.map((feature, index) => (
                          <li key={index} className="flex items-start space-x-3">
                            <Sparkles className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                            <span className="text-sm text-bolt-gray-600 leading-relaxed">{feature}</span>
                          </li>
                        ))}
                      </ul>

                      <div className="mt-6 space-y-3">
                        <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                          <div className="flex items-start space-x-2">
                            <Zap className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-sm font-medium text-green-900">Fast Mode (Default)</p>
                              <p className="text-xs text-green-700 mt-1">
                                Quick responses for general questions using our optimized AI model.
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                          <div className="flex items-start space-x-2">
                            <Brain className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-sm font-medium text-purple-900">Deep Analysis Mode</p>
                              <p className="text-xs text-purple-700 mt-1">
                                Comprehensive analysis for complex questions using our most advanced AI model.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Cache Stats */}
                    <CacheStats />
                  </div>

                  {/* Main Interface */}
                  <div className="lg:col-span-2">
                    <div className="bg-white rounded-xl shadow-sm border border-bolt-gray-100">
                      {/* Upload Section */}
                      <div className="p-6 border-b border-bolt-gray-100">
                        <h3 className="text-lg font-semibold text-bolt-gray-900 mb-4">Upload Document</h3>
                        <DocumentUpload
                          onDocumentProcessed={handleDocumentProcessed}
                          onError={handleDocumentError}
                          disabled={isLoading}
                        />
                        
                        {error && (
                          <div className="mt-4 p-3 bg-red-50 rounded-lg border border-red-200">
                            <div className="flex items-center space-x-2">
                              <AlertCircle className="h-5 w-5 text-red-600" />
                              <span className="text-sm font-medium text-red-800">{error}</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Chat Interface */}
                      <div className="p-6">
                        <h3 className="text-lg font-semibold text-bolt-gray-900 mb-4">Ask Questions</h3>
                        
                        {/* Messages */}
                        <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
                          {messages.length === 0 && (
                            <div className="text-center py-8 text-bolt-gray-500">
                              <MessageCircle className="h-12 w-12 mx-auto mb-3 text-bolt-gray-300" />
                              <p>Upload a document or ask a question to get started!</p>
                              <p className="text-sm text-bolt-blue-600 mt-2">
                                Try asking about complex terms, concepts, or processes in your field.
                              </p>
                            </div>
                          )}
                          {messages.map((message, index) => (
                            <div
                              key={index}
                              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                              <div
                                className={`max-w-sm lg:max-w-md px-4 py-3 rounded-lg shadow-sm border relative ${
                                  message.type === 'user'
                                    ? message.isDeepThinking
                                      ? 'bg-purple-600 text-white border-purple-600'
                                      : 'bg-bolt-blue-600 text-white border-bolt-blue-600'
                                    : message.isDeepThinking
                                      ? 'bg-purple-50 text-bolt-gray-900 border-purple-200'
                                      : 'bg-bolt-gray-50 text-bolt-gray-900 border-bolt-gray-200'
                                }`}
                              >
                                {message.isDeepThinking && (
                                  <div className={`absolute -top-2 -right-2 p-1 rounded-full ${
                                    message.type === 'user' ? 'bg-purple-500' : 'bg-purple-100'
                                  }`}>
                                    <Brain className={`h-3 w-3 ${
                                      message.type === 'user' ? 'text-white' : 'text-purple-600'
                                    }`} />
                                  </div>
                                )}
                                {message.fromCache && message.type === 'assistant' && (
                                  <div className="absolute -top-2 -left-2 p-1 rounded-full bg-green-100">
                                    <Zap className="h-3 w-3 text-green-600" />
                                  </div>
                                )}
                                <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                                {message.fromCache && message.type === 'assistant' && (
                                  <p className="text-xs mt-2 opacity-75">⚡ Cached response</p>
                                )}
                              </div>
                            </div>
                          ))}
                          {isLoading && (
                            <div className="flex justify-start">
                              <div className="max-w-sm lg:max-w-md px-4 py-3 rounded-lg shadow-sm border bg-bolt-gray-50 text-bolt-gray-900 border-bolt-gray-200">
                                <div className="flex items-center space-x-2">
                                  <Loader2 className="h-4 w-4 animate-spin text-bolt-blue-600" />
                                  <p className="text-sm text-bolt-gray-600">Analyzing your request...</p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Input */}
                        <div className="space-y-3">
                          <div className="w-full">
                            <input
                              type="text"
                              value={inputText}
                              onChange={(e) => setInputText(e.target.value)}
                              onKeyPress={(e) => e.key === 'Enter' && !isLoading && handleSendMessage()}
                              placeholder="Ask me to explain any complex terms..."
                              disabled={isLoading}
                              className="w-full px-4 py-3 border border-bolt-gray-200 rounded-lg focus:ring-2 focus:ring-bolt-blue-500 focus:border-transparent outline-none transition-all duration-200 disabled:opacity-50"
                            />
                          </div>
                          
                          <div className="flex justify-end space-x-3">
                            <button
                              onClick={() => handleSendMessage()}
                              disabled={!inputText.trim() || isLoading}
                              className="px-6 py-3 bg-bolt-blue-600 text-white rounded-lg hover:bg-bolt-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center space-x-2 shadow-sm"
                            >
                              {isLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <Zap className="h-4 w-4" />
                                  <span>Send</span>
                                </>
                              )}
                            </button>
                            
                            <button
                              onClick={handleThinkDeeply}
                              disabled={!inputText.trim() || isLoading}
                              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium flex items-center space-x-2 shadow-sm"
                            >
                              {isLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <Brain className="h-4 w-4" />
                                  <span>Think Deeply</span>
                                </>
                              )}
                            </button>
                          </div>
                          
                          <div className="text-center">
                            <p className="text-xs text-bolt-gray-500">
                              Use <span className="font-medium text-bolt-blue-600">Send</span> for quick responses or <span className="font-medium text-purple-600">Think Deeply</span> for comprehensive analysis
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Show tools grid when not in any specific mode */}
        {!showLanding && !showAuth && !showPasswordReset && !showDashboard && !showAdminPanel && !currentTool && (
          <div className="min-h-screen bg-gradient-to-br from-bolt-blue-50 via-white to-bolt-blue-50">
            {/* Header */}
            <div className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-bolt-gray-100">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-20">
                  <button
                    onClick={handleBackToLanding}
                    className="flex items-center space-x-3"
                  >
                    <div className="p-2 bg-gradient-to-r from-bolt-blue-600 to-bolt-blue-700 rounded-xl">
                      <Sparkles className="h-8 w-8 text-white" />
                    </div>
                    <div>
                      <h1 className="text-2xl font-bold bg-gradient-to-r from-bolt-blue-600 to-bolt-blue-700 bg-clip-text text-transparent">
                        PlainSpeak
                      </h1>
                      <p className="text-sm text-bolt-gray-600">Transform jargon into plain English</p>
                    </div>
                  </button>
                  
                  <div className="flex items-center space-x-4">
                    <div className="hidden md:flex items-center space-x-4">
                      <div className="text-right">
                        <p className="text-sm font-medium text-bolt-gray-900">9 Specialized Tools</p>
                        <p className="text-xs text-bolt-gray-500">AI-powered simplification</p>
                      </div>
                    </div>
                    
                    {user && (
                      <div className="flex items-center space-x-4">
                        <button
                          onClick={handleShowDashboard}
                          className="flex items-center space-x-2 text-bolt-gray-600 hover:text-bolt-gray-900 transition-colors"
                        >
                          <BarChart3 className="h-4 w-4" />
                          <span className="hidden sm:inline">Dashboard</span>
                        </button>
                        
                        {/* Admin Panel Button - Only show for admins */}
                        {user.isAdmin && (
                          <button
                            onClick={handleShowAdminPanel}
                            className="flex items-center space-x-2 text-bolt-gray-600 hover:text-bolt-gray-900 transition-colors"
                          >
                            <Settings className="h-4 w-4" />
                            <span className="hidden sm:inline">Admin</span>
                          </button>
                        )}
                        
                        <div className="flex items-center space-x-2 text-sm text-bolt-gray-600">
                          <User className="h-4 w-4" />
                          <span className="hidden sm:inline">{user.email}</span>
                          {user.isAdmin && (
                            <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full font-medium">
                              Admin
                            </span>
                          )}
                        </div>
                        <button
                          onClick={handleSignOut}
                          className="flex items-center space-x-2 text-bolt-gray-600 hover:text-bolt-gray-900 transition-colors"
                        >
                          <LogOut className="h-4 w-4" />
                          <span className="hidden sm:inline">Sign Out</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Hero Section */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
              <div className="text-center mb-16">
                <h2 className="text-4xl md:text-6xl font-bold text-bolt-gray-900 mb-6 leading-tight">
                  Complex Jargon,
                  <span className="block bg-gradient-to-r from-bolt-blue-600 to-bolt-blue-700 bg-clip-text text-transparent">
                    Simple Explanations
                  </span>
                </h2>
                <p className="text-xl text-bolt-gray-600 max-w-3xl mx-auto leading-relaxed">
                  Stop struggling with technical terms, legal language, and industry jargon. 
                  Our AI-powered platform translates complex concepts into clear, everyday language.
                </p>
              </div>

              {/* Tools Grid */}
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tools.map((tool) => {
                  const IconComponent = tool.icon;
                  return (
                    <div
                      key={tool.id}
                      onClick={() => handleToolSelect(tool.id)}
                      className={`${tool.bgColor} rounded-2xl p-6 cursor-pointer transform transition-all duration-200 hover:scale-105 hover:shadow-lg border border-bolt-gray-100 relative`}
                    >
                      <div className="absolute top-3 right-3">
                        <div className="bg-green-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                          AI Ready
                        </div>
                      </div>
                      <div className="flex items-start justify-between mb-4">
                        <div className="p-3 bg-white rounded-xl shadow-sm">
                          <IconComponent className={`h-6 w-6 ${tool.color}`} />
                        </div>
                        <div className="text-right">
                          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                        </div>
                      </div>
                      
                      <h3 className="text-xl font-bold text-bolt-gray-900 mb-2">{tool.name}</h3>
                      <p className="text-sm font-medium text-bolt-gray-600 mb-3">{tool.description}</p>
                      <p className="text-sm text-bolt-gray-500 leading-relaxed line-clamp-3">{tool.problem.split('.')[0]}.</p>
                      
                      <div className="mt-4 pt-4 border-t border-bolt-gray-200">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-bolt-gray-500 uppercase tracking-wide">
                            Try Now
                          </span>
                          <div className="flex space-x-1">
                            {[1, 2, 3].map((i) => (
                              <div key={i} className="w-1.5 h-1.5 bg-bolt-gray-300 rounded-full"></div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Features Section */}
              <div className="mt-24 grid md:grid-cols-3 gap-8">
                <div className="text-center">
                  <div className="p-4 bg-bolt-blue-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <Upload className="h-8 w-8 text-bolt-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-bolt-gray-900 mb-2">Upload & Analyze</h3>
                  <p className="text-bolt-gray-600">
                    Upload documents in any format and get instant jargon detection and explanation.
                  </p>
                </div>
                <div className="text-center">
                  <div className="p-4 bg-green-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <MessageCircle className="h-8 w-8 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-bolt-gray-900 mb-2">Ask Questions</h3>
                  <p className="text-bolt-gray-600">
                    Chat with our AI to get personalized explanations for any complex terms or concepts.
                  </p>
                </div>
                <div className="text-center">
                  <div className="p-4 bg-purple-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <Sparkles className="h-8 w-8 text-purple-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-bolt-gray-900 mb-2">Get Insights</h3>
                  <p className="text-bolt-gray-600">
                    Receive actionable insights and recommendations tailored to your specific situation.
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-bolt-gray-50 border-t border-bolt-gray-100 mt-24">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="text-center">
                  <div className="flex items-center justify-center space-x-2 mb-4">
                    <div className="p-1 bg-gradient-to-r from-bolt-blue-600 to-bolt-blue-700 rounded-lg">
                      <Sparkles className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-xl font-bold text-bolt-gray-900">PlainSpeak</span>
                  </div>
                  <p className="text-bolt-gray-600 mb-4">
                    Making complex information accessible to everyone.
                  </p>
                  <p className="text-sm text-bolt-gray-500">
                    © 2025 PlainSpeak. Powered by AI. Built for humans.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Custom Bolt.new Badge */}
        <style>
          .bolt-badge {
            transition: all 0.3s ease;
          }
          @keyframes badgeHover {
            0% { transform: scale(1) rotate(0deg); }
            50% { transform: scale(1.1) rotate(22deg); }
            100% { transform: scale(1) rotate(0deg); }
          }
          .bolt-badge:hover {
            animation: badgeHover 0.6s ease-in-out;
          }
        </style>
        <div className="fixed bottom-4 left-4 z-50">
          <a href="https://bolt.new/?rid=os72mi" target="_blank" rel="noopener noreferrer" 
             className="block transition-all duration-300 hover:shadow-2xl">
            <img src="https://storage.bolt.army/white_circle_360x360.png" 
                 alt="Built with Bolt.new badge" 
                 className="w-20 h-20 md:w-28 md:h-28 rounded-full shadow-lg bolt-badge"
                  />
          </a>
        </div>
      </div>
    </ErrorBoundary>
  );
}

export default App;