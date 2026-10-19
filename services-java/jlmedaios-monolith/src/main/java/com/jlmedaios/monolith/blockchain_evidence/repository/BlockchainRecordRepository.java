/*
 * 健澜科技 jlmedaios - 区块链存证记录 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.blockchain_evidence.repository;

import com.jlmedaios.monolith.blockchain_evidence.entity.BlockchainRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 区块链存证记录 Repository。
 */
@Repository
public interface BlockchainRecordRepository extends JpaRepository<BlockchainRecord, Long> {

    /**
     * 按业务 ID 查询区块链存证记录。
     *
     * @param businessId 业务 ID
     * @return 区块链存证记录列表
     */
    List<BlockchainRecord> findByBusinessId(String businessId);

    /**
     * 按业务类型查询区块链存证记录。
     *
     * @param businessType 业务类型
     * @return 区块链存证记录列表
     */
    List<BlockchainRecord> findByBusinessType(String businessType);
}
