import { getTomlContent } from '@/lib/content';
import type { BlogConfig } from '@/types/blog';

interface GetBlogConfigOptions {
  includeDrafts?: boolean;
}

function getRawBlogConfig(locale?: string): BlogConfig | null {
  return getTomlContent<BlogConfig>('blog.toml', locale);
}

export function getBlogConfig(locale?: string, options: GetBlogConfigOptions = {}): BlogConfig | null {
  const config = getRawBlogConfig(locale);

  if (!config) {
    return null;
  }

  return {
    ...config,
    posts: (config.posts || [])
      .filter((post) => options.includeDrafts || post.status === 'published')
      .sort((a, b) => b.date.localeCompare(a.date)),
  };
}

export function getBlogPostSlugs(locale?: string): string[] {
  const config = getRawBlogConfig(locale);
  return (config?.posts || []).map((post) => post.slug);
}
