/*
 * 健澜科技 jlmedaios - 区块链存证 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.blockchain_evidence.controller;

import com.jlmedaios.monolith.common.Result;
import com.jlmedaios.monolith.blockchain_evidence.entity.BlockchainRecord;
import com.jlmedaios.monolith.blockchain_evidence.service.BlockchainEvidenceService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 区块链存证 Controller。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/blockchain")
public class BlockchainEvidenceController {

    private final BlockchainEvidenceService blockchainEvidenceService;

    /**
     * 数据上链。
     *
     * @param body {businessType, businessId, recordHash}
     * @return Result<BlockchainRecord>
     */
    @PostMapping("/anchor")
    public Result<BlockchainRecord> anchorData(@RequestBody Map<String, Object> body) {
        BlockchainRecord record = blockchainEvidenceService.anchorData(
                String.valueOf(body.get("businessType")),
                String.valueOf(body.get("businessId")),
                String.valueOf(body.get("recordHash"))
        );
        return Result.ok(record);
    }

    /**
     * 验真。
     *
     * @param businessId 业务 ID
     * @return Result<Map<String, Object>>
     */
    @GetMapping("/verify/{businessId}")
    public Result<Map<String, Object>> verifyData(@PathVariable String businessId) {
        return Result.ok(blockchainEvidenceService.verifyData(businessId));
    }

    /**
     * 查询上链记录。
     *
     * @return Result<List<BlockchainRecord>>
     */
    @GetMapping("/records")
    public Result<List<BlockchainRecord>> recordList() {
        return Result.ok(blockchainEvidenceService.recordList());
    }
}
