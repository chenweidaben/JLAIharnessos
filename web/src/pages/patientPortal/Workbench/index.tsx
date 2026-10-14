/**
 * 健澜科技 jlmedaios - 互联网医院患者端简化工作台（portal workbench）
 *
 * 四张卡片：待支付金额 / 待取药数 / 随访提醒列表 / 在线咨询入口。
 * 数据合并自已有 internet 端点（M3-M 支付、M3-N 配送、M3-J 医生），
 * 缺数据子项降级为演示行并标 demo:true（页面以「演示」Tag 区分）。
 * 深海蓝 VI：主色 #0A2540，头部渐变 #073A6B → #0A4D8C，强调 #4A90D9，浅底 #E8F0F8。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Button,
  Card,
  Col,
  List,
  Row,
  Spin,
  Statistic,
  Tag,
  Typography,
} from 'antd';
import {
  ArrowRightOutlined,
  CalendarOutlined,
  MedicineBoxOutlined,
  MessageOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import { usePermission } from '@/router/guards';
import { usePatientPortalStore } from '@/store/patientPortalStore';

const { Title, Text, Paragraph } = Typography;

/** 深海蓝 VI 色板 */
const VI = {
  title: '#0A2540',
  headerFrom: '#073A6B',
  headerTo: '#0A4D8C',
  accent: '#4A90D9',
  bgSoft: '#E8F0F8',
};

/** 演示行标记 */
function DemoTag() {
  return <Tag color="default" style={{ marginLeft: 8 }}>演示</Tag>;
}

export default function PatientWorkbenchPage() {
  const { workbench, workbenchLoading, workbenchError, loadWorkbench } = usePatientPortalStore();
  const navigate = useNavigate();
  usePermission();

  useEffect(() => { void loadWorkbench(); }, [loadWorkbench]);

  return (
    <Spin spinning={workbenchLoading}>
      <div style={{ minHeight: '100vh', background: '#F5F8FC' }}>
        {/* 深海蓝 Hero 横幅 */}
        <div
          style={{
            background: `linear-gradient(120deg, ${VI.headerFrom}, ${VI.headerTo})`,
            padding: '28px 32px',
          }}
        >
          <Title level={3} style={{ color: '#fff', margin: 0 }}>患者工作台</Title>
          <Text style={{ color: 'rgba(255,255,255,0.85)' }}>
            待办一目了然 · 健澜深海蓝 VI · 演示数据以「演示」标签区分
          </Text>
        </div>

        <div style={{ padding: 24 }}>
          {workbenchError && (
            <Alert type="error" showIcon style={{ marginBottom: 16 }} message={workbenchError} />
          )}

          <Row gutter={[16, 16]}>
            {/* 卡片 1：待支付金额（M3-M） */}
            <Col xs={24} sm={12}>
              <Card>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div
                    style={{
                      width: 44, height: 44, borderRadius: 8,
                      background: VI.bgSoft, color: VI.accent,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 22, marginRight: 12,
                    }}
                  >
                    <WalletOutlined />
                  </div>
                  <Statistic
                    title={<>待支付金额{workbench?.payable.demo && <DemoTag />}</>}
                    value={workbench?.payable.totalAmount ?? 0}
                    precision={2}
                    prefix="¥"
                    valueStyle={{ color: VI.title }}
                  />
                </div>
                <Paragraph type="secondary" style={{ marginTop: 12, marginBottom: 0 }}>
                  {workbench
                    ? `${workbench.payable.count} 张处方待支付`
                    : '—'}
                </Paragraph>
                <List
                  size="small"
                  dataSource={(workbench?.payable.items ?? []).slice(0, 2)}
                  renderItem={(it) => (
                    <List.Item>
                      <Text type="secondary">{it.rxNo}</Text>
                      {it.demo && <Tag>演示</Tag>}
                    </List.Item>
                  )}
                />
              </Card>
            </Col>

            {/* 卡片 2：待取药数（M3-N） */}
            <Col xs={24} sm={12}>
              <Card>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div
                    style={{
                      width: 44, height: 44, borderRadius: 8,
                      background: VI.bgSoft, color: VI.accent,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 22, marginRight: 12,
                    }}
                  >
                    <MedicineBoxOutlined />
                  </div>
                  <Statistic
                    title={<>待取药{workbench?.pickup.demo && <DemoTag />}</>}
                    value={workbench?.pickup.count ?? 0}
                    suffix="单"
                    valueStyle={{ color: VI.title }}
                  />
                </div>
                <List
                  size="small"
                  dataSource={(workbench?.pickup.items ?? []).slice(0, 3)}
                  renderItem={(it) => (
                    <List.Item>
                      <Text>
                        {it.statusLabel ?? '待取药'}
                        {it.channel === 'self_pick' && it.pickupCode && (
                          <Text strong style={{ marginLeft: 8, color: VI.accent }}>
                            取药码 {it.pickupCode}
                          </Text>
                        )}
                      </Text>
                      {it.demo && <Tag>演示</Tag>}
                    </List.Item>
                  )}
                />
              </Card>
            </Col>

            {/* 卡片 3：随访提醒列表（当前为演示行） */}
            <Col xs={24} sm={12}>
              <Card>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                  <div
                    style={{
                      width: 44, height: 44, borderRadius: 8,
                      background: VI.bgSoft, color: VI.accent,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 22, marginRight: 12,
                    }}
                  >
                    <CalendarOutlined />
                  </div>
                  <Title level={5} style={{ color: VI.title, margin: 0 }}>随访提醒</Title>
                </div>
                <List
                  size="small"
                  dataSource={workbench?.followups ?? []}
                  locale={{ emptyText: '暂无随访提醒' }}
                  renderItem={(it) => (
                    <List.Item>
                      <Text>{it.title}</Text>
                      <Text type="secondary">
                        {it.dueDate}
                        {it.demo && <Tag style={{ marginLeft: 8 }}>演示</Tag>}
                      </Text>
                    </List.Item>
                  )}
                />
              </Card>
            </Col>

            {/* 卡片 4：在线咨询入口 */}
            <Col xs={24} sm={12}>
              <Card
                style={{
                  background: `linear-gradient(135deg, ${VI.bgSoft}, #fff)`,
                  borderColor: '#C9DCEF',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                  <div
                    style={{
                      width: 44, height: 44, borderRadius: 8,
                      background: VI.accent, color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 22, marginRight: 12,
                    }}
                  >
                    <MessageOutlined />
                  </div>
                  <Title level={5} style={{ color: VI.title, margin: 0 }}>在线咨询</Title>
                </div>
                <Paragraph type="secondary">
                  {workbench
                    ? `在线医生 ${workbench.consult.availableDoctors} 位${workbench.consult.demo ? '（演示）' : ''}`
                    : '连接医生，图文咨询'}
                </Paragraph>
                <Button
                  type="primary"
                  icon={<ArrowRightOutlined />}
                  style={{ background: VI.accent, borderColor: VI.accent }}
                  onClick={() => navigate(workbench?.consult.entryPath ?? '/portal/consult')}
                >
                  进入在线咨询
                </Button>
              </Card>
            </Col>
          </Row>

          <Paragraph type="secondary" style={{ marginTop: 24, textAlign: 'center' }}>
            健澜科技 · 互联网医院患者端
          </Paragraph>
        </div>
      </div>
    </Spin>
  );
}
