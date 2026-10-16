/**
 * 健澜科技 jlmedaios - 肾病与血液净化管理 V5 页（M265-B）
 *
 * AKI分级肾前肾性肾后CRRT液体管理预后/CKD 1-5期/eGFR蛋白尿并发症随访延缓进展/血液透析血液滤过腹膜透析通路干体重充分性/配型供肾术后抗排异感染随访/钠钾钙磷Mg酸碱平衡利尿剂透析调整/蛋白尿低蛋白水肿高脂激素免疫抑制剂/与内分泌协同降尿酸肾脏保护饮食/AKI发生率CKD进展透析充分性再住院死亡率。深海蓝 VI。
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
  aki: { grade: number; prerenal: number; intrarenal: number; postrenal: number; crrt: number; fluid: number; outcome: number };
  ckd: { stage1: number; stage2: number; stage3: number; stage4: number; stage5: number; egfr: number; proteinuria: number; complication: number; followup: number; slowProgression: number };
  dialysis: { hd: number; hdf: number; pd: number; access: number; dryWeight: number; adequacy: number };
  transplant: { matching: number; graft: number; postop: number; immunosuppression: number; infection: number; followup: number };
  electrolyte: { na: number; k: number; ca: number; p: number; mg: number; acidBase: number; diuretic: number; dialysisAdjustment: number };
  nephrotic: { proteinuria: number; hypoalbuminemia: number; edema: number; hyperlipidemia: number; steroid: number; immunosuppressant: number };
  gout: { nephroCollab: number; acuteFlare: number; urateLowering: number; diet: number; comorbidity: number };
  metrics: { akiIncidence: number; ckdProgression: number; dialysisAdequacy: number; readmission: number; mortality: number };
  suggestions: string[];
}

export default function NephrologyV5Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/nephrology-v5/report");
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
        <Title level={3} style={{ color: VI.deep }}>肾病与血液净化管理 V5</Title>
        <Paragraph type="secondary">AKI 分级·肾前·肾性·肾后·CRRT·液体管理·预后 / CKD 1-5 期·eGFR·蛋白尿·并发症·随访·延缓进展 / 血液透析·血液滤过·腹膜透析·通路·干体重·充分性 / 配型·供肾·术后·抗排异·感染·随访</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="AKI 发生率" value={`${data.metrics.akiIncidence}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="CKD 进展率" value={`${data.metrics.ckdProgression}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="透析充分性" value={`${data.metrics.dialysisAdequacy}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="再住院率" value={`${data.metrics.readmission}%`} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>肾病明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "hd", name: "血液透析", value: data.dialysis.hd },
                  { key: "ckd5", name: "CKD 5期", value: data.ckd.stage5 },
                  { key: "crrt", name: "CRRT", value: data.aki.crrt },
                  { key: "transplant", name: "肾移植", value: data.transplant.graft },
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
