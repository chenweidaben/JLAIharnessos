/*
 * 健澜科技 jlmedaios - 相互作用检查日志 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.drug_interaction.repository;

import com.jlmedaios.monolith.drug_interaction.entity.InteractionCheckLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 相互作用检查日志 Repository。
 */
@Repository
public interface InteractionCheckLogRepository extends JpaRepository<InteractionCheckLog, Long> {

    /**
     * 按患者 ID 查询检查日志。
     *
     * @param patientId 患者 ID
     * @return 检查日志列表
     */
    List<InteractionCheckLog> findByPatientId(Long patientId);
}
