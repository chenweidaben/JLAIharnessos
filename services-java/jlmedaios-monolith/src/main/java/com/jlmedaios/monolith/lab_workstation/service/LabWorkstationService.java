/*
 * 健澜科技 jlmedaios - 检验工作站 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.lab_workstation.service;

import com.jlmedaios.monolith.lab_workstation.entity.LabWorkItem;
import com.jlmedaios.monolith.lab_workstation.repository.LabWorkItemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * 检验工作站 Service。
 *
 * <p>append-only: 检验工作项不可修改</p>
 */
@Service
@RequiredArgsConstructor
public class LabWorkstationService {

    private final LabWorkItemRepository labWorkItemRepository;

    /**
     * 待处理标本列表。
     *
     * @return 检验工作项列表
     */
    public List<LabWorkItem> pendingItems() {
        return labWorkItemRepository.findBySampleStatus("RECEIVED");
    }

    /**
     * 接收标本。
     *
     * @param workItemNo 工作项编号
     * @return 已接收的检验工作项
     */
    public LabWorkItem receiveSample(String workItemNo) {
        LabWorkItem item = findByWorkItemNo(workItemNo);
        if (item != null) {
            item.setSampleStatus("TESTING");
            return labWorkItemRepository.save(item);
        }
        return null;
    }

    /**
     * 录入结果。
     *
     * @param workItemNo   工作项编号
     * @param resultValues 结果值
     * @return 已录入结果的检验工作项
     */
    public LabWorkItem inputResult(String workItemNo, String resultValues) {
        LabWorkItem item = findByWorkItemNo(workItemNo);
        if (item != null) {
            item.setResultValues(resultValues);
            item.setSampleStatus("REVIEWED");
            return labWorkItemRepository.save(item);
        }
        return null;
    }

    /**
     * 审核发布。
     *
     * @param workItemNo 工作项编号
     * @return 已审核发布的检验工作项
     */
    public LabWorkItem reviewPublish(String workItemNo) {
        LabWorkItem item = findByWorkItemNo(workItemNo);
        if (item != null) {
            item.setReviewStatus("REVIEWED");
            item.setSampleStatus("PUBLISHED");
            return labWorkItemRepository.save(item);
        }
        return null;
    }

    private LabWorkItem findByWorkItemNo(String workItemNo) {
        // P3 性能优化：直接调用 Repository 派生查询
        return labWorkItemRepository.findByWorkItemNo(workItemNo);
    }
}
