package com.web.netedit.entity;


import lombok.*;

import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.Id;
import javax.persistence.Table;

@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@ToString
@Entity
@Table(name = "NETEDIT_USER_SESSION")
public class SessionEntity {

    @Id
    @Column(name = "UUID")
    private String UUID;

    @Column(name = "SESSION_ID")
    private String SESSION_ID;

    @Column(name = "LAST_ACTIVE_TM")

    private java.sql.Timestamp LAST_ACTIVE_TM;

    @Column(name = "ACTIVE_YN")
    private String ACTIVE_YN;

    @Column(name = "SESSION_SUFFIX")
    private String SESSION_SUFFIX;


}
