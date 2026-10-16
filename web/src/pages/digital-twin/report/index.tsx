/**
 * 健澜科技 jlmedaios - 数字孪生页（M232-C）
 *
 * 3D院区建模/数字孪生手术室ICU门诊后勤/流程仿真资源仿真应急仿真/IoT数据融合/可视化大屏指挥中心。深海蓝 VI。
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
  campus: { buildings: number; floors: number; departments: number; devices: number; personnel: number };
  twin: { or: boolean; icu: boolean; outpatient: boolean; logistics: boolean };
  simulation: { process: boolean; resource: boolean; emergency: boolean };
  iot: { fused: boolean };
  visualization: { dashboard: boolean; commandCenter: boolean };
  suggestions: string[];
}

export default function DigitalTwinPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/digital-twin/report");
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
        <Title level={3} style={{ color: VI.deep }}>数字孪生医院</Title>
        <Paragraph type="secondary">3D 院区建模 / 孪生手术室·ICU·门诊·后勤 / 流程·资源·应急仿真 / IoT 数据融合 / 可视化大屏·指挥中心</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="建筑数" value={data.campus.buildings} /></Card></Col>
              <Col span={6}><Card><Statistic title="科室数" value={data.campus.departments} /></Card></Col>
              <Col span={6}><Card><Statistic title="IoT 设备" value={data.campus.devices} /></Card></Col>
              <Col span={6}><Card><Statistic title="人员建模" value={data.campus.personnel} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>孪生场景明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "or", name: "数字孪生手术室", value: data.twin.or ? "已建成" : "未建成" },
                  { key: "icu", name: "数字孪生 ICU", value: data.twin.icu ? "已建成" : "未建成" },
                  { key: "sim", name: "流程仿真", value: data.simulation.process ? "已启用" : "未启用" },
                  { key: "cmd", name: "指挥中心", value: data.visualization.commandCenter ? "已投用" : "未投用" },
                ]}
                columns={[
                  { title: "项目", dataIndex: "name", key: "name" },
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
