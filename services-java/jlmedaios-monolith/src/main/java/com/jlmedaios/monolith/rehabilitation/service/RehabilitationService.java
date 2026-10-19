/*
 * 健澜科技 jlmedaios - 康复医学 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.rehabilitation.service;

import com.jlmedaios.monolith.rehabilitation.entity.RehabOrder;
import com.jlmedaios.monolith.rehabilitation.entity.RehabProgress;
import com.jlmedaios.monolith.rehabilitation.repository.RehabOrderRepository;
import com.jlmedaios.monolith.rehabilitation.repository.RehabProgressRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;

/**
 * 康复医学 Service。
 *
 * <p>append-only: 康复进度记录不可修改</p>
 */
@Service
@RequiredArgsConstructor
public class RehabilitationService {

    private final RehabOrderRepository rehabOrderRepository;
    private final RehabProgressRepository rehabProgressRepository;

    /**
     * 创建康复处方。
     *
     * @param orderNo     处方编号
     * @param patientId    患者 ID
     * @param rehabType    康复类型
     * @param diagnosis    诊断
     * @param startDate    开始日期
     * @param endDate      结束日期
     * @return 已持久化的康复处方
     */
    public RehabOrder createOrder(String orderNo, String patientId, String rehabType,
                                   String diagnosis, LocalDate startDate, LocalDate endDate) {
        RehabOrder order = RehabOrder.builder()
                .orderNo(orderNo)
                .patientId(patientId)
                .rehabType(rehabType)
                .diagnosis(diagnosis)
                .startDate(startDate)
                .endDate(endDate)
                .build();
        return rehabOrderRepository.save(order);
    }

    /**
     * 记录康复进度。
     *
     * @param orderNo        处方编号
     * @param therapist      治疗师
     * @param progressNotes   进度记录
     * @param goalAchievement 目标达成情况
     * @return 已持久化的康复进度
     */
    public RehabProgress recordProgress(String orderNo, String therapist, String progressNotes,
                                        String goalAchievement) {
        RehabProgress progress = RehabProgress.builder()
                .orderNo(orderNo)
                .therapist(therapist)
                .progressNotes(progressNotes)
                .goalAchievement(goalAchievement)
                .build();
        return rehabProgressRepository.save(progress);
    }

    /**
     * 进行中康复列表。
     *
     * @return 康复处方列表
     */
    public List<RehabOrder> activeOrders() {
        return rehabOrderRepository.findByStatus("IN_PROGRESS");
    }
}
