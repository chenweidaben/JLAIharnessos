/*
 * 健澜科技 jlmedaios - 随访计划 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.followup_plan.service;

import com.jlmedaios.monolith.followup_plan.entity.FollowupPlan;
import com.jlmedaios.monolith.followup_plan.repository.FollowupPlanRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * 随访计划 Service。
 *
 * <p>append-only: 随访计划不可修改，执行留痕</p>
 */
@Service
@RequiredArgsConstructor
public class FollowupPlanService {

    private final FollowupPlanRepository followupPlanRepository;

    /**
     * 创建随访计划。
     *
     * @param patientId    患者 ID
     * @param visitId      就诊 ID
     * @param followupType 随访类型
     * @param plannedDate  计划日期
     * @param channel      随访渠道
     * @return 已持久化的随访计划
     */
    public FollowupPlan create(Long patientId, Long visitId, String followupType,
                                LocalDate plannedDate, String channel) {
        FollowupPlan plan = FollowupPlan.builder()
                .patientId(patientId)
                .visitId(visitId)
                .followupType(followupType)
                .plannedDate(plannedDate)
                .channel(channel)
                .build();
        return followupPlanRepository.save(plan);
    }

    /**
     * 执行随访（设 status=COMPLETED + executeNote）。
     *
     * @param id          计划 ID
     * @param executeNote 执行记录
     * @return 已更新的随访计划
     */
    public Optional<FollowupPlan> execute(Long id, String executeNote) {
        Optional<FollowupPlan> opt = followupPlanRepository.findById(id);
        if (opt.isPresent()) {
            FollowupPlan plan = opt.get();
            plan.setStatus("COMPLETED");
            plan.setExecuteNote(executeNote);
            plan.setUpdatedAt(LocalDateTime.now());
            followupPlanRepository.save(plan);
        }
        return opt;
    }

    /**
     * 今日待执行（plannedDate=今天 + status=PENDING）。
     *
     * @return 随访计划列表
     */
    public List<FollowupPlan> dueToday() {
        return followupPlanRepository.findByPlannedDateAndStatus(LocalDate.now(), "PENDING");
    }
}
