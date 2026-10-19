/*
 * 健澜科技 jlmedaios - 不良事件上报 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.incident_report.service;

import com.jlmedaios.monolith.incident_report.entity.IncidentReport;
import com.jlmedaios.monolith.incident_report.repository.IncidentReportRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * 不良事件上报 Service。
 *
 * <p>append-only: 不良事件描述不可修改，调查过程留痕</p>
 */
@Service
@RequiredArgsConstructor
public class IncidentReportService {

    private final IncidentReportRepository incidentReportRepository;

    /**
     * 上报不良事件。
     *
     * @param reportNo     上报编号
     * @param reporterId   上报人工号
     * @param eventType    事件类型
     * @param eventLevel   事件等级
     * @param description  事件描述
     * @param eventTime    事件发生时间
     * @return 已持久化的不良事件
     */
    public IncidentReport report(String reportNo, String reporterId, String eventType,
                                  String eventLevel, String description, LocalDateTime eventTime) {
        IncidentReport report = IncidentReport.builder()
                .reportNo(reportNo)
                .reporterId(reporterId)
                .eventType(eventType)
                .eventLevel(eventLevel)
                .description(description)
                .eventTime(eventTime)
                .build();
        return incidentReportRepository.save(report);
    }

    /**
     * 开始调查（设 status=INVESTIGATING）。
     *
     * @param id 不良事件 ID
     * @return 已更新的不良事件
     */
    public Optional<IncidentReport> investigate(Long id) {
        Optional<IncidentReport> opt = incidentReportRepository.findById(id);
        if (opt.isPresent()) {
            IncidentReport report = opt.get();
            report.setStatus("INVESTIGATING");
            incidentReportRepository.save(report);
        }
        return opt;
    }

    /**
     * 结案（设 status=CLOSED + rootCause）。
     *
     * @param id        不良事件 ID
     * @param rootCause 根本原因
     * @return 已更新的不良事件
     */
    public Optional<IncidentReport> close(Long id, String rootCause) {
        Optional<IncidentReport> opt = incidentReportRepository.findById(id);
        if (opt.isPresent()) {
            IncidentReport report = opt.get();
            report.setStatus("CLOSED");
            report.setRootCause(rootCause);
            incidentReportRepository.save(report);
        }
        return opt;
    }

    /**
     * 待处理列表（status=REPORTED）。
     *
     * @return 不良事件列表
     */
    public List<IncidentReport> pendingList() {
        return incidentReportRepository.findByStatus("REPORTED");
    }
}
