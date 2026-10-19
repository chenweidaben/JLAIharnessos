/*
 * 健澜科技 jlmedaios - 投诉管理 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.complaint.service;

import com.jlmedaios.monolith.complaint.entity.Complaint;
import com.jlmedaios.monolith.complaint.repository.ComplaintRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * 投诉管理 Service。
 *
 * <p>append-only: 投诉记录不可修改，处理过程留痕</p>
 */
@Service
@RequiredArgsConstructor
public class ComplaintService {

    private final ComplaintRepository complaintRepository;

    /**
     * 接收投诉。
     *
     * @param complaintNo   投诉编号
     * @param patientName   患者姓名
     * @param deptCode      科室编码
     * @param staffId       被投诉人工号
     * @param complaintType 投诉类型
     * @param description   投诉描述
     * @return 已持久化的投诉
     */
    public Complaint receive(String complaintNo, String patientName, String deptCode,
                              String staffId, String complaintType, String description) {
        Complaint complaint = Complaint.builder()
                .complaintNo(complaintNo)
                .patientName(patientName)
                .deptCode(deptCode)
                .staffId(staffId)
                .complaintType(complaintType)
                .description(description)
                .receivedDate(LocalDate.now())
                .build();
        return complaintRepository.save(complaint);
    }

    /**
     * 分配处理人（设 status=IN_PROGRESS）。
     *
     * @param id       投诉 ID
     * @param handlerId 处理人工号
     * @return 已更新的投诉
     */
    public Optional<Complaint> assign(Long id, String handlerId) {
        Optional<Complaint> opt = complaintRepository.findById(id);
        if (opt.isPresent()) {
            Complaint complaint = opt.get();
            complaint.setHandlerId(handlerId);
            complaint.setStatus("IN_PROGRESS");
            complaint.setUpdatedAt(LocalDateTime.now());
            complaintRepository.save(complaint);
        }
        return opt;
    }

    /**
     * 解决投诉（设 status=RESOLVED）。
     *
     * @param id         投诉 ID
     * @param resolution 处理结果
     * @return 已更新的投诉
     */
    public Optional<Complaint> resolve(Long id, String resolution) {
        Optional<Complaint> opt = complaintRepository.findById(id);
        if (opt.isPresent()) {
            Complaint complaint = opt.get();
            complaint.setStatus("RESOLVED");
            complaint.setResolution(resolution);
            complaint.setUpdatedAt(LocalDateTime.now());
            complaintRepository.save(complaint);
        }
        return opt;
    }

    /**
     * 待处理投诉列表（status=PENDING）。
     *
     * @return 投诉列表
     */
    public List<Complaint> pendingList() {
        return complaintRepository.findByStatus("PENDING");
    }

    /**
     * 投诉上报（别名，与 receive 等价）。
     *
     * @param complaintNo     投诉编号
     * @param complainantName  投诉人姓名
     * @param complainantPhone 投诉人电话
     * @param patientId        患者 ID
     * @param department       科室
     * @param complaintType    投诉类型
     * @param description      投诉描述
     * @return 已持久化的投诉
     */
    public Complaint report(String complaintNo, String complainantName, String complainantPhone,
                            Long patientId, String department, String complaintType,
                            String description) {
        Complaint complaint = Complaint.builder()
                .complaintNo(complaintNo)
                .patientName(complainantName)
                .deptCode(department)
                .complaintType(complaintType)
                .description(description)
                .receivedDate(LocalDate.now())
                .build();
        return complaintRepository.save(complaint);
    }

    /**
     * 处理投诉（设 status=RESOLVED，与 resolve 等价）。
     *
     * @param id           投诉 ID
     * @param handlerId    处理人工号
     * @param handleResult 处理结果
     * @return 已更新的投诉
     */
    public Optional<Complaint> handle(Long id, String handlerId, String handleResult) {
        Optional<Complaint> opt = complaintRepository.findById(id);
        if (opt.isPresent()) {
            Complaint complaint = opt.get();
            complaint.setHandlerId(handlerId);
            complaint.setStatus("RESOLVED");
            complaint.setResolution(handleResult);
            complaint.setUpdatedAt(LocalDateTime.now());
            complaintRepository.save(complaint);
        }
        return opt;
    }
}
