package com.college.studentmanagement.forms;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name="custom_forms")
public class CustomForm {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @Column(nullable=false) private String title;
    @Column(length=2000) private String description;
    @Lob @Column(nullable=false) private String fieldsJson = "[]";
    @Column(nullable=false) private String accessMode = "ALL";
    @Column(length=2000) private String allowedCourses = "";
    @Column(nullable=false) private boolean active = true;
    private LocalDateTime createdAt;
    @PrePersist void onCreate(){createdAt=LocalDateTime.now();}
    public Long getId(){return id;} public String getTitle(){return title;} public void setTitle(String v){title=v;}
    public String getDescription(){return description;} public void setDescription(String v){description=v;}
    public String getFieldsJson(){return fieldsJson;} public void setFieldsJson(String v){fieldsJson=v;}
    public String getAccessMode(){return accessMode;} public void setAccessMode(String v){accessMode=v;}
    public String getAllowedCourses(){return allowedCourses;} public void setAllowedCourses(String v){allowedCourses=v;}
    public boolean isActive(){return active;} public void setActive(boolean v){active=v;}
    public LocalDateTime getCreatedAt(){return createdAt;}
}
