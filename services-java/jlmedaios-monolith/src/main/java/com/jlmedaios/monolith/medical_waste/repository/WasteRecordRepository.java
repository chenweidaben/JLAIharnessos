/*
 * 健澜科技 jlmedaios - 医疗废物记录 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.medical_waste.repository;

import com.jlmedaios.monolith.medical_waste.entity.WasteRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 医疗废物记录 Repository。
 */
@Repository
public interface WasteRecordRepository extends JpaRepository<WasteRecord, Long> {

    /**
     * 按状态查询废物记录。
     *
     * @param status 状态
     * @return 废物记录列表
     */
    List<WasteRecord> findByStatus(String status);

    /**
     * 按废物类型查询废物记录。
     *
     * @param wasteType 废物类型
     * @return 废物记录列表
     */
    List<WasteRecord> findByWasteType(String wasteType);
}
