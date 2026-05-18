'use client';

import { useEffect, useRef, useState } from 'react';

interface VisitorMapProps {
    scriptSrc?: string;
    linkHref?: string;
    pendingText: string;
}

function isPlaceholder(value?: string) {
    return !value || value.includes('REPLACE_WITH_');
}

export default function VisitorMap({ scriptSrc, linkHref, pendingText }: VisitorMapProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        const container = containerRef.current;

        if (!container || typeof scriptSrc !== 'string' || isPlaceholder(scriptSrc)) {
            return;
        }

        const src = scriptSrc;
        container.innerHTML = '';
        setFailed(false);

        const script = document.createElement('script');
        script.id = 'clustrmaps';
        script.async = true;
        script.src = src;
        script.onerror = () => setFailed(true);
        container.appendChild(script);

        return () => {
            container.innerHTML = '';
        };
    }, [scriptSrc]);

    const showPending = isPlaceholder(scriptSrc) || failed;

    return (
        <div className="visitor-map-widget mx-auto flex min-h-[172px] w-full items-center justify-center overflow-visible rounded-md bg-white/80 p-2 text-center dark:bg-neutral-900/60">
            {showPending ? (
                <p className="max-w-[13rem] text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
                    {pendingText}
                </p>
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
