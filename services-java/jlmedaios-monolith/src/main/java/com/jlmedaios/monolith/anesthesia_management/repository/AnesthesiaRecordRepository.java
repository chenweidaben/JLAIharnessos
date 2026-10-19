/*
 * 健澜科技 jlmedaios - 麻醉记录 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.anesthesia_management.repository;

import com.jlmedaios.monolith.anesthesia_management.entity.AnesthesiaRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 麻醉记录 Repository。
 */
@Repository
public interface AnesthesiaRecordRepository extends JpaRepository<AnesthesiaRecord, Long> {

    /**
     * 按排台编号查询麻醉记录。
     *
     * @param scheduleNo 排台编号
     * @return 麻醉记录列表
     */
    List<AnesthesiaRecord> findByScheduleNo(String scheduleNo);

    /**
     * 按患者 ID 查询麻醉记录。
     *
     * @param patientId 患者 ID
     * @return 麻醉记录列表
     */
    List<AnesthesiaRecord> findByPatientId(String patientId);
}
