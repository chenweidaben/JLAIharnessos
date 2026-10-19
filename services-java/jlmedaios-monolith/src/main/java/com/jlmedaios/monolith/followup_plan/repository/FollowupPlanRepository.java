/*
 * 健澜科技 jlmedaios - 随访计划 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.followup_plan.repository;

import com.jlmedaios.monolith.followup_plan.entity.FollowupPlan;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

/**
 * 随访计划 Repository。
 */
@Repository
public interface FollowupPlanRepository extends JpaRepository<FollowupPlan, Long> {

    /**
     * 按计划日期+状态查询随访计划。
     *
     * @param date   计划日期
     * @param status 状态
     * @return 随访计划列表
     */
    List<FollowupPlan> findByPlannedDateAndStatus(LocalDate date, String status);

    /**
     * 按患者 ID 查询随访计划。
     *
     * @param patientId 患者 ID
     * @return 随访计划列表
     */
    List<FollowupPlan> findByPatientId(Long patientId);
}
