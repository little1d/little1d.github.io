'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowUpRight, CalendarDays } from 'lucide-react';
import { useLocaleStore } from '@/lib/stores/localeStore';
import type { BlogConfig } from '@/types/blog';

interface BlogIndexClientProps {
  dataByLocale: Record<string, BlogConfig>;
  defaultLocale: string;
}

export default function BlogIndexClient({ dataByLocale, defaultLocale }: BlogIndexClientProps) {
  const locale = useLocaleStore((state) => state.locale);
  const config = dataByLocale[locale] || dataByLocale[defaultLocale] || Object.values(dataByLocale)[0];

  if (!config) return null;

  return (
    <div className="mx-auto min-w-0 max-w-4xl overflow-x-clip px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <motion.header
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="mb-8 border-b border-neutral-200 pb-6 sm:mb-10 sm:pb-8 dark:border-neutral-800"
      >
        <h1 className="mb-3 break-words text-3xl font-bold font-serif text-primary sm:text-4xl">{config.title}</h1>
        {config.description && (
          <p className="max-w-2xl text-base leading-relaxed text-neutral-600 sm:text-lg dark:text-neutral-500">
            {config.description}
          </p>
        )}
      </motion.header>

      <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
        {config.posts.map((post, index) => (
          <motion.article
            key={post.slug}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.05 }}
            className="py-7 first:pt-0"
          >
            <Link href={`/blog/${post.slug}`} className="group block">
              <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-neutral-500">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                  {post.date}
                </span>
              </div>

              <div className="flex min-w-0 items-start justify-between gap-3 sm:gap-4">
                <div className="min-w-0">
                  <h2 className="mb-2 break-words text-xl font-bold font-serif text-primary transition-colors group-hover:text-accent sm:text-2xl">
                    {post.title}
                  </h2>
                  <p className="max-w-2xl break-words text-sm leading-relaxed text-neutral-600 sm:text-base dark:text-neutral-500">
                    {post.summary}
                  </p>
                </div>
                <ArrowUpRight className="mt-1 h-5 w-5 shrink-0 text-neutral-400 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent" aria-hidden="true" />
              </div>

              {post.tags && post.tags.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {post.tags.map((tag) => (
                    <span key={tag} className="text-xs text-neutral-500">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </Link>
          </motion.article>
        ))}
      </div>
    </div>
  );
}
