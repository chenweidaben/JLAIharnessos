#!/bin/sh
# ============================================================================
# 健澜科技杠OS — 边缘网关容器入口脚本
# ----------------------------------------------------------------------------
# 职责：
#   1. 若 /etc/nginx/certs 下不存在 tls.crt/tls.key（典型的本地/开发环境），
#      则即时生成一份「临时自签名证书」，让网关可以直接启动，便于开发联调；
#   2. 若证书已存在（生产环境通过 docker-compose.prod.yml 以只读绑定挂载注入
#      正式证书），则原样使用，不做任何改写；
#   3. 最后以 exec 替换为 nginx 前台进程，使其成为 PID 1、正确接收信号。
#
# 红线：自签名证书仅供开发自测，浏览器会告警且无真实身份担保；
#       生产环境必须挂载由可信 CA 签发的证书（见 .env.compose.example 中
#       TLS_CERT_DIR 说明与 docker-compose.prod.yml 的只读挂载）。
# ============================================================================
set -eu

CERT_DIR="/etc/nginx/certs"
CRT_FILE="${CERT_DIR}/tls.crt"
KEY_FILE="${CERT_DIR}/tls.key"

if [ ! -s "${CRT_FILE}" ] || [ ! -s "${KEY_FILE}" ]; then
    echo "[edge-entrypoint] 未检测到 TLS 证书，生成 365 天临时自签名证书（仅限开发自测，严禁用于生产）" >&2
    # -x509 直接输出证书；RSA2048；-nodes 不加密私钥；SAN 覆盖本机回环与容器名。
    openssl req -x509 -newkey rsa:2048 -nodes \
        -keyout "${KEY_FILE}" \
        -out "${CRT_FILE}" \
        -days 365 \
        -subj "/C=CN/O=Jianlan Tech (DEV ONLY)/CN=localhost" \
        -addext "subjectAltName=DNS:localhost,DNS:nginx,IP:127.0.0.1"
    # 私钥收紧为仅属主可读写（容器内为 uid=101）。
    chmod 600 "${KEY_FILE}" || true
    chmod 644 "${CRT_FILE}" || true
else
    echo "[edge-entrypoint] 检测到已挂载 TLS 证书，直接使用：${CRT_FILE}"
fi

# exec 替换为容器主进程；"$@" 即镜像 CMD（nginx -g 'daemon off;'）。
exec "$@"
