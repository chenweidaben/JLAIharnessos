/**
 * 健澜科技 jlmedaios - 皮肤与感染性疾病 V5 页（M266-C）
 *
 * 湿疹皮炎银屑病痤疮荨麻疹真菌病毒皮肤肿瘤/梅毒淋病衣原体HIV HPV生殖器疱疹接触者追踪/发热待查细菌病毒真菌寄生虫抗感染治疗/MDRO职业暴露手卫生环境消毒暴发处置/流感肺炎HPV乙肝暴露后预防旅行医学/活检冷冻激光手术病理美容/药疹Stevens-Johnson中毒性表皮坏死斑贴试验/治愈率复发率耐药率职业暴露暴发事件。深海蓝 VI。
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
  dermatology: { eczema: number; dermatitis: number; psoriasis: number; acne: number; urticaria: number; fungal: number; viral: number; skinTumor: number };
  sti: { syphilis: number; gonorrhea: number; chlamydia: number; hiv: number; hpv: number; hsv: number; contactTracing: number };
  infectious: { feverWorkup: number; bacterial: number; viral: number; fungal: number; parasitic: number; antimicrobial: number };
  hai: { mdro: number; occupationalExposure: number; handHygiene: number; envDisinfection: number; outbreak: number };
  vaccine: { flu: number; pneumococcal: number; hpvVaccine: number; hbv: number; pep: number; travelMedicine: number };
  procedure: { biopsy: number; cryo: number; laser: number; surgery: number; pathology: number; cosmetic: number };
  drugEruption: { drugEruption: number; sjs: number; ten: number; patchTest: number };
  metrics: { cure: number; recurrence: number; resistance: number; occupational: number; outbreakEvent: number };
  suggestions: string[];
}

export default function DermInfectiousV5Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/derm-infectious-v5/report");
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
        <Title level={3} style={{ color: VI.deep }}>皮肤与感染性疾病 V5</Title>
        <Paragraph type="secondary">湿疹·皮炎·银屑病·痤疮·荨麻疹·真菌·病毒·皮肤肿瘤 / 梅毒·淋病·衣原体·HIV·HPV·生殖器疱疹·接触者追踪 / 发热待查·细菌·病毒·真菌·寄生虫·抗感染治疗 / MDRO·职业暴露·手卫生·环境消毒·暴发处置</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="治愈率" value={`${data.metrics.cure}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="复发率" value={`${data.metrics.recurrence}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="耐药率" value={`${data.metrics.resistance}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="暴发事件" value={data.metrics.outbreakEvent} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>皮肤感染明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "eczema", name: "湿疹", value: data.dermatology.eczema },
                  { key: "hpv", name: "HPV", value: data.sti.hpv },
                  { key: "mdro", name: "MDRO", value: data.hai.mdro },
                  { key: "biopsy", name: "皮肤活检", value: data.procedure.biopsy },
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
