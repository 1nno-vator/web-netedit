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
import { platformModifierKeyOnly } from 'ol/events/condition';

// import BlueArrowImg from '../data/resize_blue_arrow.png';
// import NormalArrowImg from '../data/resize_normal_arrow.png';
import BlueArrowImg from '../data/resize_pink_arrow.png';
import NormalArrowImg from '../data/resize_yellow_arrow.png';

import UndoRedo from 'ol-ext/interaction/UndoRedo'
import { fromExtent } from 'ol/geom/Polygon';
import WKT from 'ol/format/WKT';
import Grid from "tui-grid";
import {Polygon} from "ol/geom";

// global value
let LINK_DATA = null;
let NODE_DATA = null;

let CIRCLE_RADIUS = 0.0000005;

let map = null;

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

  let styles = [
    // linestring
    new Style({
      stroke: new Stroke({
        color: selectedFeaturesId.includes(feature.getId()) ? '#FFB2F5' : '#FFE400',
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
let select, snap, modify, undoInteraction, draw, drawModify;
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

document.addEventListener('DOMContentLoaded', function() {
    initMap();
    initGrid();

    getSmInter();

    addSelectInteraction();
    addDrawBoxInteraction();
    addUndoInteraction();
    addModifyInteraction();
    addDrawInteraction();
    addSnapInteraction();

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

    Hotkeys('ctrl+q', function(event, handler) {
        // Prevent the default refresh event under WINDOWS system
        event.preventDefault()
    })

    Hotkeys('ctrl+w', function(event, handler) {
        // Prevent the default refresh event under WINDOWS system
        event.preventDefault()
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
        let target = null;

        map.forEachFeatureAtPixel(pixel, function(_f) {
            if (_f.get("featureType") === "LINK") {
                target = _f;
            }
        })

        if (target) {
            setNodeData(target);
            pushSaveData(target);
            setGridData(target);
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
        multi: true
    })

    let selectedFeatures = select.getFeatures();

    selectedFeatures.on('add', function(e) {
        selectedFeatures.forEach(function(value) {
            const target = value;
            if (target.get("featureType") === "LINK") {
                setNodeData(target);
                pushSaveData(target);
            }
        });
    })

    map.addInteraction(select);
}

function addModifyInteraction() {
    modify = new Modify({
        // features: select.getFeatures(),
        source: source,
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
        console.log('draw start');

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

                console.log(v);

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

        const FROM_COORDS_CIRCLE = new Circle(firstCoords, CIRCLE_RADIUS)
        const TO_COORDS_CIRCLE = new Circle(lastCoords, CIRCLE_RADIUS)

        const intersectFromNode = tempNodeSource.getFeaturesInExtent(FROM_COORDS_CIRCLE.getExtent());
        const intersectToNode = tempNodeSource.getFeaturesInExtent(TO_COORDS_CIRCLE.getExtent());

        let FROM_NODE_PROPS, TO_NODE_PROPS;

        if (intersectFromNode.length > 0 && intersectToNode.length > 0) { // 기노드 간 연결
            console.log('기존재 노드 간 연결')
            FROM_NODE_PROPS = intersectFromNode[0].getProperties();
            TO_NODE_PROPS = intersectToNode[0].getProperties();

            console.log(FROM_NODE_PROPS);
            console.log(TO_NODE_PROPS);
        } else if (intersectFromNode.length > 0 || intersectToNode.length > 0) {
            console.log('하나만 기존재 노드');

            const NODE_DATA_REPO_TEMPLATE = {
                DATA_TYPE: intersectToNode.length > 0 ? 'FROM' : 'TO',
                NODE_ID: intersectToNode.length > 0 ? "CFN" + makeTimeKey() : "CTN" + makeTimeKey(),
                NODE_TYPE: '',
                NODE_NAME: '',
                TRAFFIC_LIGHT: '',
                DISTRICT_ID: '',
                DISTRICT_ID2: ''
            }

            FROM_NODE_PROPS = intersectFromNode.length > 0 ? intersectFromNode[0].getProperties() : NODE_DATA_REPO_TEMPLATE;
            TO_NODE_PROPS = intersectToNode.length > 0 ? intersectToNode[0].getProperties() : NODE_DATA_REPO_TEMPLATE;

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
                DISTRICT_ID2: ''
            }

            TO_NODE_PROPS = {
                DATA_TYPE: 'TO',
                NODE_ID: "CTN" + makeTimeKey(),
                NODE_TYPE: '',
                NODE_NAME: '',
                TRAFFIC_LIGHT: '',
                DISTRICT_ID: '',
                DISTRICT_ID2: ''
            }

            console.log(FROM_NODE_PROPS);
            console.log(TO_NODE_PROPS);
        }

        drawFeature.set("FROM_NODE_DATA_REPO", FROM_NODE_PROPS);
        drawFeature.set("TO_NODE_DATA_REPO", TO_NODE_PROPS);
        const { FROM_NODE_DATA_REPO, TO_NODE_DATA_REPO, ...LINK_DATA_REPO } = JSON.parse(JSON.stringify(drawFeature.getProperties()));
        drawFeature.set("LINK_DATA_REPO", LINK_DATA_REPO);

        console.log(drawFeature.getProperties());
    })

    map.addInteraction(draw);
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
    setNodeData(_feature)
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

    const FROM_NODE_PROPS_FORM = {
          NODE_ID: FROM_NODE_PROPS.node_id,
          NODE_TYPE: FROM_NODE_PROPS.node_type,
          NODE_NAME: FROM_NODE_PROPS.node_name,
          TRAFFIC_LIGHT: FROM_NODE_PROPS.traffic_light,
          DISTRICT_ID: FROM_NODE_PROPS.district_id,
          DISTRICT_ID2: FROM_NODE_PROPS.district_id2,
          WKT: FROM_NODE_PROPS.wkt
    }

    const TO_NODE_PROPS_FORM = {
          NODE_ID: TO_NODE_PROPS.node_id,
          NODE_TYPE: TO_NODE_PROPS.node_type,
          NODE_NAME: TO_NODE_PROPS.node_name,
          TRAFFIC_LIGHT: TO_NODE_PROPS.traffic_light,
          DISTRICT_ID: TO_NODE_PROPS.district_id,
          DISTRICT_ID2: TO_NODE_PROPS.district_id2,
          WKT: TO_NODE_PROPS.wkt
    }

    LINK_PROPS.FROM_NODE_DATA_REPO = FROM_NODE_PROPS_FORM;
    LINK_PROPS.TO_NODE_DATA_REPO = TO_NODE_PROPS_FORM;

    target.set("LINK_DATA_REPO", LINK_PROPS);
}

function pushSaveData(target) {
    // const {FROM_NODE_DATA_REPO, TO_NODE_DATA_REPO, geometry, featureType, ...LINK_DATA_REPO} = JSON.parse(JSON.stringify(target.getProperties()));
    saveDataArchive.push(target.getId());
    saveDataArchive = Array.from(new Set(saveDataArchive));
}

function setGridData(target) {
    const {FROM_NODE_DATA_REPO, TO_NODE_DATA_REPO, ...LINK_DATA_REPO} = JSON.parse(JSON.stringify(target.get("LINK_DATA_REPO")));

    const LINK_GRID_DATA = getGridData(LINK_DATA_REPO, 'LINK')
    LINK_GRID_INSTANCE.resetData(LINK_GRID_DATA);

    const FROM_NODE_GRID_DATA = getGridData(FROM_NODE_DATA_REPO, 'FROM_NODE');
    FROM_NODE_GRID_INSTANCE.resetData(FROM_NODE_GRID_DATA);
    const TO_NODE_GRID_DATA = getGridData(TO_NODE_DATA_REPO, 'TO_NODE');
    TO_NODE_GRID_INSTANCE.resetData(TO_NODE_GRID_DATA);
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

    // axios.post(`${urlPrefix}/saveData/${_dataType}`, sendData)
    axios.post(`${urlPrefix}/saveData`, DATA_REPO)
    .then(({ data }) => {

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

    source.clear();

    displayZoneFeature = null;

    if (getZoomLevel() > 16) {
        let nowDisplayExtent = getExtent();
        let displayZonePolygon = fromExtent(nowDisplayExtent);
        displayZoneFeature = new Feature({
            geometry: displayZonePolygon
        })
    }

    if (getCheckValue().length === 0) {
        getFeaturesByZone(wkt);
    } else {
        getFeaturesByZone('');
    }

    select.getFeatures().clear();
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

        const LINK_DATA_REPO = _f.get("LINK_DATA_REPO");
        const FROM_NODE_DATA_REPO = LINK_DATA_REPO.FROM_NODE_DATA_REPO;
        const TO_NODE_DATA_REPO = LINK_DATA_REPO.TO_NODE_DATA_REPO;

        LINK_DATA_REPO.WKT = NEW_LINK_WKT;
        FROM_NODE_DATA_REPO.WKT = NEW_FROM_NODE_WKT;
        TO_NODE_DATA_REPO.WKT = NEW_TO_NODE_WKT;

        _f.set("LINK_DATA_REPO", LINK_DATA_REPO);
        _f.set("FROM_NODE_DATA_REPO", FROM_NODE_DATA_REPO);
        _f.set("TO_NODE_DATA_REPO", TO_NODE_DATA_REPO);
    })
}
