/**
 * 健澜科技 jlmedaios - 安全保卫 V3 页（M243-C）
 *
 * 消防设施通道检查隐患整改演练/门卫巡逻监控访客重点部位/反恐防暴暴力伤医/门禁生物识别/AI视频预警。深海蓝 VI。
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
  fire: { detector: number; extinguisher: number; exit: number; drill: number };
  guard: { patrol: number; visitor: number; keyArea: number };
  antiTerrorism: number;
  cctv: number;
  suggestions: string[];
}

export default function SecurityV3Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/security-v3/report");
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
        <Title level={3} style={{ color: VI.deep }}>安全保卫 V3</Title>
        <Paragraph type="secondary">消防设施·通道检查·隐患整改·演练 / 门卫·巡逻·监控·访客·重点部位 / 反恐防暴·暴力伤医 / 门禁生物识别 / AI 视频预警</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="烟感探测器" value={data.fire.detector} /></Card></Col>
              <Col span={6}><Card><Statistic title="灭火器" value={data.fire.extinguisher} /></Card></Col>
              <Col span={6}><Card><Statistic title="监控点位" value={data.cctv} /></Card></Col>
              <Col span={6}><Card><Statistic title="消防演练" value={data.fire.drill} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>安保明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "exit", name: "安全出口", value: data.fire.exit },
                  { key: "patrol", name: "巡逻(次)", value: data.guard.patrol },
                  { key: "visitor", name: "访客", value: data.guard.visitor },
                  { key: "antiTerrorism", name: "反恐演练", value: data.antiTerrorism },
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
