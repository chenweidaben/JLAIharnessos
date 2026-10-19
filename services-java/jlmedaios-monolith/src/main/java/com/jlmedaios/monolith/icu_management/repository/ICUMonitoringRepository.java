/*
 * 健澜科技 jlmedaios - ICU 监测数据 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.icu_management.repository;

import com.jlmedaios.monolith.icu_management.entity.ICUMonitoring;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * ICU 监测数据 Repository。
 */
@Repository
public interface ICUMonitoringRepository extends JpaRepository<ICUMonitoring, Long> {

    /**
     * 按患者 ID 查询监测数据。
     *
     * @param patientId 患者 ID
     * @return 监测数据列表
     */
    List<ICUMonitoring> findByPatientId(String patientId);
}
