/**
 * 健澜科技 jlmedaios - 应急管理 V3 页（M243-D）
 *
 * 总体专项现场处置预案数字化演练/指挥部应急队专家库7×24值班/批量伤员检伤分类绿色通道/I-IV级响应/智能库存复盘。深海蓝 VI。
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
  plans: { comprehensive: number; special: number; onScene: number };
  command: { team: number; expert: number; onCall: boolean };
  massCasualty: { drills: number; patients: number };
  response: { level: number; greenChannel: number };
  supplies: number;
  suggestions: string[];
}

export default function EmergencyMgmtV3Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/emergency-mgmt-v3/report");
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
        <Title level={3} style={{ color: VI.deep }}>应急管理 V3</Title>
        <Paragraph type="secondary">总体·专项·现场处置预案数字化演练 / 指挥部·应急队·专家库 7×24 值班 / 批量伤员检伤分类·绿色通道 / I-IV 级响应 / 智能库存复盘</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="总体预案" value={data.plans.comprehensive} /></Card></Col>
              <Col span={6}><Card><Statistic title="专项预案" value={data.plans.special} /></Card></Col>
              <Col span={6}><Card><Statistic title="应急队" value={data.command.team} /></Card></Col>
              <Col span={6}><Card><Statistic title="应急物资" value={data.supplies} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>应急明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "onScene", name: "现场处置方案", value: data.plans.onScene },
                  { key: "expert", name: "专家库", value: data.command.expert },
                  { key: "drills", name: "批量伤员演练", value: data.massCasualty.drills },
                  { key: "greenChannel", name: "绿色通道", value: data.response.greenChannel },
                ]}
                columns={[
                  { title: "项目", dataIndex: "name", key: "name" },
                  { title: "数值", dataIndex: "value", key: "value" },
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
