# 健澜科技杠OS — Kubernetes 部署指南

本目录提供 jlmedaios 在 Kubernetes 上的生产级一体化部署清单。

## 组件拓扑

```
ingress-nginx ──▶ web (Nginx 静态托管)
                    └─▶ app (BFF, Bun, 多副本 + HPA)
                          ├─ postgres (StatefulSet, 自动迁移)
                          └─ redis    (StatefulSet, AOF)
```

## 文件说明

| 文件 | 内容 |
|---|---|
| `00-namespace.yaml` | 命名空间 `jlmedaios` |
| `01-configmap.yaml` | 非敏感运行配置 |
| `02-secret.yaml` | 口令 / JWT / 加密密钥（**占位值，必须替换**） |
| `10-postgres.yaml` | PostgreSQL StatefulSet + Service + PVC |
| `11-redis.yaml` | Redis StatefulSet + Service + PVC |
| `20-bff.yaml` | BFF Deployment + Service + HPA + PDB + ServiceAccount |
| `21-web.yaml` | Web Deployment + Service + HPA + PDB |
| `30-ingress.yaml` | Ingress + TLS |
| `40-networkpolicy.yaml` | 零信任网络隔离 |

## 前置条件

- Kubernetes ≥ 1.27
- 已安装 ingress-nginx 控制器
- CNI 支持 NetworkPolicy（Calico / Cilium 等）
- 默认 StorageClass 支持动态供给（PVC）

## 部署步骤

```bash
# 1. 构建并推送镜像（将镜像名替换为你的私有仓库）
docker build -f Dockerfile.backend -t <registry>/backend:0.1.0 .
docker build -f web/Dockerfile.frontend -t <registry>/web:0.1.0 web
docker push <registry>/backend:0.1.0 <registry>/web:0.1.0

# 2. 创建密钥（不要使用清单中的占位值）
kubectl -n jlmedaios create secret generic jlmedaios-secret \
  --from-literal=POSTGRES_PASSWORD='<strong-pw>' \
  --from-literal=REDIS_PASSWORD='<strong-pw>' \
  --from-literal=JWT_SECRET='<32+ chars random>' \
  --from-literal=ENCRYPTION_MASTER_KEY='<32+ chars random>'

# 3. 创建 TLS 证书（或由 cert-manager 自动签发）
kubectl -n jlmedaios create secret tls jlmedaios-tls \
  --cert=tls.crt --key=tls.key

# 4. 应用清单（按顺序）
kubectl apply -f deploy/k8s/

# 5. 等待就绪
kubectl -n jlmedaios get pods
```

## 验证

```bash
kubectl -n jlmedaios get all
kubectl -n jlmedaios logs -l app.kubernetes.io/name=bff --tail=50
# 应看到 [db:migrate] 已应用若干迁移，随后 listening on 8080
```

## 使用云托管数据库

删除 `10-postgres.yaml`、`11-redis.yaml`，将 `01-configmap.yaml` 中的
`DATABASE_HOST` / `REDIS_HOST` 改为云 RDS 内网地址，并确保 Security Group
放行集群 Pod CIDR。

## 生产加固建议

- 密钥通过 External Secrets / Sealed Secrets / Vault 管理，Git 中不存明文
- 数据库高可用采用云 RDS 多可用区或 CloudNativePG / Patroni
- 启用审计日志（容器运行时 + 云审计）
- 配置 ResourceQuota 与 LimitRange
- 定期备份并做恢复演练（参考 `deploy/postgres/backup.sh`）
- 大三甲场景建议 BFF 按业务域进一步拆分为独立微服务

## 卸载

```bash
kubectl delete namespace jlmedaios
# 注意：PVC 随命名空间删除，数据将丢失；如需保留请先备份
```

版权所有 © 2026 健澜科技。基于 Apache-2.0 许可。
