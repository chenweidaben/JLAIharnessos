# jlmedaios Helm Chart

> 健澜科技 jlmedaios（健澜科技杠OS）数智医院操作系统 · 参数化 Kubernetes 部署

本 Chart 在 [`deploy/k8s/`](../../k8s/) 一体化清单基础上参数化，支持：

- BFF 后端、Web 前端的 Deployment（可配置副本/资源/镜像）；
- 可选的内置 PostgreSQL / Redis（StatefulSet + PVC），或对接云托管/外部实例；
- Ingress（TLS）、HPA、PDB、ServiceAccount；
- 零信任 NetworkPolicy（可整体关闭）。

## 前置条件

- Kubernetes ≥ 1.24；
- 支持 `helm.sh/chart` 与 `policy/v1` 的集群；
- 若启用 NetworkPolicy，CNI 需支持（Calico/Cilium 等）；
- 若启用 Ingress，需安装 Ingress Controller（如 ingress-nginx）；
- 默认 StorageClass（内置 PostgreSQL/Redis 持久化时）。

## 快速开始

```bash
# 1. 渲染预览（不应用）
helm template jlmedaios deploy/helm/jlmedaios \
  --set ingress.host=his.your-hospital.com \
  --set secret.postgresPassword='<strong>' \
  --set secret.jwtSecret='<32+ chars>' \
  --set secret.encryptionMasterKey='<strong>' \
  --set secret.redisPassword='<strong>'

# 2. 安装
helm install jlmedaios deploy/helm/jlmedaios \
  --namespace jlmedaios --create-namespace \
  --values my-values.yaml

# 3. 查看与升级
kubectl -n jlmedaios get pods
helm upgrade jlmedaios deploy/helm/jlmedaios --values my-values.yaml
helm rollback jlmedaios
```

## 推荐：大三甲生产配置（云托管数据库）

```yaml
# prod-values.yaml
image:
  registry: registry.your-hospital.com
  backend: { tag: "0.3.0" }
  web:     { tag: "0.3.0" }

internal:
  postgres: { enabled: false }
  redis:    { enabled: false }

external:
  postgres:
    host: pg-rds.internal.your-hospital.com
    port: 5432
    database: jlmedaios
    sslMode: verify-full
  redis:
    host: redis.internal.your-hospital.com
    port: 6379

# 密钥由 External Secrets / Vault 注入，Chart 不创建
secret:
  create: false
  name: jlmedaios-secret

ingress:
  host: his.your-hospital.com
  tls:
    secretName: jlmedaios-tls
```

## 关键参数

| 参数 | 说明 | 默认 |
| --- | --- | --- |
| `namespace.create` / `namespace.name` | 是否创建命名空间 / 名称 | `true` / `jlmedaios` |
| `image.registry` | 镜像仓库 | `registry.jianlan.tech` |
| `image.backend.tag` / `image.web.tag` | 镜像标签（空→appVersion） | 空 |
| `internal.postgres.enabled` | 部署内置 PostgreSQL | `true` |
| `internal.redis.enabled` | 部署内置 Redis | `true` |
| `external.postgres.host` | 外部 PG 地址（内置关闭时） | 空 |
| `external.redis.host` | 外部 Redis 地址（内置关闭时） | 空 |
| `secret.create` | 是否由 Chart 创建 Secret | `true` |
| `secret.*Password` / `jwtSecret` / `encryptionMasterKey` | 密钥（**必须替换**） | 占位 |
| `bff.replicas` / `bff.resources` | 副本/资源 | `2` / 见 values |
| `bff.hpa.enabled` / `minReplicas` / `maxReplicas` | HPA | `true` / `2` / `8` |
| `bff.pdb.enabled` / `minAvailable` | PDB | `true` / `1` |
| `web.replicas` / `web.resources` | 副本/资源 | `2` / 见 values |
| `ingress.enabled` / `className` / `host` | Ingress | `true` / `nginx` / 示例域名 |
| `ingress.tls.enabled` / `secretName` | TLS | `true` / `jlmedaios-tls` |
| `networkPolicy.enabled` | 零信任网络策略 | `true` |
| `istio.enabled` | 启用 Istio 服务网格资源 | `false` |
| `istio.gateway` | 引用的 Istio Gateway（提供后渲染 VirtualService） | 空 |
| `istio.mtlsMode` | 命名空间 mTLS 模式 | `STRICT` |
| `istio.canary.enabled` / `stableWeight` / `canaryWeight` | 灰度加权路由 | `false` / `90` / `10` |

完整参数见 [`values.yaml`](values.yaml)。

## 服务网格与灰度发布（Istio）

集群已安装 Istio（或兼容实现，如 ASM）时，可启用服务网格：

```bash
# 仅启用 mTLS + 流量策略（DestinationRule / PeerAuthentication）
helm upgrade jlmedaios . --set istio.enabled=true

# 启用 VirtualService 入口（需先存在 Istio Gateway）
helm upgrade jlmedaios . \
  --set istio.enabled=true \
  --set istio.gateway=default/public-gateway \
  --set ingress.enabled=false

# 灰度发布：stable 与 canary 版本按权重分流（需同时部署 web-canary 版本）
helm upgrade jlmedaios . \
  --set istio.enabled=true --set istio.gateway=default/public-gateway \
  --set istio.canary.enabled=true \
  --set istio.canary.stableWeight=80 --set istio.canary.canaryWeight=20
```

启用后：`PeerAuthentication` 强制命名空间 mTLS；`DestinationRule` 配置连接池与异常检测（故障实例自动摘除）；
`VirtualService` 统一入口并支持灰度权重。

## 安全提示

- `values.yaml` 中的 `change-me-*` 仅为占位，**禁止直接用于生产**；
- 推荐设置 `secret.create=false`，由 External Secrets / Sealed Secrets / Vault 注入；
- 内置 PostgreSQL/Redis 为单副本，仅供中小规模或演示；大三甲请使用云托管多可用区实例。

## 验证边界

本 Chart 的 YAML 已通过静态语法与变量一致性校验；镜像构建、`helm template`
实际渲染与集群部署需在具备 Docker / Helm / Kubernetes 的环境中执行。

---

*健澜科技 · Licensed under Apache-2.0*
