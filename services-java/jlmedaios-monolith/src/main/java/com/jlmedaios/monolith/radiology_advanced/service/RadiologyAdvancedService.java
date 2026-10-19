/*
 * 健澜科技 jlmedaios - 影像高级 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.radiology_advanced.service;

import com.jlmedaios.monolith.radiology_advanced.entity.RadiologyOrder;
import com.jlmedaios.monolith.radiology_advanced.entity.RadiologyReport;
import com.jlmedaios.monolith.radiology_advanced.repository.RadiologyOrderRepository;
import com.jlmedaios.monolith.radiology_advanced.repository.RadiologyReportRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Optional;

/**
 * 影像高级 Service。
 *
 * <p>append-only: 影像报告不可修改</p>
 */
@Service
@RequiredArgsConstructor
public class RadiologyAdvancedService {

    private final RadiologyOrderRepository radiologyOrderRepository;
    private final RadiologyReportRepository radiologyReportRepository;

    /**
     * 创建影像申请单。
     *
     * @param orderNo      申请单编号
     * @param patientId     患者 ID
     * @param bodyPart     检查部位
     * @param examType     检查类型
     * @param clinicalInfo  临床信息
     * @return 已持久化的申请单
     */
    public RadiologyOrder createOrder(String orderNo, String patientId, String bodyPart,
                                       String examType, String clinicalInfo) {
        RadiologyOrder order = RadiologyOrder.builder()
                .orderNo(orderNo)
                .patientId(patientId)
                .bodyPart(bodyPart)
                .examType(examType)
                .clinicalInfo(clinicalInfo)
                .build();
        return radiologyOrderRepository.save(order);
    }

    /**
     * 完成检查（status=EXAMINED）。
     *
     * @param orderId 申请单 ID
     * @return 已更新的申请单
     */
    public Optional<RadiologyOrder> completeExam(Long orderId) {
        Optional<RadiologyOrder> opt = radiologyOrderRepository.findById(orderId);
        if (opt.isPresent()) {
            RadiologyOrder order = opt.get();
            order.setStatus("EXAMINED");
            radiologyOrderRepository.save(order);
        }
        return opt;
    }

    /**
     * 创建影像报告。
     *
     * @param orderNo      申请单编号
     * @param patientId     患者 ID
     * @param modality      模态
     * @param impression    印象
     * @param findings      所见
     * @param conclusion    结论
     * @param reportDoctor  报告医生
     * @return 已持久化的报告
     */
    public RadiologyReport createReport(String orderNo, String patientId, String modality,
                                         String impression, String findings, String conclusion,
                                         String reportDoctor) {
        RadiologyReport report = RadiologyReport.builder()
                .orderNo(orderNo)
                .patientId(patientId)
                .modality(modality)
                .impression(impression)
                .findings(findings)
                .conclusion(conclusion)
                .reportDoctor(reportDoctor)
                .build();
        return radiologyReportRepository.save(report);
    }

    /**
     * 审核报告（status=REVIEWED）。
     *
     * @param reportId     报告 ID
     * @param reviewDoctor 审核医生
     * @return 已更新的报告
     */
    public Optional<RadiologyReport> reviewReport(Long reportId, String reviewDoctor) {
        Optional<RadiologyReport> opt = radiologyReportRepository.findById(reportId);
        if (opt.isPresent()) {
            RadiologyReport report = opt.get();
            report.setReviewDoctor(reviewDoctor);
            radiologyReportRepository.save(report);
        }
        return opt;
    }
}
