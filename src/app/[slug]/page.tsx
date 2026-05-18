import { notFound } from 'next/navigation';
import { getPageConfig, getMarkdownContent, getBibtexContent } from '@/lib/content';
import { getConfig } from '@/lib/config';
import { parseBibTeX } from '@/lib/bibtexParser';
import DynamicPageClient, { type DynamicPageLocaleData } from '@/components/pages/DynamicPageClient';
import {
    BasePageConfig,
    PublicationPageConfig,
    TextPageConfig,
    CardPageConfig
} from '@/types/page';
import { getRuntimeI18nConfig } from '@/lib/i18n/config';

import { Metadata } from 'next';

export function generateStaticParams() {
    const config = getConfig();
    return config.navigation
        .filter(nav => nav.type === 'page' && nav.target !== 'about')
        .map(nav => ({
            slug: nav.target,
        }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const { slug } = await params;
    const pageConfig = getPageConfig(slug) as BasePageConfig | null;

    if (!pageConfig) {
        return {};
    }

    return {
        title: pageConfig.title,
        description: pageConfig.description,
    };
}

function loadDynamicPageData(slug: string, locale?: string): DynamicPageLocaleData | null {
    const pageConfig = getPageConfig(slug, locale) as BasePageConfig | null;

    if (!pageConfig) {
        return null;
    }

    if (pageConfig.type === 'publication') {
        const config = pageConfig as PublicationPageConfig;
        const bibtex = getBibtexContent(config.source, locale);
        return {
            type: 'publication',
            config,
            publications: parseBibTeX(bibtex),
        };
    }

    if (pageConfig.type === 'text') {
        const config = pageConfig as TextPageConfig;
        return {
            type: 'text',
            config,
            content: getMarkdownContent(config.source, locale),
        };
    }

    if (pageConfig.type === 'card') {
        return {
            type: 'card',
            config: pageConfig as CardPageConfig,
        };
    }

    return null;
}

export default async function DynamicPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const baseConfig = getConfig();
    const runtimeI18n = getRuntimeI18nConfig(baseConfig.i18n);
    const targetLocales = runtimeI18n.enabled ? runtimeI18n.locales : [runtimeI18n.defaultLocale];
    const dataByLocale: Record<string, DynamicPageLocaleData> = {};

    for (const locale of targetLocales) {
        const data = loadDynamicPageData(slug, locale);
        if (data) {
            dataByLocale[locale] = data;
        }
    }

    if (!dataByLocale[runtimeI18n.defaultLocale]) {
        const fallback = loadDynamicPageData(slug);
        if (fallback) {
            dataByLocale[runtimeI18n.defaultLocale] = fallback;
        }
    }

    if (Object.keys(dataByLocale).length === 0) {
        notFound();
    }

    return <DynamicPageClient dataByLocale={dataByLocale} defaultLocale={runtimeI18n.defaultLocale} />;
}
