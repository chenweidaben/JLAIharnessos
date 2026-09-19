/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * MarkdownLite：安全的轻量 Markdown 渲染（用于 AI 问诊气泡）
 *
 * 仅支持医疗回复实际使用的子集：**加粗**、`行内代码`、有序/无序列表、
 * 分隔线、段落换行。全程用 React 元素渲染，绝不使用 dangerouslySetInnerHTML，
 * 因此即使内容来自外部大模型也不会产生 XSS。
 */
import { type ReactNode } from 'react';

/** 解析行内：**bold** 与 `code`，其余按纯文本输出 */
function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  // 捕获 **...** 或 `...`
  const re = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith('**')) {
      nodes.push(
        <strong key={`${keyPrefix}-b${i}`} className="font-semibold">
          {tok.slice(2, -2)}
        </strong>,
      );
    } else {
      nodes.push(
        <code
          key={`${keyPrefix}-c${i}`}
          className="rounded bg-black/10 px-1 py-0.5 text-[0.85em] font-mono"
        >
          {tok.slice(1, -1)}
        </code>,
      );
    }
    last = m.index + tok.length;
    i += 1;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

const OL_RE = /^\s*\d+[.、)]\s+(.*)$/;
const UL_RE = /^\s*[-•·]\s+(.*)$/;
const HR_RE = /^\s*([-—_]\s*){3,}$/;

export default function MarkdownLite({ text, className }: { text: string; className?: string }) {
  const lines = (text ?? '').replace(/\r\n/g, '\n').split('\n');
  const blocks: ReactNode[] = [];

  let paragraph: string[] = [];
  let ol: string[] = [];
  let ul: string[] = [];
  let key = 0;

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    const content = paragraph.join('\n');
    blocks.push(
      <p key={`p${key++}`} className="m-0 leading-relaxed whitespace-pre-wrap break-words">
        {renderInline(content, `p${key}`)}
      </p>,
    );
    paragraph = [];
  };
  const flushOl = () => {
    if (ol.length === 0) return;
    blocks.push(
      <ol key={`ol${key++}`} className="m-0 pl-5 list-decimal space-y-1">
        {ol.map((item, idx) => (
          <li key={idx} className="leading-relaxed break-words">
            {renderInline(item, `ol${key}-${idx}`)}
          </li>
        ))}
      </ol>,
    );
    ol = [];
  };
  const flushUl = () => {
    if (ul.length === 0) return;
    blocks.push(
      <ul key={`ul${key++}`} className="m-0 pl-5 list-disc space-y-1">
        {ul.map((item, idx) => (
          <li key={idx} className="leading-relaxed break-words">
            {renderInline(item, `ul${key}-${idx}`)}
          </li>
        ))}
      </ul>,
    );
    ul = [];
  };
  const flushAll = () => {
    flushParagraph();
    flushOl();
    flushUl();
  };

  for (const raw of lines) {
    const line = raw;
    if (HR_RE.test(line)) {
      flushAll();
      blocks.push(<hr key={`hr${key++}`} className="my-2 border-0 border-t border-current/20" />);
      continue;
    }
    const olm = line.match(OL_RE);
    if (olm) {
      flushParagraph();
      flushUl();
      ol.push(olm[1]);
      continue;
    }
    const ulm = line.match(UL_RE);
    if (ulm) {
      flushParagraph();
      flushOl();
      ul.push(ulm[1]);
      continue;
    }
    if (line.trim() === '') {
      flushAll();
      continue;
    }
    flushOl();
    flushUl();
    paragraph.push(line);
  }
  flushAll();

  return <div className={`space-y-2 text-sm ${className ?? ''}`}>{blocks}</div>;
}
