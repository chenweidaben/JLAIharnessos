/**
 * 健澜科技 jlmedaios - 肿瘤全程管理 V5 页（M264-A）
 *
 * 肺癌LDCT/胃肠镜/乳腺钼靶/宫颈癌HPV/高危人群筛查/病理影像分期TNM/分子分型/MDT/影像组学/手术化疗放疗靶向免疫内分泌/MDT方案推荐/化疗PIVAS/放疗计划/手术排程/靶向用药/输注管理/RECIST影像随访/肿瘤标志物/PFS/OS/不良反应/术后随访/化疗周期/复查计划/复发预警/生存质量/疼痛症状营养心理安宁疗护家属支持/肿瘤登记/随访率/生存率/发病率/质控/数据上报。深海蓝 VI。
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
  screening: { lungLDCT: number; giColonoscopy: number; mammogram: number; cervicalHPV: number; highRisk: number };
  diagnosis: { pathology: number; imaging: number; tnm: number; molecular: number; mdt: number; radiomics: number };
  treatment: { surgery: number; chemo: number; radiation: number; targeted: number; immuno: number; endocrine: number; mdtRegimen: number };
  delivery: { pivas: number; chemoPlan: number; orSchedule: number; targeted: number; infusion: number };
  efficacy: { recist: number; imaging: number; marker: number; pfs: number; os: number; adverse: number };
  followup: { postop: number; chemoCycle: number; review: number; recurrenceAlert: number; qol: number };
  supportive: { pain: number; symptom: number; nutrition: number; psychology: number; hospice: number; familySupport: number };
  registry: { cancerRegistry: number; followupRate: number; survival: number; incidence: number; qc: number; report: number };
  metrics: { followupRate: number; survival: number; incidence: number; mdt: number };
  suggestions: string[];
}

export default function OncologyV5Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/oncology-v5/report");
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
        <Title level={3} style={{ color: VI.deep }}>肿瘤全程管理 V5</Title>
        <Paragraph type="secondary">肺癌 LDCT·胃肠镜·乳腺钼靶·宫颈癌 HPV·高危人群筛查 / 病理影像·分期 TNM·分子分型·MDT·影像组学 / 手术·化疗·放疗·靶向·免疫·内分泌 / 化疗 PIVAS·放疗计划·手术排程·靶向用药·输注管理</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="随访率" value={`${data.metrics.followupRate}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="生存率" value={`${data.metrics.survival}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="发病率" value={data.metrics.incidence} suffix="/10万" /></Card></Col>
              <Col span={6}><Card><Statistic title="MDT 参与率" value={`${data.metrics.mdt}%`} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>肿瘤明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "lung", name: "肺癌筛查 LDCT", value: data.screening.lungLDCT },
                  { key: "surgery", name: "手术", value: data.treatment.surgery },
                  { key: "chemo", name: "化疗", value: data.treatment.chemo },
                  { key: "pfs", name: "中位 PFS", value: `${data.efficacy.pfs}月` },
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
