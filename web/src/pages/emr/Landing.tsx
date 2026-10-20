/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 电子病历（EMR）总入口占位页。
 * v5.0试点扩展（浏览器bug修复）：原 /emr 路由未注册导致 404；
 * 此处提供轻量落地页，汇聚 EMR 各子模块入口，不改任何业务逻辑。
 */
import { PageContainer } from '@/components/common';
import { useNavigate } from 'react-router-dom';

/** 深海蓝 VI 色板 */
const JL = {
  navy: '#0A2540',
  blue: '#1E5F8C',
  accent: '#4A90D9',
} as const;

const EMR_ENTRIES: Array<{ path: string; title: string; desc: string }> = [
  { path: '/emr/grade5', title: '电子病历五级评审', desc: '五级评审指标与缺陷闭环' },
  { path: '/emr/intelligent-v3', title: 'EMR 智能质控 V3', desc: '病历内涵质量智能评价' },
  { path: '/emr/qc-dashboard', title: '质控看板', desc: '运行病历终末质控概览' },
  { path: '/emr/archive', title: '病历归档', desc: '病案归档与完整性检查' },
];

export default function EmrLanding() {
  const navigate = useNavigate();
  return (
    <PageContainer title="电子病历系统（EMR）" description="电子病历全模块入口（演示数据已脱敏）">
      <div
        className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2"
        style={{ borderTop: `3px solid ${JL.accent}` }}
      >
        {EMR_ENTRIES.map((e) => (
          <div
            key={e.path}
            onClick={() => navigate(e.path)}
            style={{
              cursor: 'pointer',
              padding: 16,
              borderRadius: 8,
              border: '1px solid #e8e8e8',
              borderLeft: `4px solid ${JL.blue}`,
              background: '#fff',
            }}
          >
            <div style={{ color: JL.navy, fontWeight: 600 }}>{e.title}</div>
            <div style={{ color: '#666', fontSize: 13, marginTop: 6 }}>{e.desc}</div>
          </div>
        ))}
      </div>
    </PageContainer>
  );
}
