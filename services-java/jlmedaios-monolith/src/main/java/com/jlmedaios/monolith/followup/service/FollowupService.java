/*
 * 健澜科技 jlmedaios - 随访 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.followup.service;

import com.jlmedaios.monolith.followup.entity.FollowupTask;
import com.jlmedaios.monolith.followup.repository.FollowupTaskRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/**
 * 随访 Service。
 */
@Service
@RequiredArgsConstructor
public class FollowupService {

    private final FollowupTaskRepository followupTaskRepository;

    /**
     * 自动生成随访计划。
     *
     * @param patientId            患者 ID
     * @param dischargeDate        出院日期
     * @param planDate             计划随访日期
     * @param questionnaireContent  问卷内容
     * @return 已持久化的随访任务
     */
    public FollowupTask plan(Long patientId, LocalDate dischargeDate, LocalDate planDate,
                              String questionnaireContent) {
        FollowupTask task = FollowupTask.builder()
                .patientId(patientId)
                .dischargeDate(dischargeDate)
                .planDate(planDate)
                .questionnaireContent(questionnaireContent)
                .build();
        return followupTaskRepository.save(task);
    }

    /**
     * 完成随访（status → COMPLETED + feedbackText + satisfaction）。
     *
     * @param id            随访任务 ID
     * @param feedbackText  反馈内容
     * @param satisfaction  满意度评分（1-5 分）
     * @return 更新后的随访任务
     */
    public Optional<FollowupTask> complete(Long id, String feedbackText, int satisfaction) {
        Optional<FollowupTask> opt = followupTaskRepository.findById(id);
        opt.ifPresent(task -> {
            task.setStatus("COMPLETED");
            task.setFeedbackText(feedbackText);
            task.setSatisfaction(satisfaction);
            followupTaskRepository.save(task);
        });
        return opt;
    }

    /**
     * 待随访列表（status = PENDING）。
     *
     * @return 待随访任务列表
     */
    public List<FollowupTask> pendingList() {
        return followupTaskRepository.findByStatus("PENDING");
    }
}
