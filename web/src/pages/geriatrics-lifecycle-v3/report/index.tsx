/**
 * 健澜科技 jlmedaios - 老年健康全周期 V3 页（M239-C）
 *
 * CGA综合评估/Fried衰弱握力步速SPPB/ADL-IADL失能分级/长期照护/老年综合征跌倒谵妄MMSE-MoCA/PIM用药/安宁疗护。深海蓝 VI。
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
  cga: number;
  frailty: { robust: number; preFrail: number; frail: number };
  disability: { adl: number; iadl: number };
  syndrome: { fall: number; delirium: number; pain: number };
  cognition: { mmse: number; moca: number };
  pim: number;
  hospice: number;
  suggestions: string[];
}

export default function GeriatricsLifecycleV3Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/geriatrics-lifecycle-v3/report");
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
        <Title level={3} style={{ color: VI.deep }}>老年健康全周期 V3</Title>
        <Paragraph type="secondary">CGA 综合评估 / Fried 衰弱·握力·步速·SPPB / ADL·IADL 失能分级 / 老年综合征·跌倒·谵妄·MMSE-MoCA / PIM 用药 / 安宁疗护</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="CGA 评估" value={data.cga} /></Card></Col>
              <Col span={6}><Card><Statistic title="衰弱前期" value={data.frailty.preFrail} /></Card></Col>
              <Col span={6}><Card><Statistic title="跌倒事件" value={data.syndrome.fall} /></Card></Col>
              <Col span={6}><Card><Statistic title="MMSE 筛查" value={data.cognition.mmse} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>老年明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "frail", name: "衰弱", value: data.frailty.frail },
                  { key: "iadl", name: "IADL 失能", value: data.disability.iadl },
                  { key: "delirium", name: "谵妄", value: data.syndrome.delirium },
                  { key: "pim", name: "PIM 用药", value: data.pim },
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
