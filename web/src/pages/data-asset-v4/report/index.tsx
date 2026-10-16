/**
 * 健澜科技 jlmedaios - 数据资产 V4 页（M253-D）
 *
 * 资产目录业务目录技术目录数据血缘影响分析/数据元数据集代码集值域主数据参考数据/完整准确一致及时唯一合规六维质量监控/分类分级脱敏加密访问控制审计水印DLP/共享目录申请审批接口交换共享API/治理组织Owner管家专员制度考核数据委员会/采集存储使用归档销毁冷热分层留存策略/数据API订阅推送报告大屏智能问答数据产品。深海蓝 VI。
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
  catalog: { asset: number; business: number; tech: number; lineage: number };
  standard: { dataElement: number; dataset: number; code: number; value: number };
  quality: { completeness: number; accuracy: number; consistency: number; timeliness: number; uniqueness: number; compliance: number };
  security: { classification: number; desensitization: number; encryption: number; audit: number; dlp: number };
  sharing: { catalog: number; application: number; approval: number; api: number };
  governance: { owner: number; steward: number; committee: number; kpi: number };
  lifecycle: { acquisition: number; storage: number; use: number; archive: number; destruction: number };
  service: { api: number; subscription: number; push: number; report: number; qa: number };
  suggestions: string[];
}

export default function DataAssetV4Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/data-asset-v4/report");
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
        <Title level={3} style={{ color: VI.deep }}>数据资产 V4</Title>
        <Paragraph type="secondary">资产目录·业务目录·技术目录·数据血缘·影响分析 / 数据元·数据集·代码集·值域·主数据 / 完整·准确·一致·及时·唯一·合规 / 分类分级·脱敏·加密·访问控制·审计·DLP / 共享目录·申请·审批·接口·交换·API / 治理组织·Owner·管家·专员·委员会 / 采集·存储·使用·归档·销毁·冷热分层 / 数据 API·订阅·推送·报告·大屏·问答</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="资产目录" value={data.catalog.asset} /></Card></Col>
              <Col span={6}><Card><Statistic title="数据元" value={data.standard.dataElement} /></Card></Col>
              <Col span={6}><Card><Statistic title="数据质量" value={`${data.quality.completeness}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="数据API" value={data.service.api} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>数据资产明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "lineage", name: "数据血缘", value: `${data.catalog.lineage}%` },
                  { key: "desensitization", name: "脱敏", value: data.security.desensitization },
                  { key: "sharingApi", name: "共享API", value: data.sharing.api },
                  { key: "steward", name: "数据管家", value: data.governance.steward },
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
