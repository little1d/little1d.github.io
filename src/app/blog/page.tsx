import type { Metadata } from 'next';
import BlogIndexClient from '@/components/blog/BlogIndexClient';
import { getBlogConfig } from '@/lib/blog';
import { getConfig } from '@/lib/config';
import { getRuntimeI18nConfig } from '@/lib/i18n/config';
import type { BlogConfig } from '@/types/blog';

export const metadata: Metadata = {
  title: 'Blog',
  description: 'Notes on AI for science, protein design, and learning systems.',
};

export default function BlogPage() {
  const baseConfig = getConfig();
  const runtimeI18n = getRuntimeI18nConfig(baseConfig.i18n);
  const targetLocales = runtimeI18n.enabled ? runtimeI18n.locales : [runtimeI18n.defaultLocale];
  const dataByLocale: Record<string, BlogConfig> = {};

  for (const locale of targetLocales) {
    const config = getBlogConfig(locale);
    if (config) dataByLocale[locale] = config;
  }

  return <BlogIndexClient dataByLocale={dataByLocale} defaultLocale={runtimeI18n.defaultLocale} />;
}
