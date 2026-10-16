/**
 * 健澜科技 jlmedaios - 数字孪生可视化 V5 页（M268-D）
 *
 * 院区3D建模（建筑/楼层/科室/床位/设备/管网/实时映射）/运行驾驶舱（人流/车流/床位/手术间/设备能耗/热力图）/患者流可视化（预约/候诊/就诊/检查/住院/出院全旅程）/设备孪生（设备状态/位置/维保/运行参数/故障预测）/应急可视化（灾害/暴发/停电/停水/疏散/应急指挥）/能耗孪生（水电气/暖通/照明/分区计量/碳排/优化）/仿真推演（人流仿真/容量规划/流程优化/疫情推演）/孪生指标（数据实时性/场景数/决策采纳/管理效率/大屏使用）。深海蓝 VI。
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
  modeling: { building: number; floor: number; dept: number; bed: number; device: number; piping: number; realtimeMapping: number };
  opsDashboard: { traffic: number; parking: number; bed: number; orRoom: number; energy: number; heatmap: number };
  patientFlow: { appointment: number; waiting: number; visit: number; exam: number; admission: number; discharge: number; journey: number };
  deviceTwin: { status: number; position: number; maintenance: number; parameters: number; failurePrediction: number };
  emergency: { disaster: number; outbreak: number; power: number; water: number; evacuation: number; command: number };
  energy: { water: number; power: number; hvac: number; lighting: number; zoned: number; carbon: number; optimization: number };
  simulation: { patientFlow: number; capacity: number; process: number; outbreakDrill: number };
  metrics: { realtime: number; sceneCount: number; decisionAdoption: number; efficiency: number; dashboardUse: number };
  suggestions: string[];
}

export default function DigitalTwinV5Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/digital-twin-v5/report");
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
        <Title level={3} style={{ color: VI.deep }}>数字孪生可视化 V5</Title>
        <Paragraph type="secondary">院区3D建模·建筑·楼层·科室·床位·设备·管网·实时映射 / 运行驾驶舱·人流·车流·床位·手术间·设备能耗·热力图 / 患者流可视化·预约·候诊·就诊·检查·住院·出院全旅程</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="实时性" value={`${data.metrics.realtime}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="场景数" value={data.metrics.sceneCount} /></Card></Col>
              <Col span={6}><Card><Statistic title="决策采纳" value={`${data.metrics.decisionAdoption}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="管理效率" value={`${data.metrics.efficiency}%`} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>孪生明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "model", name: "3D建模", value: `${data.modeling.building}%` },
                  { key: "ops", name: "运行驾驶舱", value: `${data.opsDashboard.bed}%` },
                  { key: "patient", name: "患者流", value: `${data.patientFlow.visit}%` },
                  { key: "device", name: "设备孪生", value: `${data.deviceTwin.status}%` },
                ]}
                columns={[
                  { title: "场景", dataIndex: "name", key: "name" },
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
