/**
 * 健澜科技 jlmedaios - 神经与精神心理疾病 V5 页（M265-D）
 *
 * 与卒中中心协同TIA脑出血血管认知二级预防/发作类型脑电图用药手术生酮驾驶就业/UPDRS/DBS药物波动康复营养/MG/GBS/MS神经活检免疫治疗康复/MMSE/MoCA/AD路易体额颞照护支持/抑郁PHQ-9焦虑GAD-7失眠双相精神分裂危机干预/心身疾病心理治疗药物EAP医患沟通/卒中复发癫痫控制UPDRS PHQ-9改善自杀率。深海蓝 VI。
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
  cerebrovascular: { strokeCenterCollab: number; tia: number; ich: number; vascularCognition: number; secondaryPrevention: number };
  epilepsy: { seizureType: number; eeg: number; med: number; surgery: number; ketogenic: number; driving: number; employment: number };
  parkinson: { updrs: number; dbs: number; motorFluctuation: number; rehab: number; nutrition: number };
  neuroimmune: { mg: number; gbs: number; ms: number; biopsy: number; immunotherapy: number; rehab: number };
  cognitive: { mmse: number; moca: number; ad: number; lbd: number; ftd: number; caregiverSupport: number };
  psych: { phq9: number; gad7: number; insomnia: number; bipolar: number; schizophrenia: number; crisis: number; psychosomatic: number; psychotherapy: number; med: number; eap: number };
  metrics: { strokeRecurrence: number; seizureControl: number; updrs: number; phq9Improvement: number; suicideRate: number };
  suggestions: string[];
}

export default function NeuroPsychV5Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/neuro-psych-v5/report");
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
        <Title level={3} style={{ color: VI.deep }}>神经与精神心理疾病 V5</Title>
        <Paragraph type="secondary">脑血管·卒中中心协同·TIA·脑出血·血管认知·二级预防 / 癫痫·发作类型·EEG·用药·手术·生酮·驾驶·就业 / PD·UPDRS·DBS·药物波动·康复·营养 / 认知·MMSE·MoCA·AD·LBD·FTD·照护支持</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="卒中复发率" value={`${data.metrics.strokeRecurrence}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="癫痫控制率" value={`${data.metrics.seizureControl}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="UPDRS 改善" value={`${data.metrics.updrs}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="PHQ-9 改善" value={`${data.metrics.phq9Improvement}%`} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>神经心理明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "tia", name: "TIA", value: data.cerebrovascular.tia },
                  { key: "eeg", name: "EEG", value: data.epilepsy.eeg },
                  { key: "mmse", name: "MMSE", value: data.cognitive.mmse },
                  { key: "phq9", name: "PHQ-9", value: data.psych.phq9 },
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
