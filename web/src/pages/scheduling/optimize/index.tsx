/**
 * 健澜科技 jlmedaios - 护士智能排班优化页（M184-A）
 *
 * 输入科室、日期、患者数、护士列表，输出排班方案；
 * 冲突高亮 + 缺口预警。深海蓝 VI。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Input,
  Layout,
  Row,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { post } from '@/services/request';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

const VI = { deep: '#0A2540', mid: '#1E5F8C', accent: '#4A90D9', bg: '#f5f7fa' };

interface ShiftRow {
  shiftType: string;
  assigned: string[];
  required: number;
  gap: number;
}

interface Plan {
  dept: string;
  date: string;
  shifts: ShiftRow[];
  conflicts: Array<{ type: string; staffId: string; message: string }>;
  totalRequired: number;
  totalAssigned: number;
  feasible: boolean;
}

export default function NurseScheduleOptimizePage() {
  const [dept, setDept] = useState('内科');
  const [date, setDate] = useState('2026-10-16');
  const [patientCount, setPatientCount] = useState(40);
  const [staffText, setStaffText] = useState(
    '护士A\n护士B\n护士C\n护士D\n护士E\n护士F\n护士G\n护士H',
  );
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(false);

  const runOptimize = async (): Promise<void> => {
    setLoading(true);
    try {
      const staffList = staffText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean)
        .map((name, i) => ({
          staffId: `nurse-${i + 1}`,
          staffName: name,
          consecutiveNights: i % 4 === 3 ? 3 : 0,
        }));
      const resp = await post<Plan>('/api/v1/scheduling/optimize', {
        body: { dept, date, staffList, patientCount },
      });
      setPlan(resp);
    } finally {
      setLoading(false);
    }
  };

  const shiftColumns: ColumnsType<ShiftRow> = [
    { title: '班次', dataIndex: 'shiftType', key: 'shiftType', width: 100 },
    {
      title: '需求人数',
      dataIndex: 'required',
      key: 'required',
      width: 100,
      render: (v: number) => <Text strong>{v}</Text>,
    },
    {
      title: '已排人数',
      key: 'assignedCount',
      width: 100,
      render: (_: unknown, r: ShiftRow) => r.assigned.length,
    },
    {
      title: '缺口',
      dataIndex: 'gap',
      key: 'gap',
      width: 100,
      render: (v: number) =>
        v > 0 ? <Tag color="red">缺 {v} 人</Tag> : <Tag color="green">满足</Tag>,
    },
    {
      title: '排班护士',
      dataIndex: 'assigned',
      key: 'assigned',
      render: (ids: string[]) => ids.map((id) => <Tag key={id} color="blue">{id}</Tag>),
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh', background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: '0 auto' }}>
        <Title level={3} style={{ color: VI.deep }}>护士智能排班优化</Title>
        <Paragraph type="secondary">床护比约束 · 夜班公平 · 冲突检测 · 缺口预警</Paragraph>

        <Card size="small" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={6}>
              <Text>科室</Text>
              <Input value={dept} onChange={(e) => setDept(e.target.value)} />
            </Col>
            <Col span={6}>
              <Text>日期</Text>
              <Input value={date} onChange={(e) => setDate(e.target.value)} />
            </Col>
            <Col span={6}>
              <Text>患者数</Text>
              <Input
                type="number"
                value={patientCount}
                onChange={(e) => setPatientCount(Number(e.target.value))}
              />
            </Col>
            <Col span={6}>
              <Text>护士列表（每行一个）</Text>
              <Input.TextArea
                rows={3}
                value={staffText}
                onChange={(e) => setStaffText(e.target.value)}
              />
            </Col>
          </Row>
          <Button
            type="primary"
            style={{ marginTop: 12, background: VI.mid }}
            loading={loading}
            onClick={() => void runOptimize()}
          >
            生成排班方案
          </Button>
        </Card>

        {plan && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}>
                <Card>
                  <Statistic title="需求总人数" value={plan.totalRequired} valueStyle={{ color: VI.mid }} />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic title="已排总人数" value={plan.totalAssigned} valueStyle={{ color: '#52c41a' }} />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="方案可行"
                    value={plan.feasible ? '是' : '否'}
                    valueStyle={{ color: plan.feasible ? '#52c41a' : '#f5222d' }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic title="冲突数" value={plan.conflicts.length} valueStyle={{ color: plan.conflicts.length > 0 ? '#f5222d' : '#52c41a' }} />
                </Card>
              </Col>
            </Row>

            {plan.conflicts.length > 0 && (
              <Alert
                type="warning"
                showIcon
                style={{ marginBottom: 16 }}
                message="排班冲突"
                description={plan.conflicts.map((c, i) => <div key={i}>{c.message}</div>)}
              />
            )}

            <Card title={<Text strong style={{ color: VI.deep }}>排班表</Text>}>
              <Table rowKey="shiftType" columns={shiftColumns} dataSource={plan.shifts} pagination={false} size="small" />
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
