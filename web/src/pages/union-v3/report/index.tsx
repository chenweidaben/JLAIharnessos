/**
 * 健澜科技 jlmedaios - 工会群团 V3 页（M245-D）
 *
 * 工会委员会分工会小组换届会员经费/职代会院务公开民主评议合理化建议/节日生日困难补助互助保险EAP/女职工两癌/共青团青年文明号。深海蓝 VI。
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
  organization: { committee: number; branch: number; members: number };
  democracy: { workerCongress: number; openAffairs: number; suggestions: number };
  welfare: { subsidy: number; mutualInsurance: number; eap: number };
  youth: { communistYouth: number; femaleCancer: number };
  suggestions: string[];
}

export default function UnionV3Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/union-v3/report");
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
        <Title level={3} style={{ color: VI.deep }}>工会群团 V3</Title>
        <Paragraph type="secondary">工会委员会·分工会·小组换届·会员经费 / 职代会·院务公开·民主评议·合理化建议 / 节日·生日·困难补助·互助保险·EAP / 女职工两癌 / 共青团·青年文明号</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="工会会员" value={data.organization.members} /></Card></Col>
              <Col span={6}><Card><Statistic title="职代会" value={data.democracy.workerCongress} /></Card></Col>
              <Col span={6}><Card><Statistic title="困难补助" value={data.welfare.subsidy} /></Card></Col>
              <Col span={6}><Card><Statistic title="共青团员" value={data.youth.communistYouth} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>群团明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "branch", name: "分工会", value: data.organization.branch },
                  { key: "suggestions", name: "合理化建议", value: data.democracy.suggestions },
                  { key: "mutualInsurance", name: "互助保险", value: data.welfare.mutualInsurance },
                  { key: "femaleCancer", name: "女职工两癌筛查", value: data.youth.femaleCancer },
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
