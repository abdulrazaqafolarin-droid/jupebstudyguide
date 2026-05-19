import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Smartphone, Share } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const InstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already installed
    const standalone = window.matchMedia('(display-mode: standalone)').matches;
    setIsStandalone(standalone);

    // Check if iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    // Listen for install prompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // Show prompt after a delay (not immediately on load)
      const dismissed = localStorage.getItem('pwa-install-dismissed');
      if (!dismissed) {
        setTimeout(() => setShowPrompt(true), 5000);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // For iOS, show prompt after delay if not installed
    if (iOS && !standalone) {
      const dismissed = localStorage.getItem('pwa-install-dismissed');
      if (!dismissed) {
        setTimeout(() => setShowPrompt(true), 5000);
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  // Don't show if already installed
  if (isStandalone) return null;

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          className="fixed bottom-4 left-4 right-4 z-50 max-w-sm mx-auto"
        >
          <div className="bg-card border border-primary/30 rounded-xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-primary/20 to-accent/20 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-primary" />
                <span className="font-bold text-primary">Install App</span>
              </div>
              <button
                onClick={handleDismiss}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4">
              <p className="text-sm text-muted-foreground mb-4">
                Install JUPEB Master for offline access, faster loading, and a better study experience!
              </p>

              {isIOS ? (
                <div className="space-y-3">
                  <p className="text-sm font-medium">To install on iOS:</p>
                  <ol className="text-xs text-muted-foreground space-y-2">
                    <li className="flex items-center gap-2">
                      <span className="bg-primary/20 text-primary w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold">1</span>
                      Tap the <Share className="w-4 h-4 inline mx-1" /> Share button
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="bg-primary/20 text-primary w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold">2</span>
                      Scroll and tap "Add to Home Screen"
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="bg-primary/20 text-primary w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold">3</span>
                      Tap "Add" to confirm
                    </li>
                  </ol>
                  <Button variant="outline" className="w-full" onClick={handleDismiss}>
                    Got it!
                  </Button>
                </div>
              ) : (
                <Button onClick={handleInstall} className="w-full">
                  <Download className="w-4 h-4 mr-2" />
                  Install Now
                </Button>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default InstallPrompt;
