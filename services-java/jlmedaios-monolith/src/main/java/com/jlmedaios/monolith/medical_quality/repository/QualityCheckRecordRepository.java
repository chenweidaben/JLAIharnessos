/*
 * 健澜科技 jlmedaios - 质量检查记录 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.medical_quality.repository;

import com.jlmedaios.monolith.medical_quality.entity.QualityCheckRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 质量检查记录 Repository。
 */
@Repository
public interface QualityCheckRecordRepository extends JpaRepository<QualityCheckRecord, Long> {

    /**
     * 按科室查询检查记录。
     *
     * @param department 科室
     * @return 检查记录列表
     */
    List<QualityCheckRecord> findByDepartment(String department);
}
