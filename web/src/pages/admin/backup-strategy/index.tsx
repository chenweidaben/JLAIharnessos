/**
 * 健澜科技 jlmedaios - 备份容灾策略页（M184-D）
 *
 * 展示备份策略、RTO/RPO 指标、完整性校验结果。深海蓝 VI。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from 'react';
import {
  Alert,
  Card,
  Col,
  Layout,
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

interface Strategy {
  fullBackup: { schedule: string; retentionDays: number };
  incrementalBackup: { schedule: string; retentionHours: number };
  retentionPolicy: { daily: number; weekly: number; monthly: number };
  disasterRecovery: { geoRedundancy: boolean; rtoMinutes: number; rpoMinutes: number };
  quarterlyDrill: boolean;
}

interface RtoRpo {
  rtoMinutes: number;
  rpoMinutes: number;
  meetsHipaa: boolean;
  meetsHl7: boolean;
}

interface Integrity {
  backupId: string;
  valid: boolean;
  checksumMatch: boolean;
  sizeOk: boolean;
  message: string;
}

interface Resp {
  strategy: Strategy;
  rtoRpo: RtoRpo;
  integrity: Integrity;
}

export default function BackupStrategyPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Resp>('/api/v1/admin/backup/strategy');
        if (!cancelled) setData(resp);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Layout style={{ minHeight: '100vh', background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
        <Title level={3} style={{ color: VI.deep }}>数据备份与容灾策略</Title>
        <Paragraph type="secondary">全量+增量备份 · 保留策略 · RTO/RPO · 异地容灾</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Alert
              type={data.integrity.valid ? 'success' : 'error'}
              showIcon
              style={{ marginBottom: 16 }}
              message={`备份 ${data.integrity.backupId}：${data.integrity.message}`}
            />

            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}>
                <Card>
                  <Statistic title="RTO（恢复时间目标）" value={data.rtoRpo.rtoMinutes} suffix="分钟" valueStyle={{ color: VI.mid }} />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic title="RPO（恢复点目标）" value={data.rtoRpo.rpoMinutes} suffix="分钟" valueStyle={{ color: VI.accent }} />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="HIPAA 合规"
                    value={data.rtoRpo.meetsHipaa ? '达标' : '不达标'}
                    valueStyle={{ color: data.rtoRpo.meetsHipaa ? '#52c41a' : '#f5222d' }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="HL7 合规"
                    value={data.rtoRpo.meetsHl7 ? '达标' : '不达标'}
                    valueStyle={{ color: data.rtoRpo.meetsHl7 ? '#52c41a' : '#f5222d' }}
                  />
                </Card>
              </Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>备份策略</Text>}>
              <Table
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'full', item: '全量备份', value: `每日凌晨 2:00，保留 ${data.strategy.fullBackup.retentionDays} 天` },
                  { key: 'incr', item: '增量备份', value: `每小时整点，保留 ${data.strategy.incrementalBackup.retentionHours} 小时` },
                  { key: 'daily', item: '每日保留', value: `${data.strategy.retentionPolicy.daily} 天` },
                  { key: 'weekly', item: '每周保留', value: `${data.strategy.retentionPolicy.weekly} 周` },
                  { key: 'monthly', item: '每月保留', value: `${data.strategy.retentionPolicy.monthly} 月` },
                  { key: 'geo', item: '异地容灾', value: data.strategy.disasterRecovery.geoRedundancy ? '已开启' : '未开启' },
                  { key: 'drill', item: '季度恢复演练', value: data.strategy.quarterlyDrill ? '已开启' : '未开启' },
                ]}
                columns={[
                  { title: '项目', dataIndex: 'item', key: 'item' },
                  { title: '配置', dataIndex: 'value', key: 'value' },
                ]}
              />
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
