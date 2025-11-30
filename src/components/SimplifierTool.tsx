import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Copy, FileText, ChevronDown, Settings, Moon, Sun, Trash2, Download, X, Keyboard } from 'lucide-react';

type Level = 'simple' | 'clear' | 'preserve';
type Status = 'Ready' | 'Processing' | 'Complete' | `Error: ${string}`;
type Theme = 'light' | 'dark';

const LEVEL_LABEL: Record<Level, string> = {
  simple: 'Keep it simple (Grade 6-8)',
  clear: 'Make it clear (Grade 9-10)',
  preserve: 'Preserve detail (Grade 11-12)'
};

interface SettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  level: Level;
  onLevelChange: (level: Level) => void;
  showHighlighting: boolean;
  onHighlightingChange: (show: boolean) => void;
}

function SettingsDrawer({
  isOpen,
  onClose,
  theme,
  onThemeChange,
  level,
  onLevelChange,
  showHighlighting,
  onHighlightingChange
}: SettingsDrawerProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Drawer */}
      <div 
        className="fixed right-0 top-0 h-full w-80 bg-white dark:bg-zinc-900 shadow-xl z-50 animate-slide-in"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
      >
        <div className="flex items-center justify-between p-4 border-b border-bolt-gray-200 dark:border-zinc-700">
          <h2 id="settings-title" className="text-xl font-semibold text-bolt-gray-900 dark:text-zinc-100">Settings</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
            aria-label="Close settings"
          >
            <X className="h-5 w-5 text-bolt-gray-500" />
          </button>
        </div>

        <div className="p-4 space-y-6">
          {/* Theme Toggle */}
          <div>
            <label className="text-sm font-medium text-bolt-gray-900 dark:text-zinc-100 block mb-2">Theme</label>
            <div className="flex gap-2">
              <button
                onClick={() => onThemeChange('light')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md border transition-colors ${
                  theme === 'light' 
                    ? 'border-bolt-blue-500 bg-blue-50 text-bolt-blue-600' 
                    : 'border-bolt-gray-200 dark:border-zinc-700 text-bolt-gray-500 hover:bg-gray-50 dark:hover:bg-zinc-800'
                }`}
              >
                <Sun className="h-4 w-4" />
                <span className="text-sm">Light</span>
              </button>
              <button
                onClick={() => onThemeChange('dark')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md border transition-colors ${
                  theme === 'dark' 
                    ? 'border-bolt-blue-500 bg-blue-50 dark:bg-blue-900/30 text-bolt-blue-500' 
                    : 'border-bolt-gray-200 dark:border-zinc-700 text-bolt-gray-500 hover:bg-gray-50 dark:hover:bg-zinc-800'
                }`}
              >
                <Moon className="h-4 w-4" />
                <span className="text-sm">Dark</span>
              </button>
            </div>
          </div>

          {/* Default Level */}
          <div>
            <label className="text-sm font-medium text-bolt-gray-900 dark:text-zinc-100 block mb-2">Default simplification level</label>
            <div className="space-y-2">
              {(Object.keys(LEVEL_LABEL) as Level[]).map((l) => (
                <label key={l} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="default-level"
                    value={l}
                    checked={level === l}
                    onChange={() => onLevelChange(l)}
                    className="w-4 h-4 text-bolt-blue-500 border-bolt-gray-300 focus:ring-bolt-blue-500 focus:ring-offset-0"
                  />
                  <span className="text-sm text-bolt-gray-600 dark:text-zinc-400">{LEVEL_LABEL[l]}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Highlighting Toggle */}
          <div>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm font-medium text-bolt-gray-900 dark:text-zinc-100">Show word complexity highlighting</span>
              <button
                role="switch"
                aria-checked={showHighlighting}
                onClick={() => onHighlightingChange(!showHighlighting)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  showHighlighting ? 'bg-bolt-blue-500' : 'bg-gray-200 dark:bg-zinc-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    showHighlighting ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </label>
          </div>

          {/* Keyboard Shortcuts */}
          <div>
            <h3 className="text-sm font-medium text-bolt-gray-900 dark:text-zinc-100 mb-3 flex items-center gap-2">
              <Keyboard className="h-4 w-4" />
              Keyboard shortcuts
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-bolt-gray-600 dark:text-zinc-400">
                <span>Process text</span>
                <kbd className="px-2 py-0.5 bg-gray-100 dark:bg-zinc-800 rounded text-xs font-mono">⌘ Enter</kbd>
              </div>
              <div className="flex justify-between text-bolt-gray-600 dark:text-zinc-400">
                <span>Focus input</span>
                <kbd className="px-2 py-0.5 bg-gray-100 dark:bg-zinc-800 rounded text-xs font-mono">⌘ K</kbd>
              </div>
              <div className="flex justify-between text-bolt-gray-600 dark:text-zinc-400">
                <span>Copy output</span>
                <kbd className="px-2 py-0.5 bg-gray-100 dark:bg-zinc-800 rounded text-xs font-mono">⌘ ⇧ C</kbd>
              </div>
              <div className="flex justify-between text-bolt-gray-600 dark:text-zinc-400">
                <span>Close modal</span>
                <kbd className="px-2 py-0.5 bg-gray-100 dark:bg-zinc-800 rounded text-xs font-mono">Esc</kbd>
              </div>
            </div>
          </div>

          {/* About */}
          <div className="pt-4 border-t border-bolt-gray-200 dark:border-zinc-700">
            <h3 className="text-sm font-medium text-bolt-gray-900 dark:text-zinc-100 mb-2">About</h3>
            <p className="text-xs text-bolt-gray-500 dark:text-zinc-500">PlainSpeak v1.0.0</p>
            <p className="text-xs text-bolt-gray-500 dark:text-zinc-500">A professional text simplification tool.</p>
          </div>
        </div>
      </div>
    </>
  );
}

export const SimplifierTool: React.FC = () => {
  const [input, setInput] = useState('');
  const [level, setLevel] = useState<Level>('clear');
  const [processing, setProcessing] = useState(false);
  const [status, setStatus] = useState<Status>('Ready');
  const [output, setOutput] = useState('');
  const [copied, setCopied] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [theme, setTheme] = useState<Theme>('light');
  const [showHighlighting, setShowHighlighting] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const optionsRef = useRef<HTMLDivElement | null>(null);

  // Character / word counts
  const charCount = useMemo(() => input.length, [input]);
  const wordCount = useMemo(() => (input.trim() ? input.trim().split(/\s+/).length : 0), [input]);

  // Estimated complexity
  const estimatedGrade = useMemo(() => {
    if (!input.trim()) return '-';
    const avgWordLength = input.replace(/\s+/g, '').length / Math.max(wordCount, 1);
    if (avgWordLength < 4.5) return 'Grade 6-8';
    if (avgWordLength < 5.5) return 'Grade 9-10';
    return 'Grade 11-12';
  }, [wordCount, input]);

  // Theme effect
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  // Close options on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (optionsRef.current && !optionsRef.current.contains(e.target as Node)) {
        setShowOptions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isMod = e.ctrlKey || e.metaKey;
      
      if (isMod && e.key === 'Enter') {
        e.preventDefault();
        handleSimplify();
      }
      if (isMod && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        textareaRef.current?.focus();
      }
      if (isMod && e.shiftKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        handleCopy();
      }
      if (e.key === 'Escape') {
        setShowOptions(false);
        setShowSettings(false);
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [input, output, processing]);

  const handleSimplify = useCallback(async () => {
    if (!input.trim() || processing) return;
    setProcessing(true);
    setStatus('Processing');
    setCopied(false);

    try {
      // Simulate processing delay - replace with real API call
      await new Promise((r) => setTimeout(r, 700));

      // Demo simplification logic
      const simplified = input
        .split(/(?<=\.|\?|!)\s+/)
        .map((s) => {
          let out = s.trim();
          if (level === 'simple') {
            out = out.replace(/\band therefore\b/gi, 'so');
            out = out.replace(/\butilize\b/gi, 'use');
            out = out.replace(/\bcommence\b/gi, 'start');
            out = out.replace(/\bterminate\b/gi, 'end');
            out = out.replace(/\bsubsequently\b/gi, 'then');
            out = out.replace(/\bnevertheless\b/gi, 'but');
          } else if (level === 'clear') {
            out = out.replace(/\butilize\b/gi, 'use');
            out = out.replace(/\bcommence\b/gi, 'begin');
          }
          return out;
        })
        .join(' ');

      setOutput(simplified);
      setStatus('Complete');
    } catch (err: any) {
      setStatus(`Error: ${err?.message || 'Unknown error'}`);
    } finally {
      setProcessing(false);
    }
  }, [input, processing, level]);

  const handleClear = useCallback(() => {
    setInput('');
    setOutput('');
    setStatus('Ready');
    setCopied(false);
  }, []);

  const handleCopy = useCallback(async () => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setStatus('Error: Copy failed');
    }
  }, [output]);

  const handleExport = useCallback((format: 'txt' | 'md') => {
    if (!output) return;
    const content = format === 'md' ? `# Simplified Text\n\n${output}` : output;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `simplified.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  }, [output]);

  const getStatusColor = () => {
    if (status === 'Ready') return 'bg-bolt-gray-400';
    if (status === 'Processing') return 'bg-amber-500';
    if (status === 'Complete') return 'bg-emerald-500';
    return 'bg-red-500';
  };

  return (
    <div className={`min-h-screen bg-bolt-gray-50 dark:bg-zinc-950 ${theme === 'dark' ? 'dark' : ''}`}>
      {/* Skip to content */}
      <a href="#main-input" className="skip-link">Skip to main content</a>

      {/* Fixed Header */}
      <header className="sticky top-0 z-30 bg-white dark:bg-zinc-900 border-b border-bolt-gray-200 dark:border-zinc-800">
        <div className="flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-bolt-gray-900 dark:bg-white rounded-md flex items-center justify-center">
              <FileText className="h-5 w-5 text-white dark:text-zinc-900" />
            </div>
            <h1 className="text-lg font-semibold text-bolt-gray-900 dark:text-zinc-100">PlainSpeak</h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
              aria-label="Open settings"
              title="Settings"
            >
              <Settings className="h-5 w-5 text-bolt-gray-500 dark:text-zinc-400" />
            </button>
            <button
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
              aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
              title="Toggle theme"
            >
              {theme === 'light' ? (
                <Moon className="h-5 w-5 text-bolt-gray-500" />
              ) : (
                <Sun className="h-5 w-5 text-zinc-400" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content - Split Panel Layout */}
      <main className="flex flex-col lg:flex-row min-h-[calc(100vh-7rem)]">
        {/* Input Panel - 35% */}
        <section className="lg:w-[35%] flex flex-col border-r border-bolt-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <div className="flex-1 p-4">
            <label htmlFor="main-input" className="sr-only">Input text</label>
            <textarea
              id="main-input"
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Paste or type complex text here..."
              className="w-full h-full min-h-[300px] lg:min-h-0 resize-none p-4 text-[15px] leading-relaxed rounded-md border border-bolt-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-bolt-gray-900 dark:text-zinc-100 placeholder:text-bolt-gray-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-bolt-blue-500 focus:border-2 transition-colors"
            />
          </div>

          {/* Metadata Bar */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-bolt-gray-200 dark:border-zinc-800 bg-bolt-gray-50 dark:bg-zinc-800/50">
            <div className="flex items-center gap-4 text-sm text-bolt-gray-500 dark:text-zinc-500">
              <span>{charCount.toLocaleString()} characters</span>
              <span className="text-bolt-gray-300">•</span>
              <span>{wordCount} words</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs px-2 py-1 bg-bolt-gray-200 dark:bg-zinc-700 rounded text-bolt-gray-600 dark:text-zinc-400">
                {estimatedGrade}
              </span>

              {/* Options Dropdown */}
              <div className="relative" ref={optionsRef}>
                <button
                  onClick={() => setShowOptions(!showOptions)}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm border border-bolt-gray-200 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors btn-press"
                  aria-expanded={showOptions}
                  aria-haspopup="listbox"
                >
                  Options
                  <ChevronDown className={`h-4 w-4 transition-transform ${showOptions ? 'rotate-180' : ''}`} />
                </button>

                {showOptions && (
                  <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-zinc-800 border border-bolt-gray-200 dark:border-zinc-700 rounded-lg shadow-lg p-3 z-20 animate-fade-in">
                    <div className="text-sm font-medium text-bolt-gray-900 dark:text-zinc-100 mb-2">Simplification Level</div>
                    <div className="space-y-2" role="listbox" aria-label="Simplification level">
                      {(Object.keys(LEVEL_LABEL) as Level[]).map((l) => (
                        <label key={l} className="flex items-center gap-3 cursor-pointer p-2 rounded hover:bg-gray-50 dark:hover:bg-zinc-700">
                          <input
                            type="radio"
                            name="level"
                            value={l}
                            checked={level === l}
                            onChange={() => setLevel(l)}
                            className="w-4 h-4 text-bolt-blue-500 border-bolt-gray-300 focus:ring-bolt-blue-500 focus:ring-offset-0"
                          />
                          <span className="text-sm text-bolt-gray-600 dark:text-zinc-400">{LEVEL_LABEL[l]}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Output Panel - 65% */}
        <section className="lg:flex-1 flex flex-col bg-bolt-gray-50 dark:bg-zinc-950">
          {/* Output Header */}
          <div className="flex items-center justify-between px-6 py-3 border-b border-bolt-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
            <h2 className="text-sm font-medium text-bolt-gray-900 dark:text-zinc-100">Simplified Result</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                disabled={!output}
                className="flex items-center gap-2 px-3 py-2 text-sm text-bolt-gray-500 dark:text-zinc-400 hover:text-bolt-gray-900 dark:hover:text-zinc-100 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-md disabled:opacity-40 disabled:cursor-not-allowed transition-colors btn-press"
                title="Copy (⌘⇧C)"
              >
                <Copy className="h-4 w-4" />
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>

              {/* Export Dropdown */}
              <div className="relative group">
                <button
                  disabled={!output}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-bolt-gray-500 dark:text-zinc-400 hover:text-bolt-gray-900 dark:hover:text-zinc-100 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-md disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <Download className="h-4 w-4" />
                  <span>Export</span>
                  <ChevronDown className="h-3 w-3" />
                </button>
                {output && (
                  <div className="absolute right-0 mt-1 w-32 bg-white dark:bg-zinc-800 border border-bolt-gray-200 dark:border-zinc-700 rounded-lg shadow-lg hidden group-hover:block z-10">
                    <button
                      onClick={() => handleExport('txt')}
                      className="w-full px-3 py-2 text-left text-sm text-bolt-gray-600 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors"
                    >
                      Text (.txt)
                    </button>
                    <button
                      onClick={() => handleExport('md')}
                      className="w-full px-3 py-2 text-left text-sm text-bolt-gray-600 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors"
                    >
                      Markdown (.md)
                    </button>
                  </div>
                )}
              </div>

              <button
                onClick={() => setShowCompare(!showCompare)}
                disabled={!output}
                className={`px-3 py-2 text-sm rounded-md transition-colors btn-press disabled:opacity-40 disabled:cursor-not-allowed ${
                  showCompare 
                    ? 'bg-bolt-blue-500 text-white' 
                    : 'text-bolt-gray-500 dark:text-zinc-400 hover:text-bolt-gray-900 dark:hover:text-zinc-100 hover:bg-gray-100 dark:hover:bg-zinc-800'
                }`}
              >
                Compare
              </button>
            </div>
          </div>

          {/* Output Content */}
          <div className="flex-1 p-6 overflow-auto">
            <div className="bg-white dark:bg-zinc-900 border border-bolt-gray-200 dark:border-zinc-800 rounded-lg p-6 min-h-[300px]">
              {!output ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-16">
                  <FileText className="h-12 w-12 text-bolt-gray-300 dark:text-zinc-700 mb-4" />
                  <p className="text-[15px] text-bolt-gray-500 dark:text-zinc-500">Your simplified text will appear here</p>
                  <p className="text-sm text-bolt-gray-400 dark:text-zinc-600 mt-2">Paste text and click Simplify to get started</p>
                </div>
              ) : showCompare ? (
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 border border-bolt-gray-200 dark:border-zinc-700 rounded-md bg-bolt-gray-50 dark:bg-zinc-800">
                    <div className="text-xs font-medium text-bolt-gray-500 dark:text-zinc-500 mb-2 uppercase tracking-wide">Original</div>
                    <div className="text-[15px] text-bolt-gray-700 dark:text-zinc-300 whitespace-pre-wrap">{input || '-'}</div>
                  </div>
                  <div className="p-4 border border-bolt-gray-200 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-900">
                    <div className="text-xs font-medium text-bolt-gray-500 dark:text-zinc-500 mb-2 uppercase tracking-wide">Simplified</div>
                    <div className="text-[15px] text-bolt-gray-900 dark:text-zinc-100 whitespace-pre-wrap">{output}</div>
                  </div>
                </div>
              ) : (
                <div className="text-[15px] text-bolt-gray-900 dark:text-zinc-100 leading-relaxed whitespace-pre-wrap animate-fade-in">
                  {output}
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* Action Bar - Fixed at bottom */}
      <footer className="sticky bottom-0 z-30 bg-white dark:bg-zinc-900 border-t border-bolt-gray-200 dark:border-zinc-800">
        <div className="flex items-center justify-between h-14 px-4">
          {/* Primary Action */}
          <div className="flex items-center gap-4">
            <button
              onClick={handleSimplify}
              disabled={processing || !input.trim()}
              className="flex items-center gap-2 px-5 py-2.5 bg-bolt-blue-500 hover:bg-bolt-blue-600 text-white text-sm font-semibold rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors btn-press"
              title="Simplify (⌘ Enter)"
            >
              {processing ? 'Processing...' : 'Simplify'}
            </button>

            {/* Status Indicator */}
            <div className="flex items-center gap-2 text-sm text-bolt-gray-500 dark:text-zinc-500">
              <span className={`w-2 h-2 rounded-full ${getStatusColor()}`} aria-hidden="true" />
              <span>{status}</span>
            </div>
          </div>

          {/* Clear Button */}
          <button
            onClick={handleClear}
            className="flex items-center gap-2 px-3 py-2 text-sm text-bolt-gray-500 dark:text-zinc-400 hover:text-bolt-gray-900 dark:hover:text-zinc-100 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-md transition-colors btn-press"
          >
            <Trash2 className="h-4 w-4" />
            <span>Clear</span>
          </button>
        </div>
      </footer>

      {/* Settings Drawer */}
      <SettingsDrawer
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        theme={theme}
        onThemeChange={setTheme}
        level={level}
        onLevelChange={setLevel}
        showHighlighting={showHighlighting}
        onHighlightingChange={setShowHighlighting}
      />
    </div>
  );
};

export default SimplifierTool;
