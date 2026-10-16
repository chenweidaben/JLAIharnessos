/**
 * 健澜科技 jlmedaios - 妇产科与围产 V5 页（M266-B）
 *
 * 早孕产检唐筛NIPT大排畸OGTT胎心监护分娩/妊高症GDM前置胎盘胎盘早剥ICP多胎Rh不合/产后出血子痫羊水栓塞脐带脱垂肩难产复苏/子宫肌瘤卵巢囊肿内膜异位PCOS盆底更年期/宫颈癌内膜癌卵巢癌筛查HPV手术化疗随访/不孕不育辅助生殖避孕流产性健康/盆底腹直肌心理抑郁母乳喂养随访/剖宫产率会阴侧切产后出血新生儿窒息孕产妇死亡。深海蓝 VI。
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
  prenatal: { early: number; anc: number; downScreen: number; nipt: number; anomaly: number; ogtt: number; ctG: number; delivery: number };
  highRisk: { preeclampsia: number; gdm: number; placentaPrevia: number; abruption: number; icp: number; multiple: number; rh: number };
  emergency: { pph: number; eclampsia: number; amnioticEmbolism: number; cordProlapse: number; shoulderDystocia: number; resus: number };
  gynecology: { fibroid: number; ovarianCyst: number; endometriosis: number; pcos: number; pelvicFloor: number; menopause: number };
  oncology: { cervical: number; endometrial: number; ovarian: number; hpv: number; surgery: number; chemo: number; followup: number };
  fertility: { infertility: number; art: number; contraception: number; abortion: number; sexualHealth: number };
  postpartum: { pelvic: number; rectusDiastasis: number; depression: number; breastfeeding: number; followup: number };
  metrics: { cSectionRate: number; episiotomy: number; pphRate: number; neonatalAsphyxia: number; maternalMortality: number };
  suggestions: string[];
}

export default function ObGynV5Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/ob-gyn-v5/report");
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
        <Title level={3} style={{ color: VI.deep }}>妇产科与围产 V5</Title>
        <Paragraph type="secondary">早孕·产检·唐筛·NIPT·大排畸·OGTT·胎心监护·分娩 / 妊高症·GDM·前置胎盘·胎盘早剥·ICP·多胎·Rh不合 / 产后出血·子痫·羊水栓塞·脐带脱垂·肩难产·复苏 / 子宫肌瘤·卵巢囊肿·内膜异位·PCOS·盆底·更年期</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="剖宫产率" value={`${data.metrics.cSectionRate}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="产后出血率" value={`${data.metrics.pphRate}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="新生儿窒息率" value={`${data.metrics.neonatalAsphyxia}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="孕产妇死亡" value={data.metrics.maternalMortality} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>妇产明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "delivery", name: "分娩量", value: data.prenatal.delivery },
                  { key: "gdm", name: "GDM", value: data.highRisk.gdm },
                  { key: "fibroid", name: "子宫肌瘤", value: data.gynecology.fibroid },
                  { key: "hpv", name: "HPV 筛查", value: data.oncology.hpv },
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
