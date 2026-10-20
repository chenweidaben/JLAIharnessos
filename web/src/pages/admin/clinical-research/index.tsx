/**
 * 健澜科技 jlmedaios - 临床科研页（M202-D）
 *
 * 临床试验/受试者/CRF数据/AE-SAE/RWS/伦理审查。深海蓝 VI。
 *
 * v5.0试点扩展（M188白屏修复）：后端 /admin/research/report 返回 projects/papers/
 * achievements/personnel/platforms 形态，原页面强读 trials.active 导致 undefined.active
 * 抛错白屏。此处按真实返回做容错映射，缺字段回退 0，不再抛异常。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from 'react';
import {
  Card,
  Col,
  Layout,
  List,
  Row,
  Spin,
  Statistic,
  Table,
  Typography,
} from 'antd';
import { get } from '@/services/request';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

const VI = { deep: '#0A2540', mid: '#1E5F8C', accent: '#4A90D9', bg: '#f5f7fa' };

// v5.0试点扩展（M188白屏修复）：宽松形状，允许后端字段缺失
interface ResearchReport {
  dept?: string;
  timeRange?: string;
  projects?: { national?: number; provincial?: number; municipal?: number; dept?: number };
  papers?: { sci?: number; core?: number; stats?: number; totalIF?: number };
  achievements?: { patents?: number; softwareCopyrights?: number; awards?: number };
  personnel?: { phd?: number; master?: number; senior?: number; deputySenior?: number };
  platforms?: { keyLab?: number; researchCenter?: number };
  conversionRate?: number;
  researchScore?: number;
  suggestions?: string[];
}

const n = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

export default function ClinicalResearchPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ResearchReport | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<ResearchReport>('/api/v1/admin/research/report');
        if (!cancelled) setData(resp);
      } catch {
        // 错误已由全局拦截器提示；保持 loading=false 以展示空态
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  const projects = data?.projects ?? {};
  const papers = data?.papers ?? {};
  const achievements = data?.achievements ?? {};
  const personnel = data?.personnel ?? {};
  const platforms = data?.platforms ?? {};
  const suggestions = data?.suggestions ?? [];

  return (
    <Layout style={{ minHeight: '100vh', background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: '0 auto' }}>
        <Title level={3} style={{ color: VI.deep }}>临床试验与真实世界研究</Title>
        <Paragraph type="secondary">
          在研项目 / 论文专利 / 人才平台 / 成果转化{data?.dept ? ` · ${data.dept}` : ''}{data?.timeRange ? ` · ${data.timeRange}` : ''}
        </Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="国家级项目" value={n(projects.national)} /></Card></Col>
              <Col span={6}><Card><Statistic title="SCI 论文" value={n(papers.sci)} /></Card></Col>
              <Col span={6}><Card><Statistic title="授权专利" value={n(achievements.patents)} /></Card></Col>
              <Col span={6}><Card><Statistic title="博士/高级职称" value={n(personnel.phd) + n(personnel.senior)} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>科研产出明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'prov', name: '省级项目', value: n(projects.provincial) },
                  { key: 'muni', name: '市/院级项目', value: n(projects.municipal) + n(projects.dept) },
                  { key: 'core', name: '核心期刊论文', value: n(papers.core) },
                  { key: 'if', name: '累计影响因子', value: n(papers.totalIF) },
                  { key: 'sw', name: '软件著作权', value: n(achievements.softwareCopyrights) },
                  { key: 'award', name: '科研获奖', value: n(achievements.awards) },
                  { key: 'keyLab', name: '重点实验室/研究中心', value: n(platforms.keyLab) + n(platforms.researchCenter) },
                  { key: 'conv', name: '成果转化率', value: `${Math.round((data?.conversionRate ?? 0) * 100)}%` },
                ]}
                columns={[
                  { title: '指标', dataIndex: 'name', key: 'name' },
                  { title: '值', dataIndex: 'value', key: 'value' },
                ]}
              />
            </Card>

            <Card title={<Text strong style={{ color: VI.deep }}>改进建议</Text>}>
              <List
                size="small"
                dataSource={suggestions}
                renderItem={(s) => <List.Item><Text>{s}</Text></List.Item>}
                locale={{ emptyText: '暂无改进建议' }}
              />
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
