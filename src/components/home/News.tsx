'use client';

import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';

export interface NewsItem {
    date: string;
    content: string;
}

interface NewsProps {
    items: NewsItem[];
    title?: string;
}

export default function News({ items, title = 'News' }: NewsProps) {
    return (
        <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
        >
            <h2 className="text-2xl font-serif font-bold text-primary mb-4">{title}</h2>
            <div className="space-y-3">
                {items.map((item, index) => (
                    <div key={index} className="flex items-start space-x-3">
                        <span className="text-xs text-neutral-500 mt-1 w-16 flex-shrink-0">{item.date}</span>
                        <div className="prose prose-sm dark:prose-invert max-w-none text-sm text-neutral-700">
                            <ReactMarkdown
                                components={{
                                    a: (props) => {
                                        const { node: _node, ...rest } = props;
                                        void _node;
                                        return (
                                            <a
                                                {...rest}
                                                className="text-accent hover:underline font-medium"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                            />
                                        );
                                    },
                                    p: (props) => {
                                        const { node: _node, ...rest } = props;
                                        void _node;
                                        return <p {...rest} className="m-0" />;
                                    },
                                }}
                            >
                                {item.content}
                            </ReactMarkdown>
                        </div>
                    </div>
                ))}
            </div>
        </motion.section>
    );
}
