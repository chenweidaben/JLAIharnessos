/**
 * 健澜科技 jlmedaios - 药房药事 V4 页（M251-C）
 *
 * 门诊调配发药用药交代处方审核用药咨询智能药房/住院摆药核对配送医嘱审核出院带药夜间药房/PIVAS肠外营养化疗无菌调配成品配送/前置审核合理用药抗菌激素抗肿瘤辅助/采购库存效期麻精冷链追溯UDI/药学监护药历MDT不良反应重整/药事委员会基本药物目录DDD/药学门诊慢病互联网依从性。深海蓝 VI。
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
  outpatient: { dispensing: number; counseling: number; smartPharmacy: number };
  inpatient: { dose: number; check: number; delivery: number; discharge: number };
  pivas: { pn: number; chemo: number; sterile: number };
  review: { preReview: number; rational: number; antibiotic: number; steroid: number };
  supply: { procurement: number; expiry: number; narcotic: number; coldChain: number };
  clinical: { mdt: number; adr: number; reconciliation: number; pharmacyClinic: number };
  suggestions: string[];
}

export default function PharmacyV4Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/pharmacy-v4/report");
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
        <Title level={3} style={{ color: VI.deep }}>药房药事 V4</Title>
        <Paragraph type="secondary">门诊·调配·发药·用药交代·智能药房 / 住院·摆药·核对·配送·出院带药 / PIVAS·肠外营养·化疗·无菌调配 / 前置审核·合理用药·抗菌·激素·抗肿瘤 / 采购·效期·麻精·冷链·UDI / 药学监护·药历·MDT·ADR·重整 / 药事委员会·基本药物·DDD / 药学门诊·慢病·互联网·依从性</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="门诊调配" value={data.outpatient.dispensing} /></Card></Col>
              <Col span={6}><Card><Statistic title="住院摆药" value={data.inpatient.dose} /></Card></Col>
              <Col span={6}><Card><Statistic title="合理用药率" value={`${data.review.rational}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="抗菌药使用强度" value={data.review.antibiotic} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>药事明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "counseling", name: "用药咨询", value: data.outpatient.counseling },
                  { key: "pn", name: "肠外营养", value: data.pivas.pn },
                  { key: "preReview", name: "前置审核", value: data.review.preReview },
                  { key: "pharmacyClinic", name: "药学门诊", value: data.clinical.pharmacyClinic },
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
