/**
 * 健澜科技 jlmedaios - 门诊医生工作站
 *
 * 一屏四栏：
 *   ① 病历模板快捷调用（一键带入病史片段）
 *   ② 处方历史（近 30 天门诊处方）
 *   ③ ICD 诊断搜索（按名称/编码/拼音码过滤）
 *   ④ 检查检验开立（勾选目录项）
 *
 * 数据来自 GET /api/v1/opd/workstation；无真实库时后端返回 demo:true 演示数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useMemo } from 'react';
import {
  Alert,
  Card,
  Checkbox,
  Layout,
  List,
  Space,
  Spin,
  Tag,
  Typography,
  Input,
  Divider,
} from 'antd';
import { usePermission } from '@/router/guards';
import { filterIcd, useOpdWorkstationStore } from '@/store/opdWorkstationStore';
import { EXAM_CATEGORY_COLOR } from '@/types/opdWorkstation';

const { Header, Content } = Layout;
const { Title, Text, Paragraph } = Typography;

export default function OpdWorkstationPage() {
  const {
    loading, error, demo, updatedAt,
    templates, prescriptions, diagnoses, catalog,
    keyword, setKeyword,
    activeSnippet, applyTemplate,
    selectedItemIds, toggleCatalogItem,
    load,
  } = useOpdWorkstationStore();
  usePermission();

  useEffect(() => { void load(); }, [load]);

  const filteredDiagnoses = useMemo(
    () => filterIcd(diagnoses, keyword),
    [diagnoses, keyword],
  );

  const selectedItems = useMemo(
    () => catalog.filter((it) => selectedItemIds.includes(it.itemId)),
    [catalog, selectedItemIds],
  );
  const selectedTotal = selectedItems.reduce((sum, it) => sum + it.price, 0);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Title level={4} style={{ color: '#fff', margin: 0 }}>门诊医生工作站</Title>
        {updatedAt && <Text style={{ color: 'rgba(255,255,255,0.65)' }}>更新于 {new Date(updatedAt).toLocaleTimeString()}</Text>}
      </Header>
      <Content style={{ padding: 16 }}>
        {error && <Alert type="error" showIcon style={{ marginBottom: 12 }} message={error} />}
        {demo && (
          <Alert
            type="warning"
            showIcon
            style={{ marginBottom: 12 }}
            message="当前为演示数据"
            description="未接入真实门诊库，展示内置演示数据集（模板/处方/ICD/检查检验目录）。"
          />
        )}

        <Spin spinning={loading}>
          {/* M128-A 移动端响应式：桌面4列/平板2列/手机1列（移动端+性能优化） */}
          <div className="jl-opd-workbench-grid">
            {/* ① 病历模板快捷调用 */}
            <Card size="small" title="病历模板快捷调用" className="jl-opd-card">
              <List
                size="small"
                dataSource={templates}
                locale={{ emptyText: '暂无模板' }}
                renderItem={(t) => (
                  <List.Item
                    style={{ cursor: 'pointer' }}
                    onClick={() => applyTemplate(t.snippet)}
                  >
                    <Space direction="vertical" size={2}>
                      <Space>
                        <Text strong>{t.name}</Text>
                        <Tag>{t.category}</Tag>
                      </Space>
                      <Text type="secondary" style={{ fontSize: 12 }}>点击带入病史片段</Text>
                    </Space>
                  </List.Item>
                )}
              />
              <Divider style={{ margin: '12px 0' }} />
              <Text type="secondary" style={{ fontSize: 12 }}>当前带入片段：</Text>
              <Paragraph
                style={{ marginTop: 8, padding: 8, background: '#f6f8fa', borderRadius: 6, fontSize: 12 }}
                ellipsis={{ rows: 6, expandable: true, symbol: '展开' }}
              >
                {activeSnippet ?? '（未选择模板）'}
              </Paragraph>
            </Card>

            {/* ② 处方历史 */}
            <Card size="small" title="处方历史" className="jl-opd-card">
              <List
                size="small"
                dataSource={prescriptions}
                locale={{ emptyText: '暂无处方' }}
                renderItem={(r) => (
                  <List.Item>
                    <Space direction="vertical" size={2} style={{ width: '100%' }}>
                      <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                        <Text strong>{r.patientName}</Text>
                        <Tag color={r.status === '已退回' ? 'red' : r.status === '已发药' ? 'green' : 'default'}>
                          {r.status}
                        </Tag>
                      </Space>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {r.dept} · {r.doctor} · {new Date(r.issuedAt).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </Text>
                      {r.drugs.map((d, i) => (
                        <Text key={i} style={{ fontSize: 12 }}>
                          · {d.drugName} {d.dosage}/{d.frequency}×{d.days}d
                        </Text>
                      ))}
                      <Text type="secondary" style={{ fontSize: 12 }}>金额 ¥{r.totalAmount.toFixed(2)}</Text>
                    </Space>
                  </List.Item>
                )}
              />
            </Card>

            {/* ③ ICD 诊断搜索 */}
            <Card size="small" title="ICD 诊断搜索" className="jl-opd-card">
              <Input.Search
                placeholder="名称 / 编码 / 拼音码，如 高血压、I10、gxy"
                allowClear
                style={{ marginBottom: 8 }}
                onChange={(e) => setKeyword(e.target.value)}
              />
              <List
                size="small"
                dataSource={filteredDiagnoses}
                locale={{ emptyText: '无匹配诊断' }}
                renderItem={(d) => (
                  <List.Item>
                    <Space direction="vertical" size={0}>
                      <Text strong style={{ fontSize: 13 }}>{d.name}</Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>{d.icdCode} · {d.pyCode}</Text>
                    </Space>
                  </List.Item>
                )}
              />
            </Card>

            {/* ④ 检查检验开立 */}
            <Card
              size="small"
              title={
                <span>检查检验开立{selectedItemIds.length > 0 && <Tag color="blue" style={{ marginLeft: 8 }}>已选 {selectedItemIds.length}</Tag>}</span>
              }
              className="jl-opd-card"
              extra={<Text type="secondary" style={{ fontSize: 12 }}>合计 ¥{selectedTotal.toFixed(2)}</Text>}
            >
              <List
                size="small"
                dataSource={catalog}
                locale={{ emptyText: '暂无目录' }}
                renderItem={(it) => (
                  <List.Item>
                    <Checkbox
                      checked={selectedItemIds.includes(it.itemId)}
                      onChange={() => toggleCatalogItem(it.itemId)}
                    >
                      <Space direction="vertical" size={0}>
                        <Space size={6}>
                          <Tag color={EXAM_CATEGORY_COLOR[it.category]}>{it.category}</Tag>
                          <Text style={{ fontSize: 13 }}>{it.name}</Text>
                        </Space>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {it.itemCode} · ¥{it.price.toFixed(2)} · {it.eta}
                        </Text>
                      </Space>
                    </Checkbox>
                  </List.Item>
                )}
              />
            </Card>
          </div>
        </Spin>
      </Content>
    </Layout>
  );
}
