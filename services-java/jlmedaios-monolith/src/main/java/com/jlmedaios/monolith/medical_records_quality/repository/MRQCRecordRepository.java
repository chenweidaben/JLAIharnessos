/*
 * 健澜科技 jlmedaios - 病历质控记录 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.medical_records_quality.repository;

import com.jlmedaios.monolith.medical_records_quality.entity.MRQCRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 病历质控记录 Repository。
 */
@Repository
public interface MRQCRecordRepository extends JpaRepository<MRQCRecord, Long> {

    /**
     * 按状态查询质控记录。
     *
     * @param status 状态
     * @return 质控记录列表
     */
    List<MRQCRecord> findByStatus(String status);

    /**
     * 按科室编码查询质控记录。
     *
     * @param deptCode 科室编码
     * @return 质控记录列表
     */
    List<MRQCRecord> findByDeptCode(String deptCode);
}
