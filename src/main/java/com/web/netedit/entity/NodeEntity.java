package com.web.netedit.entity;

import lombok.*;

import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.Id;
import javax.persistence.Table;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@ToString
@Entity
@Table(name = "NETEDIT_MS_NODE_2020")
public class NodeEntity {

    @Id
    @Column(name = "NODE_ID")
    private String NODE_ID;

    private String NODE_TYPE;
    private String TRAFFIC_LIGHT;
    private String NODE_NAME;
    private String DISTRICT_ID;
    private String DISTRICT_ID2;
    private String WKT;

    public void setAll(NodeEntity _nodeEntity) {
        this.NODE_TYPE = _nodeEntity.NODE_TYPE;
        this.TRAFFIC_LIGHT = _nodeEntity.TRAFFIC_LIGHT;
        this.NODE_NAME = _nodeEntity.NODE_NAME;
        this.DISTRICT_ID = _nodeEntity.DISTRICT_ID;
        this.DISTRICT_ID2 = _nodeEntity.DISTRICT_ID2;
        this.WKT = _nodeEntity.WKT;
    }

}
