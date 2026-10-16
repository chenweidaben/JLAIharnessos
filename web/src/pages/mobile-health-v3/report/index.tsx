/**
 * 健澜科技 jlmedaios - 移动医疗 V3 页（M234-C）
 *
 * 移动医生站/护士站/PDA/移动查房医嘱执行/输液核对/患者App/MDM安全/可穿戴体征。深海蓝 VI。
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
  stations: { doctor: number; nurse: number; pda: number };
  bedside: { round: number; orderExecution: number; infusion: number };
  patientApp: { downloads: number; dau: number };
  security: { mdm: boolean };
  wearable: { devices: number; vitals: boolean };
  suggestions: string[];
}

export default function MobileHealthV3Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/mobile-health-v3/report");
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
        <Title level={3} style={{ color: VI.deep }}>移动医疗 V3</Title>
        <Paragraph type="secondary">移动医生站·护士站·PDA / 移动查房·医嘱执行·输液核对 / 患者 App / MDM 安全 / 可穿戴体征</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="移动医生站" value={data.stations.doctor} /></Card></Col>
              <Col span={6}><Card><Statistic title="移动护士站" value={data.stations.nurse} /></Card></Col>
              <Col span={6}><Card><Statistic title="患者App DAU" value={data.patientApp.dau} /></Card></Col>
              <Col span={6}><Card><Statistic title="可穿戴设备" value={data.wearable.devices} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>移动医疗明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "pda", name: "PDA 数", value: data.stations.pda },
                  { key: "round", name: "移动查房", value: data.bedside.round },
                  { key: "order", name: "医嘱执行", value: data.bedside.orderExecution },
                  { key: "mdm", name: "MDM 安全", value: data.security.mdm ? "已启用" : "未启用" },
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
