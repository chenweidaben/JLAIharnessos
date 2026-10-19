/*
 * 健澜科技 jlmedaios - 检查对接 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.his.exam.service;

import com.jlmedaios.his.exam.entity.ExamRequest;
import com.jlmedaios.his.exam.repository.ExamRequestRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * 检查对接 Service。
 * TODO: 对接 RIS/PACS HL7 v2.x / DICOM 接口。
 */
@Service
@RequiredArgsConstructor
public class ExamService {

    private final ExamRequestRepository examRequestRepository;

    /**
     * 申请检查。
     *
     * @param patientId 患者 ID
     * @param examType  检查类型（CT/MRI/Xray）
     * @return 已持久化的检查申请
     */
    public ExamRequest request(Long patientId, String examType) {
        ExamRequest req = ExamRequest.builder()
                .patientId(patientId)
                .examType(examType)
                .build();
        return examRequestRepository.save(req);
    }

    /**
     * 查询检查结果。
     *
     * @param id 检查申请 ID
     * @return 检查申请 Optional
     */
    public Optional<ExamRequest> getResult(Long id) {
        return examRequestRepository.findById(id);
    }

    /**
     * 排程：列出所有 REQUESTED 状态的检查，mock 一个 scheduleTime。
     *
     * @return 待排程的检查申请列表
     */
    public List<ExamRequest> schedule() {
        List<ExamRequest> pending = examRequestRepository.findByStatus("REQUESTED");
        pending.forEach(req -> {
            req.setStatus("SCHEDULED");
            req.setScheduleTime(LocalDateTime.now().plusDays(1));
            examRequestRepository.save(req);
        });
        return pending;
    }
}
