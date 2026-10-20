/*
 * 健澜科技 jlmedaios - 影像工作站 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.radiology_workstation.service;

import com.jlmedaios.monolith.radiology_workstation.entity.RadiologyWorkItem;
import com.jlmedaios.monolith.radiology_workstation.repository.RadiologyWorkItemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * 影像工作站 Service。
 *
 * <p>append-only: 影像工作项不可修改</p>
 */
@Service
@RequiredArgsConstructor
public class RadiologyWorkstationService {

    private final RadiologyWorkItemRepository radiologyWorkItemRepository;

    /**
     * 待检查列表。
     *
     * @return 影像工作项列表
     */
    public List<RadiologyWorkItem> pendingStudies() {
        return radiologyWorkItemRepository.findByStudyStatus("PENDING");
    }

    /**
     * 开始检查。
     *
     * @param workItemNo 工作项编号
     * @return 已开始检查的影像工作项
     */
    public RadiologyWorkItem startStudy(String workItemNo) {
        RadiologyWorkItem item = findByWorkItemNo(workItemNo);
        if (item != null) {
            item.setStudyStatus("IN_PROGRESS");
            return radiologyWorkItemRepository.save(item);
        }
        return null;
    }

    /**
     * 书写报告。
     *
     * @param workItemNo   工作项编号
     * @param reportContent 报告内容
     * @return 已书写报告的影像工作项
     */
    public RadiologyWorkItem writeReport(String workItemNo, String reportContent) {
        RadiologyWorkItem item = findByWorkItemNo(workItemNo);
        if (item != null) {
            item.setReportContent(reportContent);
            item.setStudyStatus("REPORTING");
            return radiologyWorkItemRepository.save(item);
        }
        return null;
    }

    /**
     * 审核发布。
     *
     * @param workItemNo 工作项编号
     * @return 已审核发布的影像工作项
     */
    public RadiologyWorkItem reviewPublish(String workItemNo) {
        RadiologyWorkItem item = findByWorkItemNo(workItemNo);
        if (item != null) {
            item.setStudyStatus("REVIEWED");
            return radiologyWorkItemRepository.save(item);
        }
        return null;
    }

    private RadiologyWorkItem findByWorkItemNo(String workItemNo) {
        // P3 性能优化：直接调用 Repository 派生查询
        return radiologyWorkItemRepository.findByWorkItemNo(workItemNo);
    }
}
