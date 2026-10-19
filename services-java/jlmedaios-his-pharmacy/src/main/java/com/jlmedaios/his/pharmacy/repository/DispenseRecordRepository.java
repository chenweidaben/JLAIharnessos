/*
 * 健澜科技 jlmedaios - 发药记录 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.his.pharmacy.repository;

import com.jlmedaios.his.pharmacy.entity.DispenseRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 发药记录 Repository。
 */
@Repository
public interface DispenseRecordRepository extends JpaRepository<DispenseRecord, Long> {

    /**
     * 按医嘱 ID 查询发药记录列表。
     *
     * @param orderId 医嘱 ID
     * @return 发药记录列表
     */
    List<DispenseRecord> findByOrderId(Long orderId);
}
