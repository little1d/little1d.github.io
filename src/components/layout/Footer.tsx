'use client';

import Script from "next/script";

interface FooterProps {
  lastUpdated?: string;
}

export default function Footer({ lastUpdated }: FooterProps) {
  return (
    <footer className="border-t border-neutral-200/50 bg-neutral-50/50 dark:bg-neutral-900/50 dark:border-neutral-700/50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col gap-4 items-center">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-2 w-full">
            <p className="text-xs text-neutral-500">
              Last updated: {lastUpdated || new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
            <p className="text-xs text-neutral-500 flex items-center">
              <a href="https://github.com/xyjoey/PRISM" target="_blank" rel="noopener noreferrer">
                Built with PRISM
              </a>
              <span className="ml-2">🚀</span>
            </p>
          </div>

          <div className="w-full max-w-xs flex justify-center opacity-80 hover:opacity-100 transition-opacity min-h-[100px]" id="map-container">
            {/* Use a unique ID for the container if needed by the script, but the script uses its own ID */}
            <Script
              id="mapmyvisitors"
              src="//mapmyvisitors.com/map.js?d=QnlqsjpPEA2jjXVOfycSjBKwvhgB1_2_lBd-O98EYqg&cl=ffffff&w=a"
              strategy="lazyOnload"
            />
          </div>
        </div>
      </div>
    </footer>
  );
}