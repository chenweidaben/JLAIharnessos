#!/usr/bin/env bash
# =============================================================================
# Download DAMO-RADAR production weights into ./models/radar/.
#
# Weights: HF repo `radar-generalist/RADAR` (model), file
# `checkpoint_radar_pretrain.pth` (~5 GB), licensed CC BY-NC-SA 4.0
# (non-commercial). The deployment team downloads this out-of-band; weights
# are NEVER committed to the repository.
#
# Uses the hf-mirror.com endpoint for China-network accessibility.
#
# Copyright (c) 2026 杭州健澜科技有限公司. All rights reserved.
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET_DIR="${1:-${SCRIPT_DIR}/models/radar}"

export HF_ENDPOINT="${HF_ENDPOINT:-https://hf-mirror.com}"
REPO_ID="radar-generalist/RADAR"

mkdir -p "${TARGET_DIR}"

echo "[download_weights] HF_ENDPOINT=${HF_ENDPOINT}"
echo "[download_weights] repo=${REPO_ID} -> ${TARGET_DIR}"

if ! command -v huggingface-cli >/dev/null 2>&1; then
  echo "[download_weights] installing huggingface_hub ..."
  pip install --quiet -U "huggingface_hub[cli]"
fi

huggingface-cli download "${REPO_ID}" \
  --repo-type model \
  --include "checkpoint_radar_pretrain.pth" \
  --local-dir "${TARGET_DIR}"

# Also pull the bert-base-chinese text-config used by the model tokenizer.
huggingface-cli download "bert-base-chinese" \
  --repo-type model \
  --local-dir "${SCRIPT_DIR}/vendor/damo-radar/ckpt/bert-base-chinese"

cat <<EOF
[download_weights] done.
  Weights : ${TARGET_DIR}/checkpoint_radar_pretrain.pth
  License : CC BY-NC-SA 4.0 (NON-COMMERCIAL). Review before production use.
  Restart the service; /health/ready should report mode=production, ready.
EOF
