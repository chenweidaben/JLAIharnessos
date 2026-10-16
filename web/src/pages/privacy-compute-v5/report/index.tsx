/**
 * 健澜科技 jlmedaios - 隐私计算与数据要素流通 V5 页（M261-B）
 *
 * 公开内部敏感核心标注审核动态调整/联邦学习多方安全计算可信执行环境同态加密差分隐私/静态动态格式保留替换泛化masking/数据持有权使用权经营权授权链智能合约/可用不可见数据出域审计计算结果审查留痕/个保法数据安全法医疗卫生机构网络安全管理办法/医疗数据产品估值定价交易收益分配/敏感数据占比脱敏率授权率数据共享量合规事件。深海蓝 VI。
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
  classification: { public: number; internal: number; sensitive: number; core: number; label: number; review: number; dynamic: number };
  privacyCompute: { federated: number; mpc: number; tee: number; homomorphic: number; differentialPrivacy: number };
  masking: { static: number; dynamic: number; formatPreserving: number; replace: number; generalize: number };
  authorization: { ownership: number; useRight: number; operating: number; license: number; blockchain: number; contract: number };
  sandbox: { usableNotVisible: number; outbound: number; audit: number; resultReview: number; trail: number };
  compliance: { pipl: number; dataSecurity: number; medical: number; cyber: number };
  product: { valuation: number; pricing: number; trading: number; revenue: number };
  metrics: { sensitiveRatio: number; desensitization: number; licensing: number; sharing: number; compliance: number };
  suggestions: string[];
}

export default function PrivacyComputeV5Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/privacy-compute-v5/report");
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
        <Title level={3} style={{ color: VI.deep }}>隐私计算与数据要素流通 V5</Title>
        <Paragraph type="secondary">公开·内部·敏感·核心·标注·审核·动态调整 / 联邦学习·多方安全计算·TEE·同态加密·差分隐私 / 静态·动态·格式保留·替换·泛化 / 数据持有权·使用权·经营权·授权链·智能合约 / 可用不可见·数据出域审计·计算结果审查·留痕</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="敏感数据占比" value={`${data.metrics.sensitiveRatio}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="脱敏率" value={`${data.metrics.desensitization}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="数据共享" value={data.metrics.sharing} /></Card></Col>
              <Col span={6}><Card><Statistic title="合规率" value={`${data.metrics.compliance}%`} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>隐私明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "federated", name: "联邦学习", value: data.privacyCompute.federated },
                  { key: "mpc", name: "多方安全计算", value: data.privacyCompute.mpc },
                  { key: "tee", name: "可信执行环境", value: data.privacyCompute.tee },
                  { key: "revenue", name: "数据产品收益", value: data.product.revenue },
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
