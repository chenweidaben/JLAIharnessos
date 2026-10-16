/**
 * 健澜科技 jlmedaios - 设备耗材 V3 页（M243-B）
 *
 * 设备计划采购验收使用维保计量报废全生命周期/开机率使用率故障率收益率阳性率/SPD高值低值植入物/UDI一级二级追溯召回/强制检定。深海蓝 VI。
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
  lifecycle: { planned: number; procured: number; inUse: number; retired: number };
  metrics: { uptime: number; utilization: number; failure: number };
  spd: { high: number; low: number; implant: number };
  metrology: number;
  suggestions: string[];
}

export default function EquipmentSupplyV3Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/equipment-supply-v3/report");
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
        <Title level={3} style={{ color: VI.deep }}>设备耗材 V3</Title>
        <Paragraph type="secondary">设备计划·采购·验收·使用·维保·计量·报废全生命周期 / 开机率·使用率·故障率·收益率·阳性率 / SPD 高值·低值·植入物 / UDI 一级二级追溯召回 / 强制检定</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="在用设备" value={data.lifecycle.inUse} /></Card></Col>
              <Col span={6}><Card><Statistic title="开机率" value={`${data.metrics.uptime}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="使用率" value={`${data.metrics.utilization}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="计量检定" value={data.metrology} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>设备明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "high", name: "高值耗材", value: data.spd.high },
                  { key: "low", name: "低值耗材", value: data.spd.low },
                  { key: "implant", name: "植入物", value: data.spd.implant },
                  { key: "retired", name: "报废设备", value: data.lifecycle.retired },
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
