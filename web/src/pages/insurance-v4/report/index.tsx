/**
 * 健澜科技 jlmedaios - 医保 V4 页（M252-C）
 *
 * 职工居民大病救助异地门诊住院统筹/DRG-DIP分组方案权重点数费用结构盈亏病种结构/实时DRG-DIP年终清算智能结算/目录限定支付自费事前提醒事后审核智能监控/异常费用违规申诉整改智能审核/总额预付按项目按病种按床日按人头混合支付/考核指标得分排名奖惩整改信用/窗口咨询转诊异地备案电子凭证一站式。深海蓝 VI。
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
  policy: { employee: number; resident: number; catastrophic: number; relocation: number };
  drg: { grouping: number; weight: number; point: number; profitLoss: number };
  settlement: { realtime: number; yearend: number; smart: number };
  review: { preAlert: number; postReview: number; abnormal: number; appeal: number };
  payment: { prepaid: number; perCase: number; perDiem: number; perCapita: number };
  assessment: { score: number; ranking: number; penalty: number; credit: number };
  suggestions: string[];
}

export default function InsuranceV4Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/insurance-v4/report");
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
        <Title level={3} style={{ color: VI.deep }}>医保 V4</Title>
        <Paragraph type="secondary">职工·居民·大病·救助·异地·统筹 / DRG·DIP·分组·权重·点数·盈亏 / 实时结算·年终清算·智能结算 / 目录·限定支付·事前提醒·事后审核·监控 / 异常费用·违规·申诉·整改·智能审核 / 总额预付·按项目·按病种·按床日·混合支付 / 考核·得分·排名·奖惩·信用 / 窗口·转诊·异地备案·电子凭证·一站式</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="职工医保" value={data.policy.employee} /></Card></Col>
              <Col span={6}><Card><Statistic title="DRG 入组" value={data.drg.grouping} /></Card></Col>
              <Col span={6}><Card><Statistic title="智能结算率" value={`${data.settlement.smart}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="考核得分" value={data.assessment.score} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>医保明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "resident", name: "居民医保", value: data.policy.resident },
                  { key: "weight", name: "DRG 权重", value: data.drg.weight },
                  { key: "abnormal", name: "异常费用", value: data.review.abnormal },
                  { key: "ranking", name: "排名", value: `第${data.assessment.ranking}` },
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
