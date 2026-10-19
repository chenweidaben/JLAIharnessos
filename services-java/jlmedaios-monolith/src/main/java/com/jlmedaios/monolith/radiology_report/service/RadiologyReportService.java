/*
 * 健澜科技 jlmedaios - 放射报告 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.radiology_report.service;

import com.jlmedaios.monolith.radiology_report.entity.RadiologyReport;
import com.jlmedaios.monolith.radiology_report.repository.RadiologyReportRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * 放射报告 Service。
 *
 * <p>append-only: 放射报告审核后不可修改</p>
 */
@Service
@RequiredArgsConstructor
public class RadiologyReportService {

    private final RadiologyReportRepository radiologyReportRepository;

    /**
     * 创建放射报告草稿。
     *
     * @param examId        检查 ID
     * @param patientId     患者 ID
     * @param studyType     检查类型
     * @param studyDate     检查日期
     * @param indication    指征
     * @param findings      所见
     * @param impression    印象
     * @param radiologistId 放射科医生工号
     * @return 已持久化的放射报告
     */
    public RadiologyReport create(Long examId, Long patientId, String studyType,
                                   LocalDate studyDate, String indication, String findings,
                                   String impression, String radiologistId) {
        RadiologyReport report = RadiologyReport.builder()
                .examId(examId)
                .patientId(patientId)
                .studyType(studyType)
                .studyDate(studyDate)
                .indication(indication)
                .findings(findings)
                .impression(impression)
                .radiologistId(radiologistId)
                .build();
        return radiologyReportRepository.save(report);
    }

    /**
     * 审核签名（设 status=REVIEWED）。
     *
     * @param id 报告 ID
     * @return 已更新的放射报告
     */
    public Optional<RadiologyReport> sign(Long id) {
        Optional<RadiologyReport> opt = radiologyReportRepository.findById(id);
        if (opt.isPresent()) {
            RadiologyReport report = opt.get();
            report.setStatus("REVIEWED");
            report.setUpdatedAt(LocalDateTime.now());
            radiologyReportRepository.save(report);
        }
        return opt;
    }

    /**
     * 按患者查询放射报告列表。
     *
     * @param patientId 患者 ID
     * @return 放射报告列表
     */
    public List<RadiologyReport> listByPatient(Long patientId) {
        return radiologyReportRepository.findByPatientId(patientId);
    }
}
