/**
 * 健澜科技 jlmedaios - 绿色医院 V3 页（M246-A）
 *
 * 碳核算碳足迹碳交易碳中和路线图/建筑节能空调照明电梯能耗监测/LEED二星三星/医废可回收资源化/中水雨水水平衡。深海蓝 VI。
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
  carbon: { energy: number; waste: number; transport: number };
  building: { leed: number; hvac: number; lighting: number };
  waste: { medical: number; recycling: number; reclaimedWater: number };
  suggestions: string[];
}

export default function GreenHospitalV3Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/green-hospital-v3/report");
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
        <Title level={3} style={{ color: VI.deep }}>绿色医院 V3</Title>
        <Paragraph type="secondary">碳核算·碳足迹·碳交易·碳中和路线图 / 建筑节能·空调·照明·电梯·能耗监测 / LEED 二星·三星 / 医废·可回收·资源化 / 中水·雨水·水平衡</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="碳排放(tCO2e)" value={data.carbon.energy + data.carbon.waste + data.carbon.transport} /></Card></Col>
              <Col span={6}><Card><Statistic title="LEED 评分" value={data.building.leed} /></Card></Col>
              <Col span={6}><Card><Statistic title="回收利用" value={data.waste.recycling} /></Card></Col>
              <Col span={6}><Card><Statistic title="中水回用(t)" value={data.waste.reclaimedWater} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>绿色明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "hvac", name: "空调节能", value: data.building.hvac },
                  { key: "lighting", name: "照明节能", value: data.building.lighting },
                  { key: "medical", name: "医废处理", value: data.waste.medical },
                  { key: "transport", name: "交通排放", value: data.carbon.transport },
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
