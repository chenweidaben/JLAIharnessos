/*
 * 健澜科技 jlmedaios - 手术记录 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.surgery_advanced.repository;

import com.jlmedaios.monolith.surgery_advanced.entity.SurgeryRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * 手术记录 Repository。
 */
@Repository
public interface SurgeryRecordRepository extends JpaRepository<SurgeryRecord, Long> {

    /**
     * 按排台编号查询手术记录。
     *
     * @param scheduleNo 排台编号
     * @return 手术记录
     */
    Optional<SurgeryRecord> findByScheduleNo(String scheduleNo);
}
