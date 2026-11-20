package com.college.studentmanagement.forms;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name="form_submissions")
public class FormSubmission {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @Column(nullable=false) private Long formId;
    @Column(length=255) private String formTitle;
    @Column(nullable=false) private String studentEmail;
    @Lob @Column(nullable=false) private String answersJson;
    @Column(nullable=false) private String status="SUBMITTED";
    private LocalDateTime submittedAt;
    @PrePersist void onCreate(){submittedAt=LocalDateTime.now();}
    public Long getId(){return id;} public Long getFormId(){return formId;} public void setFormId(Long v){formId=v;}
    public String getFormTitle(){return formTitle;} public void setFormTitle(String v){formTitle=v;}
    public String getStudentEmail(){return studentEmail;} public void setStudentEmail(String v){studentEmail=v;}
    public String getAnswersJson(){return answersJson;} public void setAnswersJson(String v){answersJson=v;}
    public String getStatus(){return status;} public void setStatus(String v){status=v;}
    public LocalDateTime getSubmittedAt(){return submittedAt;}
}
