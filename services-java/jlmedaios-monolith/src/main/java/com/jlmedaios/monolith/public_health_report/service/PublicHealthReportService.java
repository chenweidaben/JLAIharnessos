/*
 * 健澜科技 jlmedaios - 公共卫生上报 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.public_health_report.service;

import com.jlmedaios.monolith.public_health_report.entity.PublicHealthReport;
import com.jlmedaios.monolith.public_health_report.repository.PublicHealthReportRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 公共卫生上报 Service。
 *
 * <p>append-only: 公共卫生上报记录不可修改</p>
 *
 * <p>对接国家疾控直报系统，生产接 CDC 接口</p>
 */
@Service
@RequiredArgsConstructor
public class PublicHealthReportService {

    private final PublicHealthReportRepository publicHealthReportRepository;

    /**
     * 创建上报。
     *
     * @param reportNo           上报编号
     * @param reportType          上报类型
     * @param patientId           患者 ID
     * @param diseaseCode         疾病编码
     * @param receivingAuthority  接收机构
     * @return 已持久化的上报
     */
    public PublicHealthReport createReport(String reportNo, String reportType, String patientId,
                                           String diseaseCode, String receivingAuthority) {
        PublicHealthReport report = PublicHealthReport.builder()
                .reportNo(reportNo)
                .reportType(reportType)
                .patientId(patientId)
                .diseaseCode(diseaseCode)
                .receivingAuthority(receivingAuthority)
                .build();
        return publicHealthReportRepository.save(report);
    }

    /**
     * 待处理列表（status=SUBMITTED）。
     *
     * @return 上报列表
     */
    public List<PublicHealthReport> pendingList() {
        return publicHealthReportRepository.findByStatus("SUBMITTED");
    }

    /**
     * 上报统计（mock）。
     *
     * @return 统计数据
     */
    public Map<String, Object> stats() {
        Map<String, Object> stats = new HashMap<>();
        stats.put("total_reports", 50);
        stats.put("by_type", List.of(
                Map.of("type", "传染病上报", "count", 30),
                Map.of("type", "慢性病上报", "count", 15)
        ));
        stats.put("by_status", List.of(
                Map.of("status", "SUBMITTED", "count", 10),
                Map.of("status", "RECEIVED", "count", 35)
        ));
        return stats;
    }
}
