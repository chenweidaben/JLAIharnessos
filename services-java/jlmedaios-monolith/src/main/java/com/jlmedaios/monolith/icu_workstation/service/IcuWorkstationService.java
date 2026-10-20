/*
 * 健澜科技 jlmedaios - ICU 工作站 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.icu_workstation.service;

import com.jlmedaios.monolith.icu_workstation.entity.ICURecord;
import com.jlmedaios.monolith.icu_workstation.entity.ICUWorkItem;
import com.jlmedaios.monolith.icu_workstation.repository.ICURecordRepository;
import com.jlmedaios.monolith.icu_workstation.repository.ICUWorkItemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * ICU 工作站 Service。
 *
 * <p>append-only: ICU 监护记录不可修改</p>
 */
@Service
@RequiredArgsConstructor
public class IcuWorkstationService {

    private final ICURecordRepository icuRecordRepository;
    private final ICUWorkItemRepository icuWorkItemRepository;

    /**
     * 今日 ICU 患者列表。
     *
     * @return ICU 监护记录列表
     */
    public List<ICURecord> todayPatients() {
        return icuRecordRepository.findAll();
    }

    /**
     * 记录 ICU 监护数据。
     *
     * @param recordNo           记录编号
     * @param patientId          患者 ID
     * @param bedNumber          床号
     * @param vitalsJSON         生命体征 JSON
     * @param vasopressor        血管活性药
     * @param ventilatorSettings 呼吸机参数
     * @return 已持久化的 ICU 监护记录
     */
    public ICURecord recordMonitoring(String recordNo, String patientId, String bedNumber,
                                       String vitalsJSON, String vasopressor, String ventilatorSettings) {
        ICURecord record = ICURecord.builder()
                .recordNo(recordNo)
                .patientId(patientId)
                .bedNumber(bedNumber)
                .vitalsJSON(vitalsJSON)
                .vasopressor(vasopressor)
                .ventilatorSettings(ventilatorSettings)
                .build();
        return icuRecordRepository.save(record);
    }

    /**
     * 患者生命体征趋势。
     *
     * @param patientId 患者 ID
     * @return ICU 监护记录列表
     */
    public List<ICURecord> vitalTrend(Long patientId) {
        return icuRecordRepository.findByPatientId(String.valueOf(patientId));
    }

    /**
     * 记录审核。
     *
     * @param recordNo 记录编号
     * @return 已审核的 ICU 监护记录
     */
    public ICURecord reviewRecord(String recordNo) {
        ICURecord record = findByRecordNo(recordNo);
        if (record != null) {
            return icuRecordRepository.save(record);
        }
        return null;
    }

    private ICURecord findByRecordNo(String recordNo) {
        // P1 性能优化：直接调用 Repository 派生查询，替代 findAll().stream().filter()
        return icuRecordRepository.findByRecordNo(recordNo);
    }

    // ==================== ICU 床位+评分管理（深化） ====================

    /**
     * ICU 床位状态 {total, occupied, available}。
     *
     * @return 床位状态 Map
     */
    public Map<String, Object> bedStatus() {
        long occupied = icuWorkItemRepository.findByStatus("IN_ICU").size();
        long total = 20; // mock 总床位数
        Map<String, Object> result = new HashMap<>();
        result.put("total", total);
        result.put("occupied", occupied);
        result.put("available", total - occupied);
        return result;
    }

    /**
     * 更新评分。
     *
     * @param workItemNo 工作项编号
     * @param sofaScore  SOFA 评分
     * @param gcsScore   GCS 评分
     * @return 已更新评分的 ICU 床位工作项
     */
    public ICUWorkItem updateScore(String workItemNo, BigDecimal sofaScore, Integer gcsScore) {
        ICUWorkItem item = findByWorkItemNo(workItemNo);
        if (item != null) {
            item.setSofaScore(sofaScore);
            item.setGcsScore(gcsScore);
            return icuWorkItemRepository.save(item);
        }
        return null;
    }

    /**
     * 生命体征趋势（关联 ICURecord）。
     *
     * @param workItemNo 工作项编号
     * @return ICU 监护记录列表
     */
    public List<ICURecord> vitalTrendByWorkItem(String workItemNo) {
        ICUWorkItem item = findByWorkItemNo(workItemNo);
        if (item != null) {
            return icuRecordRepository.findByPatientId(item.getPatientId());
        }
        return List.of();
    }

    /**
     * 转出 ICU。
     *
     * @param workItemNo 工作项编号
     * @return 已转出的 ICU 床位工作项
     */
    public ICUWorkItem dischargeICU(String workItemNo) {
        ICUWorkItem item = findByWorkItemNo(workItemNo);
        if (item != null) {
            item.setStatus("OUT_ICU");
            item.setDischargeTime(LocalDateTime.now());
            return icuWorkItemRepository.save(item);
        }
        return null;
    }

    private ICUWorkItem findByWorkItemNo(String workItemNo) {
        // P1 性能优化：直接调用 Repository 派生查询，替代 findAll().stream().filter()
        return icuWorkItemRepository.findByWorkItemNo(workItemNo);
    }
}
