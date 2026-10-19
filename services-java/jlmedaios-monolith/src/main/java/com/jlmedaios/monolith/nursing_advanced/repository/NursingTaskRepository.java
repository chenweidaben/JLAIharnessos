/*
 * 健澜科技 jlmedaios - 护理任务 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.nursing_advanced.repository;

import com.jlmedaios.monolith.nursing_advanced.entity.NursingTask;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 护理任务 Repository。
 */
@Repository
public interface NursingTaskRepository extends JpaRepository<NursingTask, Long> {

    /**
     * 按状态查询护理任务。
     *
     * @param status 状态
     * @return 护理任务列表
     */
    List<NursingTask> findByStatus(String status);

    /**
     * 按患者 ID 查询护理任务。
     *
     * @param patientId 患者 ID
     * @return 护理任务列表
     */
    List<NursingTask> findByPatientId(String patientId);
}
