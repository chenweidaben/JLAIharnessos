/**
 * 健澜科技 jlmedaios - 检验报告通俗解读患者端页面（M122-B）
 *
 * 依据宪法：第二十一条国家发展医疗卫生事业、保护人民健康；
 * 以大字、口语化方式帮助患者看懂自己的检验报告，知情配合治疗。
 *
 * 界面三态：loading / error / empty 完备；患者端大字易读、简洁友好。
 * 免责声明：本页解读仅供参考，不替代医生诊断。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useMemo, useState } from 'react';
import { Alert, Card, Empty, Layout, List, Spin, Tag, Typography } from 'antd';
import { get } from '@/services/request';

const { Header, Content } = Layout;
const { Title, Paragraph, Text } = Typography;

/** 与后端 /api/v1/patient/lab-explain 返回 data 对齐。 */
interface PlainExplanation {
  itemName: string;
  displayValue: string;
  refRange: string;
  level: 'normal' | 'high' | 'low' | 'critical' | 'unknown';
  directionText: string;
  plainText: string;
}

interface FollowUpNeeded {
  needed: boolean;
  level: 'none' | 'routine' | 'urgent';
  reason: string;
  suggestion: string;
}

interface LabExplainData {
  reportId: string;
  itemCount: number;
  plainExplanations: PlainExplanation[];
  possibleCauses: string[];
  careAdvice: string[];
  followUpNeeded: FollowUpNeeded;
}

/** 风险等级 -> 标签颜色（与 antd Tag 对齐）。 */
const LEVEL_COLOR: Record<PlainExplanation['level'], string> = {
  normal: 'green',
  high: 'orange',
  low: 'orange',
  critical: 'red',
  unknown: 'default',
};

/** 从地址栏读取 reportId，例如 /patient/lab-explain?reportId=R20261016001。 */
function readReportId(): string {
  if (typeof window === 'undefined') return '';
  return new URLSearchParams(window.location.search).get('reportId') ?? '';
}

export default function LabExplainPage() {
  const [data, setData] = useState<LabExplainData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  const reportId = useMemo(readReportId, []);

  useEffect(() => {
    if (!reportId) {
      setLoading(false);
      setError('未提供报告号（reportId），请从报告列表进入本页。');
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError('');
    get<LabExplainData>('/api/v1/patient/lab-explain', { reportId })
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : '解读加载失败，请稍后重试');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reportId]);

  // —— loading 态 ——
  if (loading) {
    return (
      <Layout style={{ minHeight: '100vh' }}>
        <Content style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 48 }}>
          <Spin size="large" tip="正在为您解读报告…">
            <Paragraph style={{ fontSize: 18, marginTop: 16 }}>请稍候，正在把化验单翻译成大白话</Paragraph>
          </Spin>
        </Content>
      </Layout>
    );
  }

  // —— error 态 ——
  if (error) {
    return (
      <Layout style={{ minHeight: '100vh' }}>
        <Header><Title level={4} style={{ color: '#fff' }}>检验报告通俗解读</Title></Header>
        <Content style={{ padding: 24 }}>
          <Alert type="error" showIcon style={{ fontSize: 18 }} message={error} />
        </Content>
      </Layout>
    );
  }

  // —— empty 态 ——
  if (!data || data.plainExplanations.length === 0) {
    return (
      <Layout style={{ minHeight: '100vh' }}>
        <Header><Title level={4} style={{ color: '#fff' }}>检验报告通俗解读</Title></Header>
        <Content style={{ padding: 24 }}>
          <Empty description="暂无可解读的检验项目" />
        </Content>
      </Layout>
    );
  }

  const fu = data.followUpNeeded;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header>
        <Title level={4} style={{ color: '#fff', margin: 0 }}>检验报告通俗解读</Title>
      </Header>
      <Content style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
        <Paragraph style={{ fontSize: 16, color: '#666' }}>
          报告号：<Text strong>{data.reportId}</Text>
          ，共 {data.itemCount} 个项目。下面用大白话帮您看懂这份报告。
        </Paragraph>

        {/* 就医提示横幅 */}
        <Alert
          style={{ fontSize: 18, marginBottom: 20 }}
          type={fu.level === 'urgent' ? 'error' : fu.level === 'routine' ? 'warning' : 'success'}
          showIcon
          message={fu.level === 'urgent' ? '需要尽快就医' : fu.level === 'routine' ? '建议复诊咨询医生' : '指标基本正常'}
          description={
            <Paragraph style={{ fontSize: 17, marginBottom: 0 }}>
              {fu.reason} {fu.suggestion}
            </Paragraph>
          }
        />

        {/* 逐项解读 */}
        <Card title={<Title level={5}>各项结果怎么看</Title>} style={{ marginBottom: 20 }}>
          <List
            dataSource={data.plainExplanations}
            renderItem={(item) => (
              <List.Item>
                <List.Item.Meta
                  title={
                    <span style={{ fontSize: 18 }}>
                      <Text strong>{item.itemName}</Text>
                      <Tag color={LEVEL_COLOR[item.level]} style={{ marginLeft: 8, fontSize: 14 }}>
                        {item.directionText}
                      </Tag>
                    </span>
                  }
                  description={
                    <div style={{ fontSize: 16, lineHeight: 1.8 }}>
                      <div>
                        您的结果：<Text strong style={{ fontSize: 18 }}>{item.displayValue}</Text>
                        <Text type="secondary" style={{ marginLeft: 8 }}>{item.refRange}</Text>
                      </div>
                      <div style={{ marginTop: 4 }}>{item.plainText}</div>
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        </Card>

        {/* 可能原因 */}
        {data.possibleCauses.length > 0 && (
          <Card title={<Title level={5}>这些异常可能是什么原因</Title>} style={{ marginBottom: 20 }}>
            <List
              dataSource={data.possibleCauses}
              renderItem={(cause) => (
                <List.Item style={{ fontSize: 16 }}>· {cause}</List.Item>
              )}
            />
          </Card>
        )}

        {/* 照护建议 */}
        <Card title={<Title level={5}>给您的日常建议</Title>} style={{ marginBottom: 20 }}>
          <List
            dataSource={data.careAdvice}
            renderItem={(tip) => (
              <List.Item style={{ fontSize: 16 }}>· {tip}</List.Item>
            )}
          />
        </Card>

        <Paragraph type="secondary" style={{ fontSize: 14, textAlign: 'center' }}>
          本通俗解读由健澜科技智能辅助生成，仅供参考，不能替代医生诊断，具体诊疗请遵医嘱。
        </Paragraph>
      </Content>
    </Layout>
  );
}
