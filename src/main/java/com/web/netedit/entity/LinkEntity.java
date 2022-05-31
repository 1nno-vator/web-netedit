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
    private String LANE_CHANGE;
    private String EX_POCKET_NUM;
    private String WKT;

    private String USE_YN;

    private String USER_1;
    private String USER_2;
    private String USER_3;
    private String USER_4;

    public void setAll(LinkEntity _linkEntity) {

        if (_linkEntity.UP_FROM_NODE != null) {
            this.UP_FROM_NODE = _linkEntity.UP_FROM_NODE;
        }
        if (_linkEntity.UP_TO_NODE != null) {
            this.UP_TO_NODE = _linkEntity.UP_TO_NODE;
        }
        if (_linkEntity.UP_LANES != null) {
            this.UP_LANES = _linkEntity.UP_LANES;
        }

        if (_linkEntity.DOWN_FROM_NODE != null) {
            this.DOWN_FROM_NODE = _linkEntity.DOWN_FROM_NODE;
        }

        if (_linkEntity.DOWN_TO_NODE != null) {
            this.DOWN_TO_NODE = _linkEntity.DOWN_TO_NODE;
        }

        if (_linkEntity.DOWN_LANES != null) {
            this.DOWN_LANES = _linkEntity.DOWN_LANES;
        }

        if (!_linkEntity.EDIT_TY.equals("") && _linkEntity.EDIT_TY != null) {
            this.EDIT_TY = _linkEntity.EDIT_TY;
        } else {
            this.EDIT_TY = null;
        }

        if (_linkEntity.ROAD_NAME != null) {
            this.ROAD_NAME = _linkEntity.ROAD_NAME;
        }

        if (_linkEntity.FIRST_DO != null) {
            this.FIRST_DO = _linkEntity.FIRST_DO;
        }

        if (_linkEntity.FIRST_GU != null) {
            this.FIRST_GU = _linkEntity.FIRST_GU;
        }

        if (_linkEntity.LANE_CHANGE != null) {
            this.LANE_CHANGE = _linkEntity.LANE_CHANGE;
        }

        if (_linkEntity.EX_POCKET_NUM != null) {
            this.EX_POCKET_NUM = _linkEntity.EX_POCKET_NUM;
        }

        this.WKT = _linkEntity.WKT;

        if (_linkEntity.USE_YN.equals("Y")) {
            this.USE_YN = "Y";
        } else {
            this.USE_YN = "N";
        }

        if (_linkEntity.USER_1 != null) {
            this.USER_1 = _linkEntity.USER_1;
        }

        if (_linkEntity.USER_2 != null) {
            this.USER_2 = _linkEntity.USER_2;
        }

        if (_linkEntity.USER_3 != null) {
            this.USER_3 = _linkEntity.USER_3;
        }

        if (_linkEntity.USER_4 != null) {
            this.USER_4 = _linkEntity.USER_4;
        }

    }
}
