/**
 * 健澜科技 jlmedaios - 绿色医院 V2 页（M236-A）
 *
 * 碳核算/碳足迹/碳中和路线图/建筑节能/绿色建筑LEED三星/医疗废弃物/中水雨水/绿色采购。深海蓝 VI。
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
  carbon: { footprint: number; neutral: number; roadmap: boolean };
  energy: { saving: number; leed: boolean };
  waste: { recycling: number; medical: number };
  water: { reuse: number };
  procurement: { green: number };
  suggestions: string[];
}

export default function GreenHospitalV2Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/green-hospital/report");
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
        <Title level={3} style={{ color: VI.deep }}>绿色医院与碳中和 V2</Title>
        <Paragraph type="secondary">碳核算·碳足迹·碳中和路线图 / 建筑节能·LEED 三星 / 医疗废弃物·中水雨水 / 绿色采购</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="碳足迹 (吨)" value={data.carbon.footprint} /></Card></Col>
              <Col span={6}><Card><Statistic title="节能 (万kWh)" value={data.energy.saving} /></Card></Col>
              <Col span={6}><Card><Statistic title="废弃物回收 (%)" value={data.waste.recycling} /></Card></Col>
              <Col span={6}><Card><Statistic title="碳中和年份" value={data.carbon.neutral} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>绿色医院明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "medical", name: "医疗废弃物 (吨)", value: data.waste.medical },
                  { key: "water", name: "中水回用 (%)", value: data.water.reuse },
                  { key: "green", name: "绿色采购 (%)", value: data.procurement.green },
                  { key: "leed", name: "LEED 认证", value: data.energy.leed ? "已获" : "未获" },
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
