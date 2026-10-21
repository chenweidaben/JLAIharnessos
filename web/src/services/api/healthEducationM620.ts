/**
 * 健澜科技 jlmedaios - 健康教育 API（M620，P12 患者侧深度）
 *
 * 对接 BFF：GET /api/v1/health-education/articles（未注册则 DEMO 兜底，打标 demo:true）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface HealthArticle {
  id: string;
  title: string;
  category: string;
  author: string;
  publishedAt: string;
  summary: string;
  content: string;
  views: number;
}

export const ARTICLE_CATEGORIES = ['高血压', '糖尿病', '合理用药', '术后康复', '心理健康'];

const DEMO_ARTICLES: HealthArticle[] = [
  { id: 'HE-001', title: '家庭血压测量的 5 个常见错误', category: '高血压', author: '心内科-王医师', publishedAt: '2026-10-10T09:00:00+08:00', summary: '测量前未静坐、袖带位置不对、说话等都会让血压读数偏高。', content: '1. 测量前静坐 5 分钟；2. 袖带与心脏同高；3. 测量时不说话、不看手机；4. 早晚各测一次取平均；5. 连续 7 天记录。', views: 1280 },
  { id: 'HE-002', title: '糖尿病饮食：低 GI 食物怎么选', category: '糖尿病', author: '内分泌-李医师', publishedAt: '2026-10-12T09:00:00+08:00', summary: '糙米、燕麦、绿叶菜优于白米饭、甜食。', content: '主食选粗杂粮 1/3 以上；蔬菜每日 500g；水果选莓类；避免含糖饮料。', views: 860 },
  { id: 'HE-003', title: '降压药不能随便停', category: '合理用药', author: '药学部-陈药师', publishedAt: '2026-10-15T09:00:00+08:00', summary: '血压正常是药物在起作用，擅自停药会反弹。', content: '定期复查遵医嘱调整；漏服不要双倍补服；出现不良反应联系医师。', views: 2030 },
  { id: 'HE-004', title: '腹部手术后居家康复要点', category: '术后康复', author: '普外科-张医师', publishedAt: '2026-10-18T09:00:00+08:00', summary: '早期下床、少食多餐、观察切口。', content: '术后 24h 内下床活动；饮食从流质过渡；切口红肿热痛及时就诊。', views: 540 },
];

export async function fetchHealthArticles(category?: string): Promise<{ items: HealthArticle[]; demo: boolean }> {
  try {
    const res = await get<{ items: HealthArticle[] }>('/health-education/articles', category ? { category } : undefined);
    return { items: res.items, demo: false };
  } catch {
    const items = category ? DEMO_ARTICLES.filter((a) => a.category === category) : DEMO_ARTICLES;
    return { items, demo: true };
  }
}
