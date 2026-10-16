/**
 * 健澜科技 jlmedaios - 国考绩效 55 指标 V5 页（M267-A）
 *
 * 医疗质量（四级手术占比/低风险组死亡率/III级手术/中医非药物/DRG能力）/运营效率（平均住院日/门诊住院次均费用/医疗服务收入占比/人员支出占比）/持续发展（麻醉/儿科/病理医师占比/人才结构/科研经费/职称）/满意度（门诊/住院/员工满意度/投诉/纠纷/体验）/指标分解（院级→科级→个人/阈值/红黄绿灯/同比/环比/对标全国均值）/短板诊断（落后指标/根因/改进措施/责任科室/PDCA/进展跟踪）/数据质量（指标口径/数据来源/自动采集/人工补录/校验/上报）/国考看板（55指标仪表盘/雷达图/趋势/排名模拟/领导驾驶舱）。深海蓝 VI。
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
  medicalQuality: { grade4Surgery: number; lowRiskMortality: number; grade3Surgery: number; tcmNonDrug: number; drgAbility: number };
  operational: { los: number; outpatientCost: number; inpatientCost: number; serviceRevenue: number; staffExpense: number };
  sustained: { anesthesiaRatio: number; pediatricRatio: number; pathologistRatio: number; talent: number; researchFund: number; title: number };
  satisfaction: { outpatient: number; inpatient: number; staff: number; complaint: number; dispute: number; experience: number };
  decomposition: { hospital: number; dept: number; person: number; threshold: number; ryG: number; yoy: number; benchmark: number };
  weakness: { lagging: number; rootCause: number; action: number; dept: number; pdca: number; followup: number };
  dataQuality: { definition: number; source: number; auto: number; manual: number; validation: number; report: number };
  dashboard: { dashboard: number; radar: number; trend: number; ranking: number; cockpit: number };
  metrics: { total: number; grade: string; rank: string; weakCount: number; criticalCount: number };
  suggestions: string[];
}

export default function NationalExamV5Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/national-exam-v5/report");
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
        <Title level={3} style={{ color: VI.deep }}>国考绩效 55 指标 V5</Title>
        <Paragraph type="secondary">医疗质量·四级手术·低风险死亡率·DRG能力 / 运营效率·平均住院日·次均费用·医疗服务收入占比 / 持续发展·麻醉·儿科·病理医师占比·科研经费 / 满意度·门诊·住院·员工·投诉·纠纷·体验</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="总分" value={data.metrics.total} suffix={`(${data.metrics.grade})`} /></Card></Col>
              <Col span={6}><Card><Statistic title="全国排名" value={data.metrics.rank} /></Card></Col>
              <Col span={6}><Card><Statistic title="短板指标" value={data.metrics.weakCount} /></Card></Col>
              <Col span={6}><Card><Statistic title="关键短板" value={data.metrics.criticalCount} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>国考明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "g4", name: "四级手术占比", value: `${data.medicalQuality.grade4Surgery}%` },
                  { key: "los", name: "平均住院日", value: `${data.operational.los}天` },
                  { key: "satisfaction", name: "门诊满意度", value: `${data.satisfaction.outpatient}%` },
                  { key: "drg", name: "DRG能力", value: data.medicalQuality.drgAbility },
                ]}
                columns={[
                  { title: "指标", dataIndex: "name", key: "name" },
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
