# ============================================================================
# 健澜科技杠OS — 边缘网关镜像（定制 Nginx，非 root 运行）
# ----------------------------------------------------------------------------
# 基础镜像选用官方维护的 nginxinc/nginx-unprivileged（1.28 稳定分支，alpine）：
#   - 默认即以非 root 用户 nginx(uid=101) 运行，监听 8080/8443 非特权端口；
#   - pid 与临时目录默认指向 /tmp，与我们的网关配置天然匹配；
#   - 与官方 nginx:1.28 同源，仅做了非特权化改造，CVE 跟进及时。
#
# 构建上下文为 deploy/nginx/（注意上下文路径）：
#   docker build -f deploy/nginx/Dockerfile \
#     -t registry.jianlan.tech/jianlan/nginx-edge:0.1.0 deploy/nginx
#
# 运行（生产证书以只读挂载注入，镜像内不含任何私钥）：
#   docker run --rm -p 80:8080 -p 443:8443 \
#     -v /etc/jianlan/certs:/etc/nginx/certs:ro \
#     registry.jianlan.tech/jianlan/nginx-edge:0.1.0
# 未挂载证书时（仅开发自测），入口脚本会自动生成临时自签名证书使网关可启动。
# ============================================================================

# 固定具体版本与 alpine 基线，严禁 latest / 1 等浮动 tag，保证可复现与可审计。
FROM nginxinc/nginx-unprivileged:1.28.0-alpine3.21

LABEL org.opencontainers.image.title="jianlan-gangos-nginx-edge" \
      org.opencontainers.image.description="健澜科技杠OS 边缘网关（Nginx 非 root 运行）" \
      org.opencontainers.image.vendor="健澜科技" \
      org.opencontainers.image.version="0.1.0" \
      org.opencontainers.image.source="https://git.jianlan.tech/medical/jianlan-medical-agent"

ENV TZ=Asia/Shanghai

# 文件装配需要 root（基础镜像默认 USER 101，临时切回）：
#   - 安装 openssl：供入口脚本在开发环境生成临时自签名证书（生产不使用该路径）；
#   - 用完整主配置覆盖默认 /etc/nginx/nginx.conf，复制 http/server 片段；
#   - 删除默认示例站点，避免与业务 server 段冲突；
#   - 预置 ACME 挑战目录与证书挂载点并归属 101，保证非 root 可写/可读。
USER root
RUN apk add --no-cache openssl
COPY nginx.conf /etc/nginx/nginx.conf
COPY conf.d/    /etc/nginx/conf.d/
COPY snippets/  /etc/nginx/snippets/
COPY edge-entrypoint.sh /edge-entrypoint.sh
RUN chmod 755 /edge-entrypoint.sh \
 && rm -f /etc/nginx/conf.d/default.conf \
 && mkdir -p /var/www/certbot /etc/nginx/certs \
 && chown -R 101:101 /var/www/certbot /etc/nginx/certs /var/cache/nginx /var/log/nginx /edge-entrypoint.sh \
 && chmod -R g+rwX /var/cache/nginx

# 切回非 root 用户运行，后续容器进程均为 uid=101。
USER 101

# 文档化端口：8080=明文(跳转+ACME+探针)，8443=TLS 业务入口。
EXPOSE 8080 8443

# 健康检查探测明文端口的 /healthz（该端点直接返回 200，不走 301 跳转）。
# busybox wget 为 alpine 自带，无需额外安装；连续 3 次失败标记 unhealthy。
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD ["wget", "-q", "-O", "/dev/null", "http://127.0.0.1:8080/healthz"]

# 入口脚本负责「无证书时生成临时自签名证书」，随后 exec CMD。
ENTRYPOINT ["/edge-entrypoint.sh"]

# 前台运行，nginx master 为 PID 1，正确接收 SIGTERM 优雅退出。
CMD ["nginx", "-g", "daemon off;"]
