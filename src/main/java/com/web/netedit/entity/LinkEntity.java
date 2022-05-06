package com.web.netedit.entity;

import lombok.*;

import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.Id;
import javax.persistence.Table;
import java.util.Map;

@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@ToString
@Entity
@Table(name = "NETEDIT_MS_LINK_2020")
public class LinkEntity {

    @Id
    @Column(name = "LINK_ID")
    private String LINK_ID;

    private String UP_FROM_NODE;
    private String UP_TO_NODE;
    private int UP_LANES;

    private String DOWN_FROM_NODE;
    private String DOWN_TO_NODE;
    private int DOWN_LANES;

    private String ROAD_NAME;
    private String FIRST_DO;
    private String FIRST_GU;
    private String LEFT_TURN_TYPE;
    private String EX_POCKET;
    private String IS_CHANGE_LANES;
    private String WKT;

    public void setAll(LinkEntity _linkEntity) {
        this.UP_FROM_NODE = _linkEntity.UP_FROM_NODE;
        this.UP_TO_NODE = _linkEntity.UP_TO_NODE;
        this.UP_LANES = _linkEntity.UP_LANES;

        this.DOWN_FROM_NODE = _linkEntity.DOWN_FROM_NODE;
        this.DOWN_TO_NODE = _linkEntity.DOWN_TO_NODE;
        this.DOWN_LANES = _linkEntity.DOWN_LANES;

        this.ROAD_NAME = _linkEntity.ROAD_NAME;
        this.FIRST_DO = _linkEntity.FIRST_DO;
        this.FIRST_GU = _linkEntity.FIRST_GU;
        this.LEFT_TURN_TYPE = _linkEntity.LEFT_TURN_TYPE;
        this.EX_POCKET = _linkEntity.EX_POCKET;
        this.IS_CHANGE_LANES = _linkEntity.IS_CHANGE_LANES;
        this.WKT = _linkEntity.WKT;
    }
}
