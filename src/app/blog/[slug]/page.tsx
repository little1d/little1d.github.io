import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import BlogPostClient from '@/components/blog/BlogPostClient';
import { getBlogConfig, getBlogPostSlugs } from '@/lib/blog';
import { getConfig } from '@/lib/config';
import { getMarkdownContent } from '@/lib/content';
import { getRuntimeI18nConfig } from '@/lib/i18n/config';
import type { BlogPostData } from '@/types/blog';

export function generateStaticParams() {
  return getBlogPostSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogConfig(undefined, { includeDrafts: true })?.posts.find((item) => item.slug === slug);

  if (!post) return {};

  return {
    title: post.title,
    description: post.summary,
    robots: post.status === 'draft' ? { index: false, follow: false } : undefined,
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const baseConfig = getConfig();
  const runtimeI18n = getRuntimeI18nConfig(baseConfig.i18n);
  const targetLocales = runtimeI18n.enabled ? runtimeI18n.locales : [runtimeI18n.defaultLocale];
  const dataByLocale: Record<string, BlogPostData> = {};

  for (const locale of targetLocales) {
    const post = getBlogConfig(locale, { includeDrafts: true })?.posts.find((item) => item.slug === slug);
    if (post) {
      dataByLocale[locale] = {
        post,
        content: getMarkdownContent(post.source, locale),
      };
    }
  }

  if (!dataByLocale[runtimeI18n.defaultLocale]) {
    notFound();
  }

  return <BlogPostClient dataByLocale={dataByLocale} defaultLocale={runtimeI18n.defaultLocale} />;
}
