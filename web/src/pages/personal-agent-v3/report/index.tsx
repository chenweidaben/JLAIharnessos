/**
 * 健澜科技 jlmedaios - Personal Agent V3 页（M232-B）
 *
 * Doctor/Nurse/Pharma/Admin/Patient MUSE五角色/主动预警推荐提醒/学习飞轮/Agent权限边界审计人工接管。深海蓝 VI。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
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
} from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Result {
  timeRange: string;
  roles: { doctor: boolean; nurse: boolean; pharma: boolean; admin: boolean; patient: boolean };
  proactive: { alerts: number; recommendations: number; reminders: number };
  flywheel: { successes: number; failures: number; knowledge: number };
  safety: { boundary: boolean; audited: boolean; humanTakeover: boolean };
  suggestions: string[];
}

export default function PersonalAgentV3Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/personal-agent-v3/report");
        if (!cancelled) setData(resp);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>Personal Agent V3</Title>
        <Paragraph type="secondary">MUSE 五角色（Doctor·Nurse·Pharma·Admin·Patient） / 主动预警·推荐·提醒 / 学习飞轮 / 权限边界·审计·人工接管</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="主动预警" value={data.proactive.alerts} /></Card></Col>
              <Col span={6}><Card><Statistic title="智能推荐" value={data.proactive.recommendations} /></Card></Col>
              <Col span={6}><Card><Statistic title="成功交互" value={data.flywheel.successes} /></Card></Col>
              <Col span={6}><Card><Statistic title="沉淀知识" value={data.flywheel.knowledge} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>MUSE 五角色明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "doctor", name: "Doctor MUSE 医生智能体", value: data.roles.doctor ? "已上线" : "未上线" },
                  { key: "nurse", name: "Nurse MUSE 护理智能体", value: data.roles.nurse ? "已上线" : "未上线" },
                  { key: "pharma", name: "Pharma MUSE 药事智能体", value: data.roles.pharma ? "已上线" : "未上线" },
                  { key: "admin", name: "Admin MUSE 管理智能体", value: data.roles.admin ? "已上线" : "未上线" },
                  { key: "patient", name: "Patient MUSE 患者智能体", value: data.roles.patient ? "已上线" : "未上线" },
                ]}
                columns={[
                  { title: "角色", dataIndex: "name", key: "name" },
                  { title: "状态", dataIndex: "value", key: "value" },
                ]}
              />
            </Card>

            <Card title={<Text strong style={{ color: VI.deep }}>改进建议</Text>}>
              <List
                size="small"
                dataSource={data.suggestions}
                renderItem={(s) => <List.Item><Text>{s}</Text></List.Item>}
              />
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
