import * as common from './common';
import axios from 'axios';
import Hotkeys from 'hotkeys-js';

import '../css/snap.css';
import '../css/style.css';
import 'ol-ext/dist/ol-ext.css'
import 'ol-layerswitcher/dist/ol-layerswitcher.css';
import 'tui-grid/dist/tui-grid.css'
import { Feature, Map } from 'ol';
import Collection from 'ol/Collection'
import {DragBox, Modify, Snap, Select, Draw} from 'ol/interaction';
import { Vector as VectorSource } from 'ol/source';
import { Vector as VectorLayer} from 'ol/layer';
import { Icon, Text, Fill, Circle as CircleStyle, Stroke, Style, RegularShape } from 'ol/style';
import Point from 'ol/geom/Point';
import Circle from 'ol/geom/Circle';
import { buffer } from 'ol/extent';
import MultiPoint from 'ol/geom/MultiPoint';
import { click, platformModifierKeyOnly } from 'ol/events/condition';

// import BlueArrowImg from '../data/resize_blue_arrow.png';
// import NormalArrowImg from '../data/resize_normal_arrow.png';
import BlueArrowImg from '../data/resize_pink_arrow.png';
import NormalArrowImg from '../data/resize_yellow_arrow.png';

import UndoRedo from 'ol-ext/interaction/UndoRedo'
import { fromExtent } from 'ol/geom/Polygon';
import WKT from 'ol/format/WKT';
import Grid from "tui-grid";
import {LineString, Polygon} from "ol/geom";
import Split from "ol-ext/interaction/Split";
import * as olSphere from "ol/sphere";

// global value
let LINK_DATA = null;
let NODE_DATA = null;

let CIRCLE_RADIUS = 0.0000005;

let map = null;

let GRID_SET_LINK_ID = null;

const tempNodeSource = new VectorSource();
const tempLayer = new VectorLayer({
  source: tempNodeSource
});

const source = new VectorSource({
  features: new Collection(),
  wrapX: false
});
const layer = new VectorLayer({
  source: source
});

const smSource = new VectorSource({
  features: new Collection(),
  wrapX: false
});
const smLayer = new VectorLayer({
  source: smSource,
    style: new Style({
        image: new CircleStyle({
              radius: 13,
              fill: new Fill({color: 'rgba(255, 0, 0, 0.6)'})
          }),
        zIndex: 999,
      })
});

let displayZoneFeature = null;

let saveDataArchive = [];

const testStyle = function (feature) {
    return new Style({
        image: new CircleStyle({
              radius: 13,
              fill: new Fill({color: 'rgba(255, 0, 0, 0.6)'})
          }),
        zIndex: 999,
      })
}

const styleFunction = function (feature) {
  const props = feature.getProperties();
  const geometry = feature.getGeometry();

  const selectedFeaturesId = getSelectedFeaturesId();

  const inputText = document.getElementById('search-feature').value;
  const gridSetData = GRID_SET_LINK_ID;

    let styles = [
        // linestring
        new Style({
          stroke: new Stroke({
            color: gridSetData === feature.getId()
                    ? '#C70039'
                    : (inputText === feature.getId() ? '#C70039'
                        : (selectedFeaturesId.includes(feature.getId()) ? '#FFB2F5' : '#FFE400')
                      ),
            width: selectedFeaturesId.includes(feature.getId()) ? 5 : 4,
          }),
          text: new Text({
            font: '8px Verdana',
            text: selectedFeaturesId.includes(feature.getId()) ? feature.getId() : '',
            fill: new Fill({ color: 'red' }),
            stroke: new Stroke({ color: 'yellow', width: 3 })
          }),
          zIndex: 999
        }),
      ];

  if (getZoomLevel() > 16) {
    let from = geometry.getFirstCoordinate();
    let to = geometry.getLastCoordinate();
    const all_dx = to[0] - from[0];
    const all_dy = to[1] - from[1];
    const all_rotation = Math.atan2(all_dy, all_dx);
    // arrows
    styles.push(
      new Style({
        geometry: new Point(to),
        image: new Icon({
          src: selectedFeaturesId.includes(feature.getId())  ? BlueArrowImg : NormalArrowImg,
          // color: selectedFeaturesId.includes(feature.getId()) ? '#FFB2F5' : '#FFE400',
          anchor: [0.75, 0.5],
          opacity: getZoomLevel() > 16 ? 1 : 0,
          scale: [1.5, 1.5],
          rotateWithView: true,
          rotation: -all_rotation,
        }),
        zIndex: 999,
      })
    );

    let segCount = 0;

    geometry.forEachSegment(function (start, end) {
      segCount++;
      if(segCount % 3 === 0) {
        const dx = end[0] - start[0];
        const dy = end[1] - start[1];
        const rotation = Math.atan2(dy, dx);

          // arrows
          styles.push(
            new Style({
              geometry: new Point(end),
              image: new Icon({
                src: selectedFeaturesId.includes(feature.getId())  ? BlueArrowImg : NormalArrowImg,
                // color: selectedFeaturesId.includes(feature.getId()) ? '#0000ff' : '#ffcc33',
                opacity: getZoomLevel() > 16 ? 1 : 0,
                anchor: [0.75, 0.5],
                rotateWithView: true,
                rotation: -rotation,
              }),
              zIndex: 999
            })
          );
      }
    });

    let fromRegularShapeStyle = new Style({
      image: new RegularShape({
        radius: 6,
        points:6,
        fill: new Fill({
          color: '#0100FF'
        })
      }),
      zIndex: 999,
      geometry: new Point(from)
    })

    let toRegularShapeStyle = new Style({
      image: new RegularShape({
        radius: 6,
        points:6,
        fill: new Fill({
          color: '#0100FF'
        })
      }),
      zIndex: 999,
      geometry: new Point(to)
    })

    styles.push(fromRegularShapeStyle);
    styles.push(toRegularShapeStyle);
  }

  return styles;
};

let SHOW_USE_YN = 'Y';

let targetFeature = null;

// interactionValue
let select, snap, modify, undoInteraction, draw, split;
//

// grid value

let LINK_GRID_INSTANCE;
let FROM_NODE_GRID_INSTANCE;
let TO_NODE_GRID_INSTANCE;

const DEFAULT_COLUMN = [
  {
    header: '컬럼명',
    name: 'name',
    align: 'center',
    valign: 'middle'
  },
  {
    header: 'Value',
    name: 'value',
    align: 'center',
    valign: 'middle',
  }
];

let DELETE_FEATURES_ID = [];
let EXCLUDE_FEATURES_ID = [];

document.addEventListener('DOMContentLoaded', function() {
    initMap();
    initGrid();

    getSmInter();

    addSelectInteraction();
    addDrawBoxInteraction();
    addUndoInteraction();
    // addModifyInteraction();
    // addDrawInteraction();
    // addSnapInteraction();

    domEventRegister();
})

function domEventRegister() {
    document.getElementById('UNDO_BTN').addEventListener('click', (e) => {
        undoInteraction.undo();
    })

    document.getElementById('REDO_BTN').addEventListener('click', (e) => {
        undoInteraction.redo();
    })

    document.getElementById('SAVE_BTN').addEventListener('click', (e) => {
        applyData();
    })

    document.getElementById('search-feature-btn').addEventListener('click', (e) => {
        const inputText = document.getElementById('search-feature').value;
        getSingleLink(inputText);
    })

    // Use Array.forEach to add an event listener to each checkbox.
    document.querySelectorAll("input[type=checkbox][name=sgg]").forEach(function(checkbox) {
      checkbox.addEventListener('change', function() {
          clearing();
      })
    });

    document.getElementById('CREATE-BTN').addEventListener('click', () => {
        const isContinue = confirm('저장하지않은 내용은 사라집니다.\n진행합니까?');
        if (!isContinue) {
            return false;
        }

        buttonStyleToggle(document.getElementById('CREATE-BTN'));

        const isOn = document.getElementById('CREATE-BTN').classList.contains('btn-primary');

        allInteractionOff()
        select.getFeatures().clear();
        clearing();

        if (isOn) {
            addModifyInteraction();
            addDrawInteraction();
            addSnapInteraction();
        }
    })

    document.getElementById('MODIFY-BTN').addEventListener('click', () => {
        const isContinue = confirm('저장하지않은 내용은 사라집니다.\n진행합니까?');
        if (!isContinue) {
            return false;
        }
        buttonStyleToggle(document.getElementById('MODIFY-BTN'));

        const isOn = document.getElementById('MODIFY-BTN').classList.contains('btn-primary');

        allInteractionOff();
        select.getFeatures().clear();
        clearing();

        if (isOn) {
            addModifyInteraction();
            addSnapInteraction();
        }
    })

    document.getElementById('SPLIT-BTN').addEventListener('click', () => {
        const isContinue = confirm('저장하지않은 내용은 사라집니다.\n진행합니까?');
        if (!isContinue) {
            return false;
        }
        buttonStyleToggle(document.getElementById('SPLIT-BTN'));

        const isOn = document.getElementById('SPLIT-BTN').classList.contains('btn-primary');

        allInteractionOff();
        select.getFeatures().clear();
        clearing();

        if (isOn) {
            addSplitInteraction();
        }
    })

    Hotkeys('ctrl+s', function(event, handler) {
        // Prevent the default refresh event under WINDOWS system
        event.preventDefault()
        applyData();
    })

    Hotkeys('ctrl+a', function(event, handler) {
        // Prevent the default refresh event under WINDOWS system
        event.preventDefault()
        const selectedFeatures = select.getFeatures();
        selectedFeatures.forEach(function(value) {
            const target = value;
            if (target.get("featureType") === "LINK") {
                target.set("EDIT_TY", "1");
                const LINK_DATA_REPO = target.get("LINK_DATA_REPO");
                LINK_DATA_REPO.EDIT_TY = "1";
                target.set("LINK_DATA_REPO", LINK_DATA_REPO);
            }
        });
    })

    Hotkeys('delete', function(event, handler) {
        // Prevent the default refresh event under WINDOWS system
        event.preventDefault()

        const isConfirm = confirm('선택된 형상들을 삭제하시겠습니까?')
        if (isConfirm) {
            select.getFeatures().forEach(function(_f) {
                deleteData(_f.get("LINK_ID"),"LINK")
            })
            alert('저장되었습니다.');
        }


    })

    Hotkeys('ctrl+a', function(event, handler) {
        // Prevent the default refresh event under WINDOWS system
        event.preventDefault()
        const selectedFeatures = select.getFeatures();
        selectedFeatures.forEach(function(value) {
            const target = value;
            if (target.get("featureType") === "LINK") {
                target.set("EDIT_TY", "1");
                const LINK_DATA_REPO = target.get("LINK_DATA_REPO");
                LINK_DATA_REPO.EDIT_TY = "1";
                target.set("LINK_DATA_REPO", LINK_DATA_REPO);
            }
        });
    })
}

function initMap() {
    map = new Map({
        target: 'map',
        layers: [
          common._baseMapLayer,
          common._baseMapInfoLayer,
          smLayer,
          layer,
            tempLayer
        ],
        view: common._mainMapView,
        loadTilesWhileAnimating: true
    });

    let nowDisplayExtent = getExtent();

    let displayZonePolygon = fromExtent(nowDisplayExtent);

    displayZoneFeature = new Feature({
        geometry: displayZonePolygon
    })

    map.on('pointermove', function(e) {
        map.getTargetElement().style.cursor = map.hasFeatureAtPixel(e.pixel) ? 'pointer' : '';
    })

    map.on('moveend', function(e) {
        // zoom 할 수록 커짐
        let newZoom = getZoomLevel();

        if (newZoom > 16) {
            let nowDisplayExtent = getExtent();

            let displayZonePolygon = fromExtent(nowDisplayExtent);

            displayZoneFeature = new Feature({
                geometry: displayZonePolygon
            })

            let format = new WKT(),
                wkt = format.writeGeometry(displayZoneFeature.getGeometry());

            if (getCheckValue().length === 0) {
                getFeaturesByZone(wkt);
            }
        }
    })

    map.getViewport().addEventListener('contextmenu', function (evt) {
        evt.preventDefault();
        const pixel = map.getEventPixel(evt)
        const coords = map.getEventCoordinate(evt);
        let target = null;

        const selectedFeatures = select.getFeatures();
        const idMaps = selectedFeatures.getArray().map(v => v.getId());

        const COORDS_CIRCLE = new Circle(coords, CIRCLE_RADIUS)

        const intersect = source.getFeaturesInExtent(COORDS_CIRCLE.getExtent());

        let dist = 999999999999999;

        intersect.forEach(function(v) {
            if (v.get("featureType") === "LINK") {
                v.getGeometry().forEachSegment(function(start, end) {
                    let compareDist = olSphere.getDistance(coords, start)
                    if (compareDist < dist) {
                        target = v;
                        dist = compareDist;
                    }
                    compareDist = olSphere.getDistance(coords, end);
                    if (compareDist < dist) {
                        target = v;
                        dist = compareDist;
                    }

                    const segLine = new LineString([start, end]);
                    const segLineCenterCoord = segLine.getCoordinateAt(0.5);
                    compareDist = olSphere.getDistance(coords, segLineCenterCoord)
                    if (compareDist < dist) {
                        target = v;
                        dist = compareDist;
                    }
                })
            }
        })

        if (target) {
            if (NODE_DATA) {
                setNodeData(target);
            }
            pushSaveData(target);
            setGridData(target);

            if (idMaps.includes(target.getId())) {
                selectedFeatures.forEach((sf) => {
                    if (sf && target) {
                        // if (sf.getId() === target.getId()) {
                        //     selectedFeatures.remove(sf);
                        // }
                    }
                })
            } else {
                select.getFeatures().push(target);
            }

            source.dispatchEvent('change');
        }


    })
}

function initGrid() {

  LINK_GRID_INSTANCE = new Grid({
    el: document.getElementById('link-grid'), // Container element
    rowHeight: 30,
    minRowHeight: 0,
    scrollX: false,
    scrollY: false,
    minBodyHeight: 380,
    bodyHeight: 380,
    columns: DEFAULT_COLUMN
  });

  FROM_NODE_GRID_INSTANCE = new Grid({
    el: document.getElementById('from-node-grid'), // Container element
    rowHeight: 30,
    minRowHeight: 0,
    width: 280,
    scrollX: false,
    scrollY: false,
    minBodyHeight: 200,
    bodyHeight: 200,
    columns: DEFAULT_COLUMN
  });

  TO_NODE_GRID_INSTANCE = new Grid({
    el: document.getElementById('to-node-grid'), // Container element
    rowHeight: 30,
    minRowHeight: 0,
    width: 280,
    scrollX: false,
    scrollY: false,
    minBodyHeight: 200,
    bodyHeight: 200,
    columns: DEFAULT_COLUMN
  });

  // LINK_GRID_INSTANCE.resetData(newData); // Call API of instance's public method

  Grid.applyTheme('striped'); // Call API of static method

  setGridEditable();

}

// interactions

function addSelectInteraction() {
    select = new Select({
        source: source,
        filter: function(f, l) {

          if (f.get('featureType') === "LINK") {
            return true;
          } else {
            return false;
          }

        },
        style: styleFunction,
        multi: false
    })

    let selectedFeatures = select.getFeatures();

    selectedFeatures.on('add', function(e) {

        selectedFeatures.forEach(function(value) {
            const target = value;
            if (target.get("featureType") === "LINK") {
                if (NODE_DATA) {
                    setNodeData(target);
                }
                pushSaveData(target);
            }
        });

        source.dispatchEvent('change');

    })

    selectedFeatures.on('remove', function(value) {
        if (selectedFeatures.getArray().length === 0) {
            LINK_GRID_INSTANCE.resetData([]);
            FROM_NODE_GRID_INSTANCE.resetData([]);
            TO_NODE_GRID_INSTANCE.resetData([]);
            GRID_SET_LINK_ID = null;
            source.dispatchEvent('change');
        }
    })

    map.addInteraction(select);
}

function addModifyInteraction() {
    modify = new Modify({
        features: select.getFeatures(),
        // source: select.getSource(),
        pixelTolerance: 15,
        wrapX: false
    });

    modify.on('modifyend', function(e) {
        wktUpdate();
    })

    map.addInteraction(modify);
}

function addSnapInteraction() {
    snap = new Snap({
        source: source
    });
    map.addInteraction(snap);
}

function addUndoInteraction() {
    // Undo redo interaction
    undoInteraction = new UndoRedo();
    map.addInteraction(undoInteraction);
}

function addDrawBoxInteraction() {
    // a DragBox interaction used to select features by drawing boxes
    const dragBox = new DragBox({
      condition: platformModifierKeyOnly,
    });

    let selectedFeatures = select.getFeatures();

    // clear selection when drawing a new box and when clicking on the map
    dragBox.on('boxstart', function () {
      selectedFeatures.clear();
    });

    dragBox.on('boxend', function () {
      const extent = dragBox.getGeometry().getExtent();
      const boxFeatures = source.getFeaturesInExtent(extent).filter((feature) => feature.getGeometry().intersectsExtent(extent));
      selectedFeatures.extend(boxFeatures);
    });

    map.addInteraction(dragBox);
}

function addDrawInteraction() {
    draw = new Draw({
        source: source,
        type: "LineString"
    });

    draw.on('drawstart', function(e) {

        e.feature.setStyle(styleFunction);
        tempNodeSource.clear();
    })

    draw.on('drawend', function(e) {

        const drawFeature = e.feature;

        const wktFormat = new WKT();

        drawFeature.setProperties({
            'featureType': 'LINK',
            'LINK_ID': "CL" + makeTimeKey(),
            'UP_FROM_NODE': '',
            'UP_TO_NODE': '',
            'UP_LANES': '',
            'ROAD_NAME': '',
            'DOWN_FROM_NODE': '',
            'DOWN_TO_NODE': '',
            'DOWN_LANES': '',
            'FIRST_DO': '',
            'FIRST_GU': '',
            'LEFT_TURN_TYPE': '',
            'EX_POCKET': '',
            'IS_CHANGE_LANES': '',
            'WKT': wktFormat.writeGeometry(drawFeature.getGeometry()).replace("(", " (").replace(",",", ")
        })
        drawFeature.setId(drawFeature.get("LINK_ID"));

        const firstCoords = drawFeature.getGeometry().getFirstCoordinate();
        const lastCoords = drawFeature.getGeometry().getLastCoordinate();

        const intersect = source.getFeaturesInExtent(drawFeature.getGeometry().getExtent());

        if (intersect.length > 0) { // 기 존재 노드 하나라도 포함
            let uniqueNodes = [];

            intersect.forEach(v => {
                uniqueNodes.push(v.get("UP_FROM_NODE"));
                uniqueNodes.push(v.get("UP_TO_NODE"));
            })

            uniqueNodes = Array.from(new Set(uniqueNodes));

            const nodeMap = uniqueNodes.map(v => {
                return NODE_DATA.find(v2 => v2.node_id === v);
            }).filter(v => v);

            nodeMap.forEach(v => {

                let _feature = wktFormat.readFeature(v.wkt,  {
                  dataProjection: 'EPSG:4326',
                  featureProjection: 'EPSG:4326'
                });
                _feature.setProperties({
                    featureType: 'NODE',
                    NODE_ID: v.node_id,
                    NODE_TYPE: v.node_type,
                    NODE_NAME: v.node_name,
                    TRAFFIC_LIGHT: v.traffic_light,
                    DISTRICT_ID: v.district_id,
                    DISTRICT_ID2: v.district_id2,
                    WKT: v.wkt
                })
                tempNodeSource.addFeature(_feature);
            })

        }


        const FIRST_COORDS_CIRCLE = new Circle(firstCoords, CIRCLE_RADIUS)
        const FIRST_CIRCLE_INTERSECT = tempNodeSource.getFeaturesInExtent(FIRST_COORDS_CIRCLE.getExtent());
        const LAST_COORDS_CIRCLE = new Circle(lastCoords, CIRCLE_RADIUS)
        const LAST_CIRCLE_INTERSECT = tempNodeSource.getFeaturesInExtent(LAST_COORDS_CIRCLE.getExtent());

        let dist = 15;

        let first, last;

        FIRST_CIRCLE_INTERSECT.forEach(function(v) {
            let compareDist = olSphere.getDistance(firstCoords, v.getGeometry().getCoordinates())
            if (compareDist < dist) {
                first = v;
                dist = compareDist;
            }
        })

        dist = 15;

        LAST_CIRCLE_INTERSECT.forEach(function(v) {
            let compareDist = olSphere.getDistance(lastCoords, v.getGeometry().getCoordinates())
            if (compareDist < dist) {
                last = v;
                dist = compareDist;
            }
        })

         ////////////////

        let FROM_NODE_PROPS, TO_NODE_PROPS;

        // if (intersectFromNode.length > 0 && intersectToNode.length > 0) { // 기노드 간 연결
        //     console.log('기존재 노드 간 연결')
        //     FROM_NODE_PROPS = intersectFromNode[0].getProperties();
        //     TO_NODE_PROPS = intersectToNode[0].getProperties();
        //
        //     console.log(FROM_NODE_PROPS);
        //     console.log(TO_NODE_PROPS);
        // } else if (intersectFromNode.length > 0 || intersectToNode.length > 0) {
        //     console.log('하나만 기존재 노드');
        //
        //     const NODE_DATA_REPO_TEMPLATE = {
        //         DATA_TYPE: intersectToNode.length > 0 ? 'FROM' : 'TO',
        //         NODE_ID: intersectToNode.length > 0 ? "CFN" + makeTimeKey() : "CTN" + makeTimeKey(),
        //         NODE_TYPE: '',
        //         NODE_NAME: '',
        //         TRAFFIC_LIGHT: '',
        //         DISTRICT_ID: '',
        //         DISTRICT_ID2: ''
        //     }
        //
        //     FROM_NODE_PROPS = intersectFromNode.length > 0 ? intersectFromNode[0].getProperties() : NODE_DATA_REPO_TEMPLATE;
        //     TO_NODE_PROPS = intersectToNode.length > 0 ? intersectToNode[0].getProperties() : NODE_DATA_REPO_TEMPLATE;
        //
        //     console.log(FROM_NODE_PROPS);
        //     console.log(TO_NODE_PROPS);
        // } else {
        //     console.log('둘 다 신규노드')
        //
        //     FROM_NODE_PROPS = {
        //         DATA_TYPE: 'FROM',
        //         NODE_ID: "CFN" + makeTimeKey(),
        //         NODE_TYPE: '',
        //         NODE_NAME: '',
        //         TRAFFIC_LIGHT: '',
        //         DISTRICT_ID: '',
        //         DISTRICT_ID2: ''
        //     }
        //
        //     TO_NODE_PROPS = {
        //         DATA_TYPE: 'TO',
        //         NODE_ID: "CTN" + makeTimeKey(),
        //         NODE_TYPE: '',
        //         NODE_NAME: '',
        //         TRAFFIC_LIGHT: '',
        //         DISTRICT_ID: '',
        //         DISTRICT_ID2: ''
        //     }
        //
        //     console.log(FROM_NODE_PROPS);
        //     console.log(TO_NODE_PROPS);
        // }

        if (first && last) { // 기노드 간 연결
            console.log('기존재 노드 간 연결')
            FROM_NODE_PROPS = first.getProperties();
            TO_NODE_PROPS = last.getProperties();

            console.log(FROM_NODE_PROPS);
            console.log(TO_NODE_PROPS);
        } else if (first || last) {
            console.log('하나만 기존재 노드');

            let target;
            if (first) {
                target = first.getGeometry();
            } else {
                target = last.getGeometry();
            }

            const NODE_DATA_REPO_TEMPLATE = {
                DATA_TYPE: first ? 'FROM' : 'TO',
                NODE_ID: last ? "CFN" + makeTimeKey() : "CTN" + makeTimeKey(),
                NODE_TYPE: '',
                NODE_NAME: '',
                TRAFFIC_LIGHT: '',
                DISTRICT_ID: '',
                DISTRICT_ID2: '',
                WKT: wktFormat.writeGeometry(target).replace("(", " (").replace(",",", ")
            }

            FROM_NODE_PROPS = first ? first.getProperties() : NODE_DATA_REPO_TEMPLATE;
            TO_NODE_PROPS = last ? last.getProperties() : NODE_DATA_REPO_TEMPLATE;

            console.log(FROM_NODE_PROPS);
            console.log(TO_NODE_PROPS);
        } else {
            console.log('둘 다 신규노드')

            FROM_NODE_PROPS = {
                DATA_TYPE: 'FROM',
                NODE_ID: "CFN" + makeTimeKey(),
                NODE_TYPE: '',
                NODE_NAME: '',
                TRAFFIC_LIGHT: '',
                DISTRICT_ID: '',
                DISTRICT_ID2: '',
                WKT: wktFormat.writeGeometry(new Point(drawFeature.getGeometry().getFirstCoordinate())).replace("(", " (").replace(",",", ")
            }

            TO_NODE_PROPS = {
                DATA_TYPE: 'TO',
                NODE_ID: "CTN" + makeTimeKey(),
                NODE_TYPE: '',
                NODE_NAME: '',
                TRAFFIC_LIGHT: '',
                DISTRICT_ID: '',
                DISTRICT_ID2: '',
                WKT: wktFormat.writeGeometry(new Point(drawFeature.getGeometry().getLastCoordinate())).replace("(", " (").replace(",",", ")
            }

            console.log(FROM_NODE_PROPS);
            console.log(TO_NODE_PROPS);
        }

        drawFeature.set("UP_FROM_NODE", FROM_NODE_PROPS.NODE_ID);
        drawFeature.set("UP_TO_NODE", TO_NODE_PROPS.NODE_ID);
        drawFeature.set("DOWN_FROM_NODE", TO_NODE_PROPS.NODE_ID);
        drawFeature.set("DOWN_TO_NODE", FROM_NODE_PROPS.NODE_ID);

        drawFeature.set("FROM_NODE_DATA_REPO", FROM_NODE_PROPS);
        drawFeature.set("TO_NODE_DATA_REPO", TO_NODE_PROPS);
        const { FROM_NODE_DATA_REPO, TO_NODE_DATA_REPO, ...LINK_DATA_REPO } = JSON.parse(JSON.stringify(drawFeature.getProperties()));
        LINK_DATA_REPO.FROM_NODE_DATA_REPO = FROM_NODE_PROPS;
        LINK_DATA_REPO.TO_NODE_DATA_REPO = TO_NODE_PROPS;
        drawFeature.set("LINK_DATA_REPO", LINK_DATA_REPO);

        console.log(drawFeature.getProperties());
        console.log(drawFeature.getId());

        select.getFeatures().push(drawFeature);
        setGridData(drawFeature);
    })

    map.addInteraction(draw);
}

function addSplitInteraction() {
    split = new Split({
        sources: source
    });

    split.on('beforesplit', function (e) {
        console.log('beforesplit');
        const origin = e.original;
        DELETE_FEATURES_ID.push(origin.get("LINK_ID"));
    })

    split.on('aftersplit', function (e, a, b) {
        console.log('aftersplit');
        const wktFormat = new WKT();
        const firstLink = e.features[0];
        const secondLink = e.features[1];
        const splitNode = new Point(firstLink.getGeometry().getLastCoordinate());

        const splitNodeKey = "SN" + makeTimeKey();
        let firstLinkLinkDataRepo = JSON.parse(JSON.stringify(firstLink.get("LINK_DATA_REPO")));
        let secondLinkLinkDataRepo = JSON.parse(JSON.stringify(secondLink.get("LINK_DATA_REPO")));

        const originLinkId = e.original.get("LINK_ID");

        firstLink.set("UP_TO_NODE", splitNodeKey);
        firstLink.set("DOWN_FROM_NODE", splitNodeKey);
        firstLink.set("WKT", wktFormat.writeGeometry(firstLink.getGeometry()).replace("(", " (").replace(",",", "))
        firstLinkLinkDataRepo.WKT = wktFormat.writeGeometry(firstLink.getGeometry()).replace("(", " (").replace(",",", ");

        firstLinkLinkDataRepo.TO_NODE_DATA_REPO = {
            NODE_ID: splitNodeKey,
            NODE_TYPE: '',
            NODE_NAME: '',
            TRAFFIC_LIGHT: '',
            DISTRICT_ID: '',
            DISTRICT_ID2: '',
            WKT: wktFormat.writeGeometry(splitNode).replace("(", " (").replace(",",", ")
        }

        firstLinkLinkDataRepo.UP_TO_NODE = splitNodeKey;
        firstLinkLinkDataRepo.DOWN_FROM_NODE = splitNodeKey;

        let newLinkIdPrefix;

        if (originLinkId.indexOf("_") > -1) {
            newLinkIdPrefix = originLinkId
        } else {
            newLinkIdPrefix = originLinkId + "_"
        }

        // let firstLinkKey = firstLink.get("UP_FROM_NODE") + "_" + firstLink.get("UP_TO_NODE");
        let firstLinkKey = newLinkIdPrefix + "01";

        firstLink.set("LINK_ID", firstLinkKey);
        firstLink.setId(firstLink.get("LINK_ID"));
        firstLinkLinkDataRepo.LINK_ID = firstLinkKey;

        firstLink.set("LINK_DATA_REPO", firstLinkLinkDataRepo);

        secondLink.set("UP_FROM_NODE", splitNodeKey);
        secondLink.set("DOWN_TO_NODE", splitNodeKey);
        secondLink.set("WKT", wktFormat.writeGeometry(secondLink.getGeometry()).replace("(", " (").replace(",",", "))
        secondLinkLinkDataRepo.WKT = wktFormat.writeGeometry(firstLink.getGeometry()).replace("(", " (").replace(",",", ");

        secondLinkLinkDataRepo.FROM_NODE_DATA_REPO = {
            NODE_ID: splitNodeKey,
            NODE_TYPE: '',
            NODE_NAME: '',
            TRAFFIC_LIGHT: '',
            DISTRICT_ID: '',
            DISTRICT_ID2: '',
            WKT: wktFormat.writeGeometry(splitNode).replace("(", " (").replace(",",", ")
        }

        secondLinkLinkDataRepo.UP_FROM_NODE = splitNodeKey;
        secondLinkLinkDataRepo.DOWN_TO_NODE = splitNodeKey;

        // let secondLinkKey = secondLink.get("UP_FROM_NODE") + "_" + secondLink.get("UP_TO_NODE");
        let secondLinkKey = newLinkIdPrefix + "02";

        secondLink.set("LINK_ID", secondLinkKey);
        secondLink.setId(secondLink.get("LINK_ID"));
        secondLinkLinkDataRepo.LINK_ID = secondLinkKey;

        secondLink.set("LINK_DATA_REPO", secondLinkLinkDataRepo);

        console.log('first link');
        console.log(firstLink.getProperties());

        console.log('second link');
        console.log(secondLink.getProperties());

        const splittedLink = [firstLink, secondLink]
        select.getFeatures().extend(splittedLink);
        setGridData(firstLink);
    })

    map.addInteraction(split)
}


//

function getSmInter() {
    axios.get(`${common.API_PATH}/api/smInter`)
      .then(({ data }) => {

        for (let i=0; i<data.length; i++) {
            const d = data[i];
            const format = new WKT();
            let _feature = format.readFeature(d.wkt,  {
              dataProjection: 'EPSG:4326',
              featureProjection: 'EPSG:4326'
            });
            smSource.addFeature(_feature);
        }


      })
      .catch((e) => {
          console.log(e)
      })
}

function getSingleLink(_featureId) {
    axios.post(`${common.API_PATH}/api/singleLink`, {
        featureId: _featureId
    })
    .then(({ data }) => {

        if (data) {
            const format = new WKT();
            let _feature = format.readFeature(data.wkt,  {
              dataProjection: 'EPSG:4326',
              featureProjection: 'EPSG:4326'
            });

            const centerCoords = _feature.getGeometry().getCoordinateAt(0.5);

            map.getView().setZoom(17);
            map.getView().setCenter(centerCoords);
        } else {
            alert('데이터가 없습니다.');
        }


    })
    .catch((e) => {
        alert('데이터가 없거나 오류가 발생했습니다.');
    })
}

function getFeaturesByZone(_displayZoneWKT) {
  axios.post(`${common.API_PATH}/api/linkByZoneWithNodeData`, {
    wkt: _displayZoneWKT,
    sggCode: getCheckValue()
  })
  .then(({ data }) => {

    console.log(data);

    LINK_DATA = data.LINK_DATA;
    NODE_DATA = data.NODE_DATA;

    makeLinkFeatures(LINK_DATA);
    // makeNodeFeatures(NODE_DATA);

  })
  .catch(function (error) {
    console.log(error);
  });

}

function makeLinkFeatures(_data) {

  const dataLength = _data.length;
  const format = new WKT();

  for (let i=0; i<dataLength; i++) {
    const d = _data[i];
    if (d.use_yn !== SHOW_USE_YN) {
      let removeTarget = source.getFeatureById(d.link_id);
      if (removeTarget) {
        source.removeFeature(removeTarget)
      }
      continue;
    };
    let _feature = format.readFeature(d.wkt,  {
      dataProjection: 'EPSG:4326',
      featureProjection: 'EPSG:4326'
    });
    _feature.setId(d.link_id);
    _feature.setProperties({
      'featureType': 'LINK',
      'LINK_ID': d.link_id,
      'UP_FROM_NODE': d.up_from_node,
      'UP_TO_NODE': d.up_to_node,
      'UP_LANES': d.up_lanes || '',
      'ROAD_NAME': d.road_name || '',
      'DOWN_FROM_NODE': d.down_from_node || '',
      'DOWN_TO_NODE': d.down_to_node || '',
      'DOWN_LANES': d.down_lanes || '',
      'EDIT_TY': d.edit_ty || '',
      'FIRST_DO': d.first_do || '',
      'FIRST_GU': d.first_gu || '',
      'LEFT_TURN_TYPE': d.left_turn_type || '',
      'EX_POCKET': d.ex_pocket || '',
      'IS_CHANGE_LANES': d.is_change_lanes || '',
      'WKT': d.wkt
    })
    if (NODE_DATA) {
        setNodeData(_feature)
    }
    source.addFeature(_feature);
    _feature.setStyle(styleFunction)
  }

}

function makeNodeFeatures(_data) {

    const dataLength = _data.length;

    const format = new WKT();

    for (let i=0; i<dataLength; i++) {
        const d = _data[i];
        let removeTarget = source.getFeatureById(d.node_id);
        if (removeTarget) {
          source.removeFeature(removeTarget)
            continue;
        }

      let _feature = format.readFeature(d.wkt,  {
        dataProjection: 'EPSG:4326',
        featureProjection: 'EPSG:4326'
      });
      _feature.setId(d.node_id);
      _feature.setProperties({
        'featureType': 'NODE',
        'NODE_ID': d.node_id,
        'WKT': d.wkt
      })
      source.addFeature(_feature);
    }
}

function setGridEditable() {
  const EDITABLE_COLUMN = [
    {
      header: '컬럼명',
      name: 'name',
      align: 'center',
      valign: 'middle'
    },
    {
      header: 'Value',
      name: 'value',
      align: 'center',
      valign: 'middle',
      editor: 'text'
    }
  ];

  LINK_GRID_INSTANCE.on('afterChange', (ev) => {
      const changes = ev.changes[0];
      const rowInfo = LINK_GRID_INSTANCE.getRowAt(changes.rowKey);
      const changeColumnName = rowInfo.name;
      const changeValue = rowInfo.value;
      const LINK_GRID_DATA = LINK_GRID_INSTANCE.getData();
      const LINK_ID = LINK_GRID_DATA.find(v => v.name === "LINK_ID").value;
      const feature = source.getFeatureById(LINK_ID);
      const featureRepo = feature.get("LINK_DATA_REPO");
      featureRepo[changeColumnName] = changeValue;
      feature.set(changeColumnName, changeValue);
      feature.set("LINK_DATA_REPO", featureRepo);
  })

  FROM_NODE_GRID_INSTANCE.on('afterChange', (ev) => {
    const changes = ev.changes[0];
    const rowInfo = FROM_NODE_GRID_INSTANCE.getRowAt(changes.rowKey);
    const changeColumnName = rowInfo.name;
    const changeValue = rowInfo.value;

    const LINK_GRID_DATA = LINK_GRID_INSTANCE.getData();
    const LINK_ID = LINK_GRID_DATA.find(v => v.name === "LINK_ID").value;
    const feature = source.getFeatureById(LINK_ID);
    const featureRepo = feature.get("LINK_DATA_REPO");
    const fromNodeRepo = featureRepo.FROM_NODE_DATA_REPO;
    fromNodeRepo[changeColumnName] = changeValue;
    feature.set("FROM_NODE_DATA_REPO", fromNodeRepo);
  })

  TO_NODE_GRID_INSTANCE.on('afterChange', (ev) => {
    const changes = ev.changes[0];
    const rowInfo = TO_NODE_GRID_INSTANCE.getRowAt(changes.rowKey);
    const changeColumnName = rowInfo.name;
    const changeValue = rowInfo.value;

    const LINK_GRID_DATA = LINK_GRID_INSTANCE.getData();
    const LINK_ID = LINK_GRID_DATA.find(v => v.name === "LINK_ID").value;
    const feature = source.getFeatureById(LINK_ID);
    const featureRepo = feature.get("LINK_DATA_REPO");
    const fromNodeRepo = featureRepo.TO_NODE_DATA_REPO;
    fromNodeRepo[changeColumnName] = changeValue;
    feature.set("TO_NODE_DATA_REPO", fromNodeRepo);
  })

  LINK_GRID_INSTANCE.setColumns(EDITABLE_COLUMN);
  FROM_NODE_GRID_INSTANCE.setColumns(EDITABLE_COLUMN);
  TO_NODE_GRID_INSTANCE.setColumns(EDITABLE_COLUMN);
}

function setNodeData(target) {
    const FROM_NODE = target.get("UP_FROM_NODE");
    const TO_NODE = target.get("UP_TO_NODE");
    const {geometry, featureType, ...LINK_PROPS} = JSON.parse(JSON.stringify(target.getProperties()));

    const FROM_NODE_PROPS = NODE_DATA.find(v => {
        return v.node_id === FROM_NODE;
    })
    const TO_NODE_PROPS = NODE_DATA.find(v => {
        return v.node_id === TO_NODE;
    })

    const LINK_DATA_REPO = LINK_PROPS.LINK_DATA_REPO;
    if (LINK_DATA_REPO) {
        return;
    }

    if (FROM_NODE_PROPS) {
        const FROM_NODE_PROPS_FORM = {
              NODE_ID: FROM_NODE_PROPS.node_id,
              NODE_TYPE: FROM_NODE_PROPS.node_type,
              NODE_NAME: FROM_NODE_PROPS.node_name,
              TRAFFIC_LIGHT: FROM_NODE_PROPS.traffic_light,
              DISTRICT_ID: FROM_NODE_PROPS.district_id,
              DISTRICT_ID2: FROM_NODE_PROPS.district_id2,
              WKT: FROM_NODE_PROPS.wkt
        }
        LINK_PROPS.FROM_NODE_DATA_REPO = FROM_NODE_PROPS_FORM;
    }

    if (TO_NODE_PROPS) {
        const TO_NODE_PROPS_FORM = {
              NODE_ID: TO_NODE_PROPS.node_id,
              NODE_TYPE: TO_NODE_PROPS.node_type,
              NODE_NAME: TO_NODE_PROPS.node_name,
              TRAFFIC_LIGHT: TO_NODE_PROPS.traffic_light,
              DISTRICT_ID: TO_NODE_PROPS.district_id,
              DISTRICT_ID2: TO_NODE_PROPS.district_id2,
              WKT: TO_NODE_PROPS.wkt
        }
        LINK_PROPS.TO_NODE_DATA_REPO = TO_NODE_PROPS_FORM;
    }

    target.set("LINK_DATA_REPO", LINK_PROPS);
}

function pushSaveData(target) {
    // const {FROM_NODE_DATA_REPO, TO_NODE_DATA_REPO, geometry, featureType, ...LINK_DATA_REPO} = JSON.parse(JSON.stringify(target.getProperties()));
    setTimeout(() => {

        saveDataArchive.push(target.getId());
        saveDataArchive = Array.from(new Set(saveDataArchive));
        saveDataArchive = saveDataArchive.filter(v => {
            return source.getFeatureById(v) !== null;
        })

    }, 10)
}

function setGridData(target) {
    const {FROM_NODE_DATA_REPO, TO_NODE_DATA_REPO, ...LINK_DATA_REPO} = JSON.parse(JSON.stringify(target.get("LINK_DATA_REPO")));

    const LINK_GRID_DATA = getGridData(LINK_DATA_REPO, 'LINK')
    LINK_GRID_INSTANCE.resetData(LINK_GRID_DATA);

    const FROM_NODE_GRID_DATA = getGridData(FROM_NODE_DATA_REPO, 'FROM_NODE');
    FROM_NODE_GRID_INSTANCE.resetData(FROM_NODE_GRID_DATA);
    const TO_NODE_GRID_DATA = getGridData(TO_NODE_DATA_REPO, 'TO_NODE');
    TO_NODE_GRID_INSTANCE.resetData(TO_NODE_GRID_DATA);

    GRID_SET_LINK_ID = target.get("LINK_ID");
}

function getGridData(_data, _dataType) {
  // { name: 컬럼명, value: 값 }

  const columnNames = [];

  for (let key in _data) {
    columnNames.push(key.toUpperCase());
  }

  const dataMap = columnNames.filter(v => v !== 'USE_YN' && v !== 'GEOMETRY' && v !== 'FEATURETYPE' && v !== 'WKT' && v != 'FROM_NODE_DATA_REPO' && v != 'TO_NODE_DATA_REPO').map(v => {
    return {
      name: v,
      value: _data[v]
    }
  })

    return dataMap;
}

function applyData() {

    wktUpdate();

    const urlPrefix = `${common.API_PATH}/api`;

    const DATA_REPO = saveDataArchive.map(v => {
        const findFeature = source.getFeatureById(v);
        const findFeaturesProps = findFeature.getProperties();
        return findFeaturesProps;
    })

    console.log(saveDataArchive);
    console.log(DATA_REPO);

    // axios.post(`${urlPrefix}/saveData/${_dataType}`, sendData)
    axios.post(`${urlPrefix}/saveData`, DATA_REPO)
    .then(({ data }) => {

        if (DELETE_FEATURES_ID.length > 0) {
            DELETE_FEATURES_ID.forEach(v => deleteData(v, "LINK"));
        }

        if (data) {
            clearing();
            alert('저장되었습니다.');
            saveDataArchive = [];
        }

    })
    .catch(function (error) {
        console.log(error);
    });


}

function deleteData(_id, _dataType) {
  axios.post(`${common.API_PATH}/api/deleteData`, {
      id: _id,
      dataType: _dataType
    })
    .then(({ data }) => {

      if (data) {
        clearing();
      }

    })
    .catch(function (error) {
      console.log(error);
    });
}

//////////////////////////////

function getExtent() {
  return map.getView().calculateExtent();
}

function getSelectedFeaturesId() {
    return select ? select.getFeatures().getArray().map(v => v.getId()) : [];
}

function getZoomLevel() {
    return Math.round(map.getView().getZoom());
}

function makeTimeKey() {
  let today = new Date();
  let yyyy = String(today.getFullYear());
  let mm = today.getMonth() < 10 ? "0" + String(today.getMonth() + 1) : String(today.getMonth());
  let dd = today.getDate() < 10 ? "0" + String(today.getDate()) : String(today.getDate());
  let hh = today.getHours() < 10 ? "0" + String(today.getHours()) : String(today.getHours());
  let mi = today.getMinutes() < 10 ? "0" + String(today.getMinutes()) : String(today.getMinutes());
  let ss = today.getSeconds() < 10 ? "0" + String(today.getSeconds()) : String(today.getSeconds());

  return yyyy + mm + dd + hh + mi + ss;
}

function clearing() {
    LINK_GRID_INSTANCE.resetData([]);
    FROM_NODE_GRID_INSTANCE.resetData([]);
    TO_NODE_GRID_INSTANCE.resetData([]);

    let format = new WKT();
    let wkt;
    if (displayZoneFeature) {
        wkt = format.writeGeometry(displayZoneFeature.getGeometry());
    }

    tempNodeSource.clear();
    source.clear();

    displayZoneFeature = null;
    DELETE_FEATURES_ID = [];

    if (getZoomLevel() > 16) {
        let nowDisplayExtent = getExtent();
        let displayZonePolygon = fromExtent(nowDisplayExtent);
        displayZoneFeature = new Feature({
            geometry: displayZonePolygon
        })
    }

    if (getCheckValue().length === 0) {
        if (getZoomLevel() > 16) {
            getFeaturesByZone(wkt);
        }
    } else {
        getFeaturesByZone('');
    }

    select.getFeatures().clear();
    GRID_SET_LINK_ID = null;
}

function getCheckValue() {
    const chkList = document.querySelectorAll("input[name=sgg]:checked");
    const checkedValueArray = [];
    chkList.forEach(function (ch) {
        checkedValueArray.push(ch.value);
    });

    return checkedValueArray;
}

function wktUpdate() {
    const selectedFeatures = select.getFeatures();

    selectedFeatures.forEach(function(_f) {
        const wkt = new WKT();
        const NEW_LINK_WKT = wkt.writeGeometry(_f.getGeometry()).replace("(", " (").replace(",",", ");
        const NEW_FROM_NODE_WKT = wkt.writeGeometry(new Point(_f.getGeometry().getFirstCoordinate())).replace("(", " (").replace(",",", ");
        const NEW_TO_NODE_WKT = wkt.writeGeometry(new Point(_f.getGeometry().getLastCoordinate())).replace("(", " (").replace(",",", ");

        _f.set("WKT", NEW_LINK_WKT);

        const LINK_DATA_REPO = JSON.parse(JSON.stringify(_f.get("LINK_DATA_REPO")));
        const FROM_NODE_DATA_REPO = JSON.parse(JSON.stringify(LINK_DATA_REPO.FROM_NODE_DATA_REPO));
        const TO_NODE_DATA_REPO = JSON.parse(JSON.stringify(LINK_DATA_REPO.TO_NODE_DATA_REPO));

        LINK_DATA_REPO.WKT = NEW_LINK_WKT;
        FROM_NODE_DATA_REPO.WKT = NEW_FROM_NODE_WKT;
        TO_NODE_DATA_REPO.WKT = NEW_TO_NODE_WKT;

        LINK_DATA_REPO.FROM_NODE_DATA_REPO = FROM_NODE_DATA_REPO;
        LINK_DATA_REPO.TO_NODE_DATA_REPO = TO_NODE_DATA_REPO;

        _f.set("LINK_DATA_REPO", LINK_DATA_REPO);

    })
}

function allInteractionOff() {
    map.removeInteraction(draw);
    map.removeInteraction(modify);
}

function buttonStyleToggle(_dom) {
    const isOn = _dom.classList.contains('btn-primary');

    const allBtn = document.getElementsByClassName('control-btn');
    for (let i=0; i<allBtn.length; i++) {
        allBtn[i].classList.replace('btn-primary', 'btn-secondary');
    }

    if (isOn) {
        _dom.classList.replace('btn-primary', 'btn-secondary');
    } else {
        _dom.classList.replace('btn-secondary', 'btn-primary');
    }
}
