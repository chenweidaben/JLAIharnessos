/**
 * 健澜科技 jlmedaios - 运营分析 V4 页（M254-A）
 *
 * 门诊量科室分布医生出诊预约爽约均次费用同比环比/住院量床位使用率周转平均住院日病床工作效率/手术台次分级科室术者时长并发症手术室效率/检验影像病理功能检查阳性率预约turnaround/收入支出结余成本结构科室盈亏DRG-DIP效益/AI预测门诊住院手术资源需求容量预警/领导驾驶舱科室看板实时下钻AI洞察对标/排班资源调配成本控制收入提升流程优化模拟推演。深海蓝 VI。
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
  outpatient: { visits: number; dept: number; schedule: number; noShow: number; avgCost: number; yoy: number };
  inpatient: { admissions: number; bedRate: number; turnover: number; avgStay: number };
  surgery: { cases: number; grade: number; dept: number; duration: number; complication: number };
  medical: { lab: number; imaging: number; pathology: number; positiveRate: number; turnaround: number };
  finance: { revenue: number; expense: number; surplus: number; cost: number; drgBenefit: number };
  forecast: { outpatient: number; inpatient: number; capacityAlert: boolean };
  dashboard: { executive: number; deptBoard: number; drilldown: number; benchmark: number };
  simulation: { scheduling: number; allocation: number; costControl: number; revenueBoost: number };
  suggestions: string[];
}

export default function OperationsAnalysisV4Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/operations-analysis-v4/report");
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
        <Title level={3} style={{ color: VI.deep }}>运营分析 V4</Title>
        <Paragraph type="secondary">门诊量·科室分布·预约·爽约·均次费用·同比环比 / 住院量·床位使用率·周转·平均住院日 / 手术台次·分级·科室·术者·时长·并发症 / 检验·影像·病理·功能检查·阳性率·turnaround / 收入·支出·结余·成本结构·科室盈亏·DRG/DIP / AI 预测·资源需求·容量预警 / 领导驾驶舱·科室看板·实时下钻·AI 洞察 / 排班·资源调配·成本控制·模拟推演</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="门诊量" value={data.outpatient.visits} /></Card></Col>
              <Col span={6}><Card><Statistic title="床位使用率" value={`${data.inpatient.bedRate}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="手术台次" value={data.surgery.cases} /></Card></Col>
              <Col span={6}><Card><Statistic title="收入" value={data.finance.revenue} prefix="万" /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>运营明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "noShow", name: "爽约率", value: `${data.outpatient.noShow}%` },
                  { key: "avgStay", name: "平均住院日", value: `${data.inpatient.avgStay}天` },
                  { key: "positiveRate", name: "阳性率", value: `${data.medical.positiveRate}%` },
                  { key: "forecastAlert", name: "容量预警", value: data.forecast.capacityAlert ? "是" : "否" },
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
