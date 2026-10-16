/**
 * 健澜科技 jlmedaios - 基因精准 V2 页（M247-C）
 *
 * 孕前产前新生儿肿瘤药物基因全外显子/华法林氯吡格雷他克莫司免疫抑制剂/靶向免疫伴随诊断TMB-HRD-MSI液体活检/系谱PGT/二次报告。深海蓝 VI。
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
  testing: { preconception: number; prenatal: number; newborn: number; oncology: number };
  pharmacogenomics: { warfarin: number; clopidogrel: number; tacrolimus: number };
  tumor: { targeted: number; immunotherapy: number; liquidBiopsy: number };
  suggestions: string[];
}

export default function GenomicPrecisionV2Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/genomic-precision-v2/report");
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
        <Title level={3} style={{ color: VI.deep }}>基因与精准医疗 V2</Title>
        <Paragraph type="secondary">孕前·产前·新生儿·肿瘤·药物基因·全外显子 / 华法林·氯吡格雷·他克莫司·免疫抑制剂 / 靶向·免疫·伴随诊断·TMB·HRD·MSI·液体活检 / 系谱·PGT·二次报告</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="新生儿筛查" value={data.testing.newborn} /></Card></Col>
              <Col span={6}><Card><Statistic title="华法林基因" value={data.pharmacogenomics.warfarin} /></Card></Col>
              <Col span={6}><Card><Statistic title="靶向治疗" value={data.tumor.targeted} /></Card></Col>
              <Col span={6}><Card><Statistic title="液体活检" value={data.tumor.liquidBiopsy} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>检测明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "prenatal", name: "产前诊断", value: data.testing.prenatal },
                  { key: "oncology", name: "肿瘤基因", value: data.testing.oncology },
                  { key: "clopidogrel", name: "氯吡格雷", value: data.pharmacogenomics.clopidogrel },
                  { key: "immunotherapy", name: "免疫治疗", value: data.tumor.immunotherapy },
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
