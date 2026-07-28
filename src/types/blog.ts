export type BlogPostStatus = 'draft' | 'published';

export interface BlogPostMeta {
  slug: string;
  title: string;
  date: string;
  summary: string;
  tags?: string[];
  source: string;
  status: BlogPostStatus;
}

export interface BlogConfig {
  title: string;
  description?: string;
  posts: BlogPostMeta[];
}

export interface BlogPostData {
  post: BlogPostMeta;
  content: string;
}
