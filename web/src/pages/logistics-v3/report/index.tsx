/**
 * 健澜科技 jlmedaios - 后勤保障 V3 页（M243-A）
 *
 * 保洁绿化停车电梯空调智慧物业/供水供电供氧负压压缩空气能耗监测/被服洗涤消毒周转/病区送餐/工单巡检后勤驾驶舱。深海蓝 VI。
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
  property: { cleaning: number; greening: number; parking: number; elevator: number };
  utility: { water: number; power: number; oxygen: number; vacuum: number };
  linen: number;
  meal: number;
  workOrder: { total: number; completed: number };
  suggestions: string[];
}

export default function LogisticsV3Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/logistics-v3/report");
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
        <Title level={3} style={{ color: VI.deep }}>后勤保障 V3</Title>
        <Paragraph type="secondary">保洁·绿化·停车·电梯·空调智慧物业 / 供水·供电·供氧·负压·压缩空气能耗监测 / 被服洗涤消毒周转 / 病区送餐 / 工单巡检后勤驾驶舱</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="保洁面积" value={data.property.cleaning} /></Card></Col>
              <Col span={6}><Card><Statistic title="停车位数" value={data.property.parking} /></Card></Col>
              <Col span={6}><Card><Statistic title="供电(kWh)" value={data.utility.power} /></Card></Col>
              <Col span={6}><Card><Statistic title="工单数" value={data.workOrder.total} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>后勤明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "water", name: "供水(t)", value: data.utility.water },
                  { key: "oxygen", name: "供氧(m³)", value: data.utility.oxygen },
                  { key: "linen", name: "被服(件)", value: data.linen },
                  { key: "meal", name: "送餐(份)", value: data.meal },
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
