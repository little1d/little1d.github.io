'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeSlug from 'rehype-slug';
import GithubSlugger from 'github-slugger';
import { ArrowLeft, CalendarDays, ListTree } from 'lucide-react';
import { useLocaleStore } from '@/lib/stores/localeStore';
import type { BlogPostData } from '@/types/blog';

interface BlogPostClientProps {
  dataByLocale: Record<string, BlogPostData>;
  defaultLocale: string;
}

interface TableOfContentsItem {
  id: string;
  level: 2 | 3;
  label: string;
}

function resolveBlogImageSrc(src?: string | Blob): string | Blob | undefined {
  if (!src || typeof src !== 'string') return src;

  const publicAssetMarker = 'public/';
  const publicAssetIndex = src.indexOf(publicAssetMarker);

  if (publicAssetIndex >= 0) {
    return `/${src.slice(publicAssetIndex + publicAssetMarker.length)}`;
  }

  return src;
}

function getTableOfContents(content: string): TableOfContentsItem[] {
  const slugger = new GithubSlugger();
  const headings = content.matchAll(/^(#{2,3})\s+(.+?)\s*#*\s*$/gm);

  return Array.from(headings, ([, marks, rawLabel]) => {
    const label = rawLabel
      .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      .replace(/[`*_~]/g, '')
      .replace(/<[^>]+>/g, '')
      .trim();

    return {
      id: slugger.slug(label),
      level: marks.length as 2 | 3,
      label,
    };
  });
}

export default function BlogPostClient({ dataByLocale, defaultLocale }: BlogPostClientProps) {
  const locale = useLocaleStore((state) => state.locale);
  const data = dataByLocale[locale] || dataByLocale[defaultLocale] || Object.values(dataByLocale)[0];

  if (!data) return null;

  const { post, content } = data;
  const tableOfContents = getTableOfContents(content);
  const tableOfContentsLabel = locale.startsWith('zh') ? '目录' : 'Table of Contents';
  const draftLabel = locale.startsWith('zh') ? '草稿' : 'Draft';

  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="mx-auto min-w-0 max-w-3xl overflow-x-clip px-4 py-8 sm:px-6 sm:py-12 lg:px-8"
    >
      <Link href="/blog" className="mb-8 inline-flex items-center gap-2 text-sm text-neutral-500 transition-colors hover:text-accent">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Blog
      </Link>

      <header className="mb-8 border-b border-neutral-200 pb-6 sm:mb-9 sm:pb-8 dark:border-neutral-800">
        <div className="mb-4 flex flex-wrap items-center gap-3 text-sm text-neutral-500">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4" aria-hidden="true" />
            {post.date}
          </span>
          {post.status === 'draft' && (
            <span className="rounded border border-accent/30 bg-accent/5 px-2 py-0.5 text-xs font-medium text-accent">
              {draftLabel}
            </span>
          )}
        </div>
        <h1 className="break-words text-2xl font-bold font-serif leading-tight text-primary sm:text-4xl">
          {post.title}
        </h1>
        {post.tags && post.tags.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-3 text-xs text-neutral-500">
            {post.tags.map((tag) => <span key={tag}>#{tag}</span>)}
          </div>
        )}
      </header>

      {tableOfContents.length > 0 && (
        <nav aria-label={tableOfContentsLabel} className="mb-10 border-l-2 border-accent/60 pl-4 sm:pl-5">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-primary">
            <ListTree className="h-4 w-4 text-accent" aria-hidden="true" />
            {tableOfContentsLabel}
          </h2>
          <ol className="space-y-1.5 text-sm leading-relaxed">
            {tableOfContents.map((item) => (
              <li key={item.id} className={item.level === 3 ? 'pl-4 sm:pl-5' : undefined}>
                <a
                  href={`#${item.id}`}
                  className="block break-words text-neutral-600 transition-colors hover:text-accent dark:text-neutral-500"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ol>
        </nav>
      )}

      <div className="blog-markdown leading-relaxed text-neutral-700 dark:text-neutral-600">
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkMath]}
          rehypePlugins={[[rehypeKatex, { output: 'html' }], rehypeSlug]}
          remarkRehypeOptions={{
            footnoteLabel: 'References',
            footnoteBackLabel: 'Back to reference',
          }}
          components={{
            h2: ({ children, ...props }) => <h2 {...props} className="mt-10 mb-4 scroll-mt-24 border-b border-neutral-200 pb-2 text-xl font-bold font-serif text-primary sm:text-2xl dark:border-neutral-800">{children}</h2>,
            h3: ({ children, ...props }) => <h3 {...props} className="mt-8 mb-3 scroll-mt-24 text-lg font-semibold text-primary sm:text-xl">{children}</h3>,
            p: ({ children }) => <p className="mb-5 break-words last:mb-0">{children}</p>,
            ul: ({ children }) => <ul className="mb-5 ml-5 list-disc space-y-2">{children}</ul>,
            ol: ({ children }) => <ol className="mb-5 ml-5 list-decimal space-y-2">{children}</ol>,
            table: ({ children }) => (
              <span className="my-7 block max-w-full overflow-x-auto">
                <table className="w-full min-w-[36rem] border-collapse text-xs sm:text-sm">{children}</table>
              </span>
            ),
            th: ({ children }) => <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-semibold text-primary dark:border-neutral-800 dark:bg-neutral-900">{children}</th>,
            td: ({ children }) => <td className="border border-neutral-200 px-3 py-2 align-top dark:border-neutral-800">{children}</td>,
            a: ({ href, ...props }) => {
              const isPageAnchor = href?.startsWith('#');

              return (
                <a
                  {...props}
                  href={href}
                  target={isPageAnchor ? undefined : '_blank'}
                  rel={isPageAnchor ? undefined : 'noopener noreferrer'}
                  className="break-words font-medium text-accent hover:underline"
                />
              );
            },
            blockquote: ({ children }) => <blockquote className="my-6 border-l-4 border-accent/50 pl-5 font-serif text-lg italic text-neutral-600 dark:text-neutral-500">{children}</blockquote>,
            strong: ({ children }) => <strong className="font-semibold text-primary">{children}</strong>,
            img: ({ src, alt, title }) => (
              <span className="my-8 block">
                {/* Markdown authors control these local or remote image URLs. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={resolveBlogImageSrc(src)}
                  alt={alt || ''}
                  title={title}
                  loading="lazy"
                  className="h-auto w-full rounded-md border border-neutral-200 bg-white object-contain shadow-sm dark:border-neutral-800"
                />
                {title && (
                  <span className="mt-2 block text-center text-xs leading-relaxed text-neutral-500">
                    {title}
                  </span>
                )}
              </span>
            ),
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    </motion.article>
  );
}
