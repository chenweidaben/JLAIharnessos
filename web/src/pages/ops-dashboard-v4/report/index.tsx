/**
 * 健澜科技 jlmedaios - 运营驾驶舱 V4 页（M250-A）
 *
 * 门诊住院手术床位使用率平均住院日实时看板大屏/明日门诊下周住院下月手术容量预警AI预测/同比环比趋势科室对比异常波动根因AI洞察/排班资源调配成本控制收入提升流程优化模拟/院长科主任看板下钻/红黄绿灯预警推送处置闭环/晨会周会月会自动生成数据准备决议追踪AI纪要/标杆同级省内排名国考指标差距提升路径。深海蓝 VI。
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
  realtime: { outpatient: number; inpatient: number; surgery: number; bedRate: number; avgStay: number };
  forecast: { tomorrow: number; nextWeek: number; nextMonth: number };
  alert: { red: number; yellow: number; closed: number };
  benchmark: { nationalRank: number; provinceRank: number; gap: string };
  suggestions: string[];
}

export default function OpsDashboardV4Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/ops-dashboard-v4/report");
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
        <Title level={3} style={{ color: VI.deep }}>运营驾驶舱 V4</Title>
        <Paragraph type="secondary">门诊·住院·手术·床位使用率·平均住院日·实时看板 / 明日门诊·下周住院·下月手术·容量预警·AI 预测 / 同比·环比·趋势·科室对比·异常波动·根因 / 排班·资源调配·成本控制·收入提升·流程优化模拟 / 院长·科主任·看板下钻 / 红黄绿灯·预警推送·处置闭环 / 晨会·周会·月会·自动生成·决议追踪 / 标杆·同级·省内排名·国考指标</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="实时门诊" value={data.realtime.outpatient} /></Card></Col>
              <Col span={6}><Card><Statistic title="床位使用率" value={`${data.realtime.bedRate}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="明日预测门诊" value={data.forecast.tomorrow} /></Card></Col>
              <Col span={6}><Card><Statistic title="红警" value={data.alert.red} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>运营明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "inpatient", name: "在院", value: data.realtime.inpatient },
                  { key: "avgStay", name: "平均住院日", value: `${data.realtime.avgStay}天` },
                  { key: "yellow", name: "黄警", value: data.alert.yellow },
                  { key: "nationalRank", name: "国考排名", value: `全国第${data.benchmark.nationalRank}` },
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
