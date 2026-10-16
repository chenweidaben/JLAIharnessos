/**
 * 健澜科技 jlmedaios - 医院绩效管理 V3 页（M240-C）
 *
 * 院级国考55指标/科级质量数量效率/个人医生护士医技行政分类积分/DRG/DIP绩效CMI/多劳多得优劳优得。深海蓝 VI。
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
  national: { indicators: number; rank: number };
  dept: { quality: number; quantity: number; efficiency: number };
  individual: { doctor: number; nurse: number; tech: number; admin: number };
  drg: { cmi: number; dip: number };
  suggestions: string[];
}

export default function PerformanceV3Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/performance-v3/report");
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
        <Title level={3} style={{ color: VI.deep }}>医院绩效管理 V3</Title>
        <Paragraph type="secondary">院级国考 55 指标 / 科级质量·数量·效率 / 个人医生·护士·医技·行政分类积分 / DRG·DIP 绩效 CMI</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="国考指标" value={data.national.indicators} /></Card></Col>
              <Col span={6}><Card><Statistic title="国考排名" value={data.national.rank} /></Card></Col>
              <Col span={6}><Card><Statistic title="医生人数" value={data.individual.doctor} /></Card></Col>
              <Col span={6}><Card><Statistic title="CMI" value={data.drg.cmi} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>绩效明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "quality", name: "科室质量分", value: data.dept.quality },
                  { key: "quantity", name: "科室数量分", value: data.dept.quantity },
                  { key: "eff", name: "科室效率分", value: data.dept.efficiency },
                  { key: "dip", name: "DIP 点数", value: data.drg.dip },
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
