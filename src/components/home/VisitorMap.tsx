'use client';

import { useEffect, useRef, useState } from 'react';

interface VisitorMapProps {
    scriptId?: string;
    scriptSrc?: string;
    linkHref?: string;
    linkLabel: string;
    pendingText: string;
    unavailableText: string;
}

function isPlaceholder(value?: string) {
    return !value || value.includes('REPLACE_WITH_');
}

export default function VisitorMap({
    scriptId = 'visitor-map',
    scriptSrc,
    linkHref,
    linkLabel,
    pendingText,
    unavailableText,
}: VisitorMapProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [failed, setFailed] = useState(false);
    const hasConfiguredScript = typeof scriptSrc === 'string' && !isPlaceholder(scriptSrc);

    useEffect(() => {
        const container = containerRef.current;

        if (!container || !hasConfiguredScript) {
            return;
        }

        const src = scriptSrc;
        container.innerHTML = '';
        setFailed(false);

        const script = document.createElement('script');
        script.id = scriptId;
        script.async = true;
        script.src = src;
        script.onerror = () => setFailed(true);
        container.appendChild(script);

        return () => {
            container.innerHTML = '';
        };
    }, [hasConfiguredScript, scriptId, scriptSrc]);

    return (
        <div className="visitor-map-widget mx-auto flex min-h-[172px] w-full items-center justify-center overflow-visible rounded-md bg-white/80 p-2 text-center dark:bg-neutral-900/60">
            {!hasConfiguredScript ? (
                <p className="max-w-[13rem] text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
                    {pendingText}
                </p>
            ) : failed ? (
                <div className="max-w-[13rem] space-y-2 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
                    <p>{unavailableText}</p>
                    {linkHref && !isPlaceholder(linkHref) && (
                        <a href={linkHref} target="_blank" rel="noopener noreferrer" className="text-accent underline underline-offset-4">
                            {linkLabel}
                        </a>
                    )}
                </div>
            ) : (
                <>
                    <div ref={containerRef} className="mx-auto w-full min-w-[180px] max-w-[300px]" />
                    {linkHref && !isPlaceholder(linkHref) && (
                        <a href={linkHref} target="_blank" rel="noopener noreferrer" className="sr-only">
                            Visitor map stats
                        </a>
                    )}
                </>
            )}
        </div>
    );
}
