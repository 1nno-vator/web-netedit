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
    private String UP_LANES;

    private String DOWN_FROM_NODE;
    private String DOWN_TO_NODE;
    private String DOWN_LANES;

    private String EDIT_TY;

    private String ROAD_NAME;
    private String FIRST_DO;
    private String FIRST_GU;
    private String LEFT_TURN_TYPE;
    private String EX_POCKET;
    private String IS_CHANGE_LANES;
    private String WKT;

    private String USE_YN;

    public void setAll(LinkEntity _linkEntity) {

        System.out.println(_linkEntity.toString());

        if (!_linkEntity.UP_FROM_NODE.equals("") && _linkEntity.UP_FROM_NODE != null) {
            this.UP_FROM_NODE = _linkEntity.UP_FROM_NODE;
        }
        if (!_linkEntity.UP_TO_NODE.equals("") && _linkEntity.UP_TO_NODE != null) {
            this.UP_TO_NODE = _linkEntity.UP_TO_NODE;
        }
        if (!_linkEntity.UP_LANES.equals("") && _linkEntity.UP_LANES != null) {
            this.UP_LANES = _linkEntity.UP_LANES;
        }

        if (!_linkEntity.DOWN_FROM_NODE.equals("") && _linkEntity.DOWN_FROM_NODE != null) {
            this.DOWN_FROM_NODE = _linkEntity.DOWN_FROM_NODE;
        }

        if (!_linkEntity.DOWN_TO_NODE.equals("") && _linkEntity.DOWN_TO_NODE != null) {
            this.DOWN_TO_NODE = _linkEntity.DOWN_TO_NODE;
        }

        if (!_linkEntity.DOWN_LANES.equals("") && _linkEntity.DOWN_LANES != null) {
            this.DOWN_LANES = _linkEntity.DOWN_LANES;
        }

        if (!_linkEntity.EDIT_TY.equals("") && _linkEntity.EDIT_TY != null) {
            this.EDIT_TY = _linkEntity.EDIT_TY;
        }

        if (!_linkEntity.ROAD_NAME.equals("") && _linkEntity.ROAD_NAME != null) {
            this.ROAD_NAME = _linkEntity.ROAD_NAME;
        }

        if (!_linkEntity.FIRST_DO.equals("") && _linkEntity.FIRST_DO != null) {
            this.FIRST_DO = _linkEntity.FIRST_DO;
        }

        if (!_linkEntity.FIRST_GU.equals("") && _linkEntity.FIRST_GU != null) {
            this.FIRST_GU = _linkEntity.FIRST_GU;
        }

        if (!_linkEntity.LEFT_TURN_TYPE.equals("") && _linkEntity.LEFT_TURN_TYPE != null) {
            this.LEFT_TURN_TYPE = _linkEntity.LEFT_TURN_TYPE;
        }

        if (!_linkEntity.EX_POCKET.equals("") && _linkEntity.EX_POCKET != null) {
            this.EX_POCKET = _linkEntity.EX_POCKET;
        }

        if (!_linkEntity.IS_CHANGE_LANES.equals("") && _linkEntity.IS_CHANGE_LANES != null) {
            this.IS_CHANGE_LANES = _linkEntity.IS_CHANGE_LANES;
        }

        this.WKT = _linkEntity.WKT;

        this.USE_YN = _linkEntity.USE_YN != null ? _linkEntity.USE_YN : "Y";



    }
}
