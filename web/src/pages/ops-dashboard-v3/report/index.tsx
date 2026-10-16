/**
 * 健澜科技 jlmedaios - 医院运营驾驶舱 V3 页（M240-A）
 *
 * 实时门诊住院手术床位看板/运营预测容量预警/领导驾驶舱红黄绿灯/晨会周会月会自动生成。深海蓝 VI。
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
  realtime: { outpatient: number; inpatient: number; surgery: number; bed: number };
  forecast: { next7d: number; capacityAlert: number };
  meetings: { daily: number; weekly: number; monthly: number };
  benchmark: { rank: number };
  suggestions: string[];
}

export default function OpsDashboardV3Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/ops-dashboard-v3/report");
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
        <Title level={3} style={{ color: VI.deep }}>医院运营驾驶舱 V3</Title>
        <Paragraph type="secondary">实时门诊·住院·手术·床位看板 / 运营预测·容量预警 / 领导驾驶舱·红黄绿灯 / 晨会·周会·月会自动生成</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="实时门诊" value={data.realtime.outpatient} /></Card></Col>
              <Col span={6}><Card><Statistic title="在院患者" value={data.realtime.inpatient} /></Card></Col>
              <Col span={6}><Card><Statistic title="今日手术" value={data.realtime.surgery} /></Card></Col>
              <Col span={6}><Card><Statistic title="床位使用率" value={`${Math.round((data.realtime.bed / 2000) * 100)}%`} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>运营明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "forecast", name="下周预测", value: data.forecast.next7d },
                  { key: "alert", name: "容量预警", value: data.forecast.capacityAlert },
                  { key: "rank", name: "国考排名", value: data.benchmark.rank },
                  { key: "meeting", name: "月会自动生成", value: data.meetings.monthly },
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
