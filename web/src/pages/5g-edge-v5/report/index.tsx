/**
 * 健澜科技 jlmedaios - 5G与边缘计算 V5 页（M268-C）
 *
 * 5G网络（院区覆盖/切片/高可靠/低时延/移动医护/远程）/远程手术（5G远程操控/专家指导/影像实时/音视频/安全）/移动医护（移动查房车/PDA/护理车/床旁结算/实时入病历）/边缘计算（院内边缘节点/AI推理下沉/低时延/数据本地）/急救车联动（车-院5G实时/生命体征/视频/预警/入院准备）/应急通信（灾害/大型活动/断网应急/卫星/对讲/冗余链路）/物联网网关（设备接入/协议转换/数据采集/安全/管理）/5G指标（时延/带宽/在线率/业务数/远程手术例数/满意度）。深海蓝 VI。
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
  g5Network: { coverage: number; slicing: number; reliability: number; latency: number; mobileCare: number; remote: number };
  remoteSurgery: { teleControl: number; expertGuidance: number; imaging: number; realtimeAV: number; security: number; cases: number };
  mobileCare: { roundingCart: number; pda: number; nursingCart: number; bedsideBilling: number; realtimeEhr: number };
  edge: { localNode: number; aiInference: number; offload: number; lowLatency: number; dataLocal: number };
  ambulance: { vehicle: number; hospital: number; realtimeVitals: number; video: number; alert: number; admissionPrep: number };
  emergency: { disaster: number; event: number; failover: number; satellite: number; radio: number; redundancy: number };
  iotGateway: { device: number; protocol: number; data: number; security: number; management: number };
  metrics: { latency: number; bandwidth: number; onlineRate: number; businessCount: number; remoteSurgeryCases: number; satisfaction: number };
  suggestions: string[];
}

export default function EdgeV5Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/5g-edge-v5/report");
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
        <Title level={3} style={{ color: VI.deep }}>5G与边缘计算 V5</Title>
        <Paragraph type="secondary">5G网络·院区覆盖·切片·高可靠·低时延·移动医护·远程 / 远程手术·5G远程操控·专家指导·影像实时·音视频·安全 / 移动医护·移动查房车·PDA·护理车·床旁结算·实时入病历</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="时延" value={`${data.metrics.latency}ms`} /></Card></Col>
              <Col span={6}><Card><Statistic title="带宽" value={`${data.metrics.bandwidth}Mbps`} /></Card></Col>
              <Col span={6}><Card><Statistic title="在线率" value={`${data.metrics.onlineRate}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="远程手术" value={`${data.metrics.remoteSurgeryCases}例`} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>5G 明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "network", name: "5G网络", value: `${data.g5Network.coverage}%` },
                  { key: "remote", name: "远程手术", value: data.remoteSurgery.cases },
                  { key: "mobile", name: "移动医护", value: `${data.mobileCare.pda}%` },
                  { key: "edge", name: "边缘节点", value: `${data.edge.localNode}%` },
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
