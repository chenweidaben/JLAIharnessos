/**
 * 健澜科技 jlmedaios - 生物样本库与科研数据 V5 页（M269-C）
 *
 * 样本采集（血液/组织/尿液/唾液/基因/影像/临床表型关联）/样本处理（离心/分装/冻存/编号/条码/温度/批次/质量）/样本存储（液氮/-80℃/冰箱/位置/库存/温控/备份/应急）/样本使用（申请/审批/出库/归还/使用记录/共享/收费）/样本质量（完整性/降解/浓度/复孔/QC/批次效应/合格库）/基因数据（测序/变异注释/表型关联/隐私/存储/二次使用授权）/伦理合规（知情同意/生物安全/出口/隐私/伦理委员会/溯源）/样本库指标（样本数/出库率/周转/质量/共享/科研产出）。深海蓝 VI。
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
  collection: { blood: number; tissue: number; urine: number; saliva: number; genetic: number; imaging: number; phenotype: number };
  processing: { centrifugation: number; aliquot: number; freezing: number; barcode: number; temp: number; batch: number; quality: number };
  storage: { liquidNitrogen: number; minus80: number; fridge: number; position: number; inventory: number; tempControl: number; backup: number; emergency: number };
  use: { request: number; approval: number; outbound: number; return: number; record: number; sharing: number; charging: number };
  quality: { integrity: number; degradation: number; concentration: number; duplicate: number; qc: number; batchEffect: number; qualified: number };
  genomic: { sequencing: number; variant: number; phenotypeLink: number; privacy: number; storage: number; secondaryAuth: number };
  ethics: { consent: number; biosecurity: number; export: number; privacy: number; irb: number; traceability: number };
  metrics: { sampleCount: number; outboundRate: number; turnover: number; quality: number; sharing: number; output: number };
  suggestions: string[];
}

export default function BiobankV5Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/biobank-v5/report");
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
        <Title level={3} style={{ color: VI.deep }}>生物样本库与科研数据 V5</Title>
        <Paragraph type="secondary">样本采集·血液·组织·尿液·唾液·基因·影像·临床表型关联 / 样本处理·离心·分装·冻存·编号·条码·温度·批次·质量 / 样本存储·液氮·-80℃·冰箱·位置·库存·温控·备份·应急</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="样本总数" value={data.metrics.sampleCount} /></Card></Col>
              <Col span={6}><Card><Statistic title="出库率" value={`${data.metrics.outboundRate}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="质量合格率" value={`${data.metrics.quality}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="科研产出" value={data.metrics.output} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>样本明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "blood", name: "血液样本", value: data.collection.blood },
                  { key: "tissue", name: "组织样本", value: data.collection.tissue },
                  { key: "genetic", name: "基因样本", value: data.collection.genetic },
                  { key: "sequencing", name: "已测序", value: data.genomic.sequencing },
                ]}
                columns={[
                  { title: "类型", dataIndex: "name", key: "name" },
                  { title: "数量", dataIndex: "value", key: "value" },
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
