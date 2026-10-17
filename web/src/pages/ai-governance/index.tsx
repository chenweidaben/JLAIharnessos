/**
 * 健澜科技 jlmedaios - AI 治理台账 V13 页（M325-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Col, Layout, Row, Spin, Statistic, Table, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface DeployedModel {
  modelName: string;
  version: string;
  deployDate: string;
}

interface Resp {
  deployedModels: DeployedModel[];
  pendingApproval: number;
  rollbackTimes: number;
}

const columns: ColumnsType<DeployedModel> = [
  { title: "模型名", dataIndex: "modelName", key: "modelName" },
  { title: "版本", dataIndex: "version", key: "version" },
  { title: "上线时间", dataIndex: "deployDate", key: "deployDate" },
];

export default function AiGovernancePage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/ai-governance");
        if (!cancelled) setData(resp);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);
  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1024, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>AI 治理台账</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={12}>
                <Card>
                  <Statistic title="待批数" value={data.pendingApproval} />
                </Card>
              </Col>
              <Col span={12}>
                <Card>
                  <Statistic title="回滚次数" value={data.rollbackTimes} />
                </Card>
              </Col>
            </Row>
            <Card title="已上线模型清单">
              <Table columns={columns} dataSource={data.deployedModels} rowKey="modelName" pagination={false} />
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
