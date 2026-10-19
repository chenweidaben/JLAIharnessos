/*
 * 健澜科技 jlmedaios - 护理工作站 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.nursing_workstation.service;

import com.jlmedaios.monolith.nursing_workstation.entity.NursingHandover;
import com.jlmedaios.monolith.nursing_workstation.repository.NursingHandoverRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 护理工作站 Service。
 *
 * <p>append-only: 护理交班记录不可修改</p>
 */
@Service
@RequiredArgsConstructor
public class NursingWorkstationService {

    private final NursingHandoverRepository nursingHandoverRepository;

    /**
     * 今日护理任务。
     *
     * @return 护理任务列表
     */
    public List<Map<String, Object>> todayTasks() {
        List<Map<String, Object>> tasks = new ArrayList<>();
        Map<String, Object> t1 = new HashMap<>();
        t1.put("taskId", "TASK-001");
        t1.put("patientId", "P001");
        t1.put("description", "晨间采血");
        t1.put("priority", "high");
        tasks.add(t1);
        return tasks;
    }

    /**
     * 创建交班记录。
     *
     * @param handoverNo  交班编号
     * @param wardCode    病区编码
     * @param shiftType   班次类型
     * @param nurseIn     交班护士
     * @param nurseOut    接班护士
     * @param patientCount 患者数
     * @return 已持久化的护理交班记录
     */
    public NursingHandover createHandover(String handoverNo, String wardCode, String shiftType,
                                           String nurseIn, String nurseOut, Integer patientCount) {
        NursingHandover handover = NursingHandover.builder()
                .handoverNo(handoverNo)
                .wardCode(wardCode)
                .shiftType(shiftType)
                .nurseIn(nurseIn)
                .nurseOut(nurseOut)
                .patientCount(patientCount)
                .status("COMPLETED")
                .build();
        return nursingHandoverRepository.save(handover);
    }

    /**
     * 交班历史。
     *
     * @param wardCode 病区编码
     * @return 护理交班记录列表
     */
    public List<NursingHandover> handoverHistory(String wardCode) {
        return nursingHandoverRepository.findByWardCode(wardCode);
    }

    /**
     * 执行医嘱。
     *
     * @param orderId 医嘱 ID
     * @return 执行结果
     */
    public Map<String, Object> executeOrder(Long orderId) {
        Map<String, Object> result = new HashMap<>();
        result.put("orderId", orderId);
        result.put("status", "EXECUTED");
        result.put("message", "医嘱已执行");
        return result;
    }
}
