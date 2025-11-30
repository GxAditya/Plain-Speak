import React, { useState, useEffect } from 'react';
import { 
  FileText,
  LogOut,
  User,
  BarChart3,
  Settings
} from 'lucide-react';
import { useAuth } from './hooks/useAuth';
import { useNotification } from './hooks/useNotification';
import { LandingPage } from './components/LandingPage';
import { DocumentAnalyzer } from './components/DocumentAnalyzer';
import { DocumentAnalyzerNavbar } from './components/DocumentAnalyzerNavbar';
import { AuthForm } from './components/auth/AuthForm';
import { ModernAuthForm } from './components/auth/ModernAuthForm';
import { PasswordResetForm } from './components/auth/PasswordResetForm';
import { UserDashboard } from './components/UserDashboard';
import { AdminPanel } from './components/AdminPanel';
import { Notification } from './components/Notification';
import { ErrorBoundary } from './components/ErrorBoundary';
import { FullPageLoading } from './components/LoadingSpinner';
import { parseError, logError } from './utils/errorHandler';

function App() {
  const { user, loading: authLoading, signOut } = useAuth();
  const { 
    notifications, 
    showSuccess, 
    showError, 
    showInfo,
    dismissNotification 
  } = useNotification();
  
  const [showLanding, setShowLanding] = useState(true);
  const [showAuth, setShowAuth] = useState(false);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showAnalyzer, setShowAnalyzer] = useState(false);

  // Check for password reset in URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const isPasswordReset = window.location.pathname === '/reset-password' || (urlParams.has('type') && urlParams.get('type') === 'recovery');
    
    if (isPasswordReset) {
      setShowPasswordReset(true);
      setShowLanding(false);
      setShowAuth(false);
    }
  }, []);

  const handleGetStarted = () => {
    if (user) {
      setShowLanding(false);
      setShowAnalyzer(true);
      showSuccess('Welcome back!', `Good to see you again, ${user.email}`);
    } else {
      setShowAuth(true);
    }
  };

  const handleAuthSuccess = () => {
    setShowAuth(false);
    setShowPasswordReset(false);
    setShowLanding(false);
    setShowAnalyzer(true);
    showSuccess('Welcome to PlainSpeak!', 'Your account is ready. Start analyzing documents.');
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
    setShowAnalyzer(false);
    
    // Clear URL parameters
    window.history.replaceState({}, document.title, window.location.pathname);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      setShowLanding(true);
      setShowDashboard(false);
      setShowAdminPanel(false);
      setShowAnalyzer(false);
      showInfo('Signed out successfully', 'You have been signed out of your account.');
    } catch (error) {
      const errorDetails = parseError(error);
      logError(error, { action: 'sign_out' });
      showError('Sign out failed', errorDetails.userMessage);
    }
  };

  const handleShowDashboard = () => {
    setShowDashboard(true);
    setShowAdminPanel(false);
    setShowAnalyzer(false);
  };

  const handleShowAdminPanel = () => {
    if (user?.isAdmin) {
      setShowAdminPanel(true);
      setShowDashboard(false);
      setShowAnalyzer(false);
    } else {
      showError('Access Denied', 'You do not have permission to access the admin panel.');
    }
  };

  const handleShowAnalyzer = () => {
    setShowAnalyzer(true);
    setShowDashboard(false);
    setShowAdminPanel(false);
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
          <ModernAuthForm 
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
            onBack={() => {
              setShowAdminPanel(false);
              setShowAnalyzer(true);
            }}
            onError={(error) => showError('Admin Panel Error', error)}
            onSuccess={(message) => showSuccess('Success', message)}
          />
        )}

        {/* Show dashboard */}
        {showDashboard && user && !showLanding && !showAuth && !showPasswordReset && !showAdminPanel && (
          <UserDashboard 
            user={user} 
            onBack={() => {
              setShowDashboard(false);
              setShowAnalyzer(true);
            }}
            onError={(error) => showError('Dashboard Error', error)}
          />
        )}

        {/* Show Document Analyzer */}
        {showAnalyzer && user && !showLanding && !showAuth && !showPasswordReset && !showDashboard && !showAdminPanel && (
          <div className="min-h-screen bg-bolt-gray-50">
            {/* Header - Using Menubar Component */}
            <DocumentAnalyzerNavbar 
              onNavigateToDashboard={handleShowDashboard}
              onSignOut={handleSignOut}
            />

            {/* Document Analyzer */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 py-2">
              <DocumentAnalyzer />
            </main>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}

export default App;
