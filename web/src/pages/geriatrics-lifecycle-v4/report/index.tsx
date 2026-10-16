/**
 * 健澜科技 jlmedaios - 老年全周期 V4 页（M249-C）
 *
 * CGA躯体心理社会功能环境用药营养感官/Fried握力步速SPPB肌少症运动处方/ADL-IADL失能分级长期照护照护者负担/跌倒压疮谵妄痴呆尿失禁营养不良/MMSE/MoCA早期认知训练阿尔茨海默/PIM重复相互作用deprescribing/抑郁GDS焦虑孤独/预立医疗DNR安宁疗护哀伤。深海蓝 VI。
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
  cga: { patients: number; frail: number; sarcopenia: number };
  disability: { adl: number; iadl: number; longTerm: number };
  syndrome: { fall: number; pressure: number; dementia: number; incontinence: number };
  medication: { pim: number; deprescribing: number };
  hospice: { advanceDirective: number; dnR: number };
  suggestions: string[];
}

export default function GeriatricsLifecycleV4Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/geriatrics-lifecycle-v4/report");
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
        <Title level={3} style={{ color: VI.deep }}>老年全周期 V4</Title>
        <Paragraph type="secondary">CGA·躯体·心理·社会·功能·环境·用药·营养·感官 / Fried·握力·步速·SPPB·肌少症·运动处方 / ADL·IADL·失能分级·长期照护·照护者负担 / 跌倒·压疮·谵妄·痴呆·尿失禁·营养不良 / MMSE·MoCA·认知训练·阿尔茨海默·PIM·deprescribing / 抑郁·GDS·焦虑·孤独 / 预立医疗·DNR·安宁疗护·哀伤</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="CGA 评估" value={data.cga.patients} /></Card></Col>
              <Col span={6}><Card><Statistic title="衰弱" value={data.cga.frail} /></Card></Col>
              <Col span={6}><Card><Statistic title="跌倒" value={data.syndrome.fall} /></Card></Col>
              <Col span={6}><Card><Statistic title="痴呆" value={data.syndrome.dementia} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>老年明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "sarcopenia", name: "肌少症", value: data.cga.sarcopenia },
                  { key: "iadl", name: "IADL 失能", value: data.disability.iadl },
                  { key: "pim", name: "PIM 用药", value: data.medication.pim },
                  { key: "advanceDirective", name: "预立医疗", value: data.hospice.advanceDirective },
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
