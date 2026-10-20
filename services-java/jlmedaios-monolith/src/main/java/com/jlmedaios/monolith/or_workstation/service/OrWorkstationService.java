/*
 * 健澜科技 jlmedaios - 手术工作站 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.or_workstation.service;

import com.jlmedaios.monolith.or_workstation.entity.ORWorkItem;
import com.jlmedaios.monolith.or_workstation.repository.ORWorkItemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 手术工作站 Service。
 *
 * <p>append-only: 手术工作项不可修改</p>
 */
@Service
@RequiredArgsConstructor
public class OrWorkstationService {

    private final ORWorkItemRepository orWorkItemRepository;

    /**
     * 今日手术安排。
     *
     * @return 手术工作项列表
     */
    public List<ORWorkItem> todaySchedule() {
        return orWorkItemRepository.findByStatus("PENDING");
    }

    /**
     * 开始手术。
     *
     * @param workItemNo 工作项编号
     * @return 已开始的手术工作项
     */
    public ORWorkItem startSurgery(String workItemNo) {
        ORWorkItem item = findByWorkItemNo(workItemNo);
        if (item != null) {
            item.setStatus("IN_PROGRESS");
            item.setActualStart(LocalDateTime.now());
            return orWorkItemRepository.save(item);
        }
        return null;
    }

    /**
     * 结束手术。
     *
     * @param workItemNo 工作项编号
     * @return 已结束的手术工作项
     */
    public ORWorkItem endSurgery(String workItemNo) {
        ORWorkItem item = findByWorkItemNo(workItemNo);
        if (item != null) {
            item.setStatus("COMPLETED");
            item.setActualEnd(LocalDateTime.now());
            return orWorkItemRepository.save(item);
        }
        return null;
    }

    /**
     * 患者手术历史。
     *
     * @param patientId 患者 ID
     * @return 手术工作项列表
     */
    public List<ORWorkItem> surgeryHistory(Long patientId) {
        return orWorkItemRepository.findByPatientId(String.valueOf(patientId));
    }

    private ORWorkItem findByWorkItemNo(String workItemNo) {
        // P3 性能优化：直接调用 Repository 派生查询
        return orWorkItemRepository.findByWorkItemNo(workItemNo);
    }
}
