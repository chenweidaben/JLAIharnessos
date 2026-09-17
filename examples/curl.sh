#!/usr/bin/env bash
# 健澜科技数智医院智能体 - cURL 调用示例
# Copyright (c) 2026 杭州健澜科技有限公司
BASE=http://localhost:8080/api/v1

# 登录
TOKEN=$(curl -s $BASE/auth/login -H 'Content-Type: application/json' \
  -d '{"username":"chenwei","password":"******"}' | python -c 'import sys,json;print(json.load(sys.stdin)["data"]["accessToken"])')

# 当前用户
curl -s $BASE/auth/userinfo -H "Authorization: Bearer $TOKEN"

# 患者列表
curl -s "$BASE/patients?page=1&pageSize=10" -H "Authorization: Bearer $TOKEN"

# 患者360
curl -s $BASE/patients/P100001/360 -H "Authorization: Bearer $TOKEN"

# 调用医疗工具（统一入口）
curl -s $BASE/medical/query_patient -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"keyword":"张"}'

# 健康检查
curl -s http://localhost:8080/health
