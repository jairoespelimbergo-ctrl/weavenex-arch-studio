import React, { useState } from 'react';
import { Download, Share, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className="inline-flex items-center gap-1.5 border border-[#0B0C0E]/25 bg-[#0B0C0E]/5 px-3 py-2 text-xs font-semibold text-[#0B0C0E] transition-colors hover:border-[#D9381E] hover:text-[#D9381E] whitespace-nowrap shrink-0 cursor-pointer"
      >
        <Download className="h-3.5 w-3.5" />
        Install App
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="inline-flex items-center gap-1.5 border border-[#0B0C0E]/25 bg-[#0B0C0E]/5 px-3 py-2 text-xs font-semibold text-[#0B0C0E] transition-colors hover:border-[#D9381E] hover:text-[#D9381E] whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Download className="h-3.5 w-3.5" />
          Install App
        </button>

        {showIOSGuide && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
            onClick={() => setShowIOSGuide(false)}
          >
            <div
              className="w-full max-w-sm border border-[#2A2E35] bg-[#141619] p-6 text-[#F4F4F2] shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-[#2A2E35] pb-3">
                <h3 className="font-display text-base font-bold text-[#F4F4F2]">
                  Install on iPhone / iPad
                </h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  aria-label="Close"
                  className="p-1 text-[#9CA3AF] hover:text-white cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <ol className="mt-4 space-y-2.5 text-sm text-[#D1D5DB]">
                <li className="flex items-start gap-2">
                  <span className="font-mono text-[#D9381E]">01.</span>
                  <span>
                    Tap the <strong className="text-white inline-flex items-center gap-1">Share <Share className="h-3.5 w-3.5 inline" /></strong> button in the Safari toolbar.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-mono text-[#D9381E]">02.</span>
                  <span>
                    Scroll down and tap <strong className="text-white">Add to Home Screen</strong>.
                  </span>
                </li>
              </ol>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-6 w-full bg-[#D9381E] py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[#B82D16] cursor-pointer"
              >
                Got It
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
