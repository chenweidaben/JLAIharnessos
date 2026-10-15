/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * AI 知识问答页（M154-D）「AI深化与运营预测」
 * 面向临床医护的疾病/用药/检查/指南知识问答；回答由 BFF 纯函数产出，必带引用来源。
 * 深海蓝 VI：主色 #0a4d8c / 深色 #073a6b / 浅色 #1a6bb8。
 */
import { useState, type FormEvent } from 'react';

import { post } from '@/api/client';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';

/** 引用来源（与后端 Citation 对齐） */
interface Citation {
  sourceType: 'textbook' | 'drug-label' | 'guideline' | 'exam-reference';
  title: string;
  publisher: string;
  year: number;
  edition?: string;
  url?: string;
}

/** 问答结果（与后端 AnswerResult 对齐） */
interface AnswerResult {
  question: string;
  matched: boolean;
  entryId?: string;
  category?: 'disease' | 'drug' | 'exam' | 'guideline';
  title?: string;
  intent?: string;
  answer: string;
  citations: Citation[];
  notFoundHint: string;
  disclaimer: string;
}

/** 快捷追问示例 */
const SUGGESTIONS = [
  '高血压的诊断标准是什么？',
  '二甲双胍的禁忌症有哪些？',
  '空腹血糖结果怎么解读？',
  '阿司匹林的适应症和剂量？',
];

const CATEGORY_LABEL: Record<string, string> = {
  disease: '疾病知识',
  drug: '用药知识',
  exam: '检查知识',
  guideline: '指南知识',
};

const SOURCE_TYPE_LABEL: Record<string, string> = {
  textbook: '教材',
  'drug-label': '用药须知',
  guideline: '临床指南',
  'exam-reference': '诊断参考',
};

const primary = '#0a4d8c';
const primaryDark = '#073a6b';
const primaryLight = '#1a6bb8';

export default function MedicalQaPage() {
  usePageTitle('AI 知识问答');
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [error, setError] = useState<string>('');

  async function ask(q: string) {
    const text = q.trim();
    if (!text || loading) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const data = await post<{ result: AnswerResult }>('/api/v1/ai/ask', { question: text });
      setResult(data.result);
    } catch (e) {
      setError(e instanceof Error ? e.message : '问答失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void ask(question);
  }

  return (
    <PageContainer
      title="AI 知识问答"
      description="疾病 / 用药 / 检查 / 指南知识即时问答，每条回答均附权威引用来源"
    >
      <div style={{ maxWidth: 880 }}>
        {/* 提问卡片 */}
        <form
          onSubmit={onSubmit}
          style={{
            background: '#fff',
            border: `1px solid #e6eef6`,
            borderTop: `3px solid ${primary}`,
            borderRadius: 10,
            padding: 16,
            boxShadow: '0 2px 8px rgba(10,77,140,0.06)',
          }}
        >
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="请输入您的医学问题，例如：2型糖尿病的诊断标准是什么？"
            rows={3}
            maxLength={500}
            style={{
              width: '100%',
              border: '1px solid #d6e2ef',
              borderRadius: 8,
              padding: 10,
              fontSize: 14,
              resize: 'vertical',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              type="submit"
              disabled={loading || !question.trim()}
              style={{
                background: loading ? '#7fa8cf' : primary,
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '8px 22px',
                fontSize: 14,
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? '问答中…' : '提问'}
            </button>
            <span style={{ color: '#8aa4bf', fontSize: 12 }}>
              内容仅供教学参考，不构成诊疗建议
            </span>
          </div>
          {/* 快捷追问 */}
          <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setQuestion(s);
                  void ask(s);
                }}
                style={{
                  background: '#f0f6fc',
                  color: primaryLight,
                  border: `1px solid #cfe1f2`,
                  borderRadius: 14,
                  padding: '4px 12px',
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </form>

        {/* 错误提示 */}
        {error && (
          <div
            style={{
              marginTop: 16,
              padding: 12,
              borderRadius: 8,
              background: '#fdecec',
              color: '#c0392b',
              fontSize: 13,
            }}
          >
            {error}
          </div>
        )}

        {/* 回答区 */}
        {result && (
          <div
            style={{
              marginTop: 16,
              background: '#fff',
              border: `1px solid #e6eef6`,
              borderRadius: 10,
              padding: 18,
              boxShadow: '0 2px 8px rgba(10,77,140,0.06)',
            }}
          >
            {result.matched ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <span
                    style={{
                      background: primary,
                      color: '#fff',
                      borderRadius: 6,
                      padding: '2px 10px',
                      fontSize: 12,
                    }}
                  >
                    {result.category ? CATEGORY_LABEL[result.category] : '知识'}
                  </span>
                  <strong style={{ color: primaryDark, fontSize: 16 }}>{result.title}</strong>
                  {result.intent && (
                    <span style={{ color: '#8aa4bf', fontSize: 12 }}>· {result.intent}</span>
                  )}
                </div>
                <div
                  style={{
                    whiteSpace: 'pre-wrap',
                    lineHeight: 1.8,
                    fontSize: 14,
                    color: '#33475b',
                  }}
                >
                  {result.answer}
                </div>
              </>
            ) : (
              <div style={{ color: '#b26a00', fontSize: 14, lineHeight: 1.7 }}>
                {result.notFoundHint}
              </div>
            )}

            {/* 引用来源 */}
            {result.matched && result.citations.length > 0 && (
              <div style={{ marginTop: 16, borderTop: '1px dashed #d6e2ef', paddingTop: 12 }}>
                <div style={{ fontSize: 12, color: primaryLight, marginBottom: 8 }}>
                  引用来源（{result.citations.length}）
                </div>
                {result.citations.map((c, i) => (
                  <div
                    key={i}
                    style={{
                      background: '#f0f6fc',
                      borderLeft: `3px solid ${primaryLight}`,
                      borderRadius: 6,
                      padding: '8px 12px',
                      marginBottom: 8,
                      fontSize: 13,
                      color: '#33475b',
                    }}
                  >
                    <span style={{ color: '#8aa4bf', marginRight: 8 }}>
                      [{SOURCE_TYPE_LABEL[c.sourceType] ?? '来源'}]
                    </span>
                    {c.title}
                    <span style={{ color: '#8aa4bf' }}>
                      {' '}· {c.publisher}（{c.year}
                      {c.edition ? `，${c.edition}` : ''}）
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* 免责声明 */}
            <div style={{ marginTop: 12, fontSize: 12, color: '#9fb3c8' }}>
              {result.disclaimer}
            </div>
          </div>
        )}
      </div>
    </PageContainer>
  );
}
