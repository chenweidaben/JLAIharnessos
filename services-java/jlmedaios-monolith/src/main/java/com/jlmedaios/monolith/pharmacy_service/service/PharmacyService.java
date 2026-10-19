/*
 * 健澜科技 jlmedaios - 药学服务 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.pharmacy_service.service;

import com.jlmedaios.monolith.pharmacy_service.entity.PharmacyConsult;
import com.jlmedaios.monolith.pharmacy_service.repository.PharmacyConsultRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

/**
 * 药学服务 Service。
 */
@Service
@RequiredArgsConstructor
public class PharmacyService {

    private final PharmacyConsultRepository pharmacyConsultRepository;

    /**
     * 创建药学咨询。
     *
     * @param patientId    患者 ID
     * @param drugName     药品名称
     * @param consultType  咨询类型
     * @param questionText  问题内容
     * @return 已持久化的药学咨询
     */
    public PharmacyConsult create(Long patientId, String drugName, String consultType,
                                   String questionText) {
        PharmacyConsult consult = PharmacyConsult.builder()
                .patientId(patientId)
                .drugName(drugName)
                .consultType(consultType)
                .questionText(questionText)
                .build();
        return pharmacyConsultRepository.save(consult);
    }

    /**
     * 按患者 ID 查询药学咨询列表。
     *
     * @param patientId 患者 ID
     * @return 药学咨询列表
     */
    public List<PharmacyConsult> listByPatient(Long patientId) {
        return pharmacyConsultRepository.findByPatientId(patientId);
    }

    /**
     * 待回复队列（answerText 为空）。
     *
     * @return 待回复药学咨询列表
     */
    public List<PharmacyConsult> pendingList() {
        return pharmacyConsultRepository.findAll().stream()
                .filter(consult -> consult.getAnswerText() == null || consult.getAnswerText().isEmpty())
                .collect(Collectors.toList());
    }
}
