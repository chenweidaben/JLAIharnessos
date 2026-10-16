/**
 * 健澜科技 jlmedaios - 卒中中心智能化 V5 页（M263-B）
 *
 * FAST/BEFAST急诊分诊卒中绿色通道NIHSS/DNT时间适应症禁忌症知情同意溶栓后监护/大血管闭塞桥接机械取栓再通围手术期/脑出血TIA低血糖癫痫后偏头痛颅内占位鉴别/监护血压血糖吞咽早期康复深静脉血栓预防/抗栓他汀降压降糖生活方式随访复发/卒中中心数据库质控认证持续改进区域协同/NCCT/CTA/CTP/ASPECTS/大血管闭塞自动识别。深海蓝 VI。
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
  triage: { fast: number; befast: number; greenChannel: number; nihss: number };
  thrombolysis: { dnt: number; indication: number; contraindication: number; consent: number; monitoring: number };
  thrombectomy: { lvo: number; bridging: number; mechanical: number; recanalization: number; perioperative: number };
  differential: { ich: number; tia: number; hypoglycemia: number; postictal: number; migraine: number; mass: number };
  strokeUnit: { bp: number; glucose: number; swallow: number; earlyRehab: number; dvtPrevention: number };
  secondary: { antiplatelet: number; statin: number; antiHtn: number; antiDiabetic: number; lifestyle: number; followup: number; recurrence: number };
  quality: { database: number; qc: number; certification: number; continuous: number; regional: number };
  ai: { ncct: number; cta: number; ctp: number; aspects: number; lvoAuto: number };
  metrics: { dnt: number; recanalization: number; mortality: number; disability: number; recurrence: number };
  suggestions: string[];
}

export default function StrokeCenterV5Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/stroke-center-v5/report");
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
        <Title level={3} style={{ color: VI.deep }}>卒中中心智能化 V5</Title>
        <Paragraph type="secondary">FAST/BEFAST·急诊分诊·卒中绿色通道·NIHSS / DNT 时间·适应症·禁忌症·知情同意·溶栓后监护 / 大血管闭塞·桥接·机械取栓·再通·围手术期 / 脑出血·TIA·低血糖·癫痫后·偏头痛·颅内占位鉴别</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="DNT 时间" value={`${data.metrics.dnt}分钟`} /></Card></Col>
              <Col span={6}><Card><Statistic title="再通率" value={`${data.metrics.recanalization}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="死亡率" value={`${data.metrics.mortality}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="致残率" value={`${data.metrics.disability}%`} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>卒中明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "fast", name: "FAST 识别", value: `${data.triage.fast}%` },
                  { key: "mechanical", name: "机械取栓", value: data.thrombectomy.mechanical },
                  { key: "antiplatelet", name: "抗血小板", value: `${data.secondary.antiplatelet}%` },
                  { key: "aiLVO", name: "AI LVO 识别", value: `${data.ai.lvoAuto}%` },
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
