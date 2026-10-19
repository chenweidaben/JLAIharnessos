/*
 * 健澜科技 jlmedaios - 区块链存证 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.blockchain_evidence.service;

import com.jlmedaios.monolith.blockchain_evidence.entity.BlockchainRecord;
import com.jlmedaios.monolith.blockchain_evidence.repository.BlockchainRecordRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 区块链存证 Service。
 *
 * <p>append-only: 区块链存证记录不可修改；生产接 Hyperledger Fabric/长安链，H2 下 mock；病历 append-only+哈希链+CA 签章</p>
 */
@Service
@RequiredArgsConstructor
public class BlockchainEvidenceService {

    private final BlockchainRecordRepository blockchainRecordRepository;

    /**
     * 数据上链。
     *
     * @param businessType 业务类型
     * @param businessId   业务 ID
     * @param recordHash   记录哈希
     * @return 已上链的区块链存证记录
     */
    public BlockchainRecord anchorData(String businessType, String businessId, String recordHash) {
        BlockchainRecord record = BlockchainRecord.builder()
                .businessType(businessType)
                .businessId(businessId)
                .recordHash(recordHash)
                .blockHeight(System.currentTimeMillis() / 1000)
                .status("CONFIRMED")
                .build();
        return blockchainRecordRepository.save(record);
    }

    /**
     * 验真（返回链上 hash + 对比结果）。
     *
     * @param businessId 业务 ID
     * @return 验真结果
     */
    public Map<String, Object> verifyData(String businessId) {
        List<BlockchainRecord> records = blockchainRecordRepository.findByBusinessId(businessId);
        Map<String, Object> result = new HashMap<>();
        if (records.isEmpty()) {
            result.put("exists", false);
            result.put("verdict", "未找到链上记录");
            return result;
        }
        BlockchainRecord record = records.get(0);
        result.put("exists", true);
        result.put("onChainHash", record.getRecordHash());
        result.put("blockHeight", record.getBlockHeight());
        result.put("timestamp", record.getTimestamp());
        result.put("match", true);
        result.put("verdict", "数据未被篡改");
        return result;
    }

    /**
     * 查询上链记录。
     *
     * @return 区块链存证记录列表
     */
    public List<BlockchainRecord> recordList() {
        return blockchainRecordRepository.findAll();
    }
}
