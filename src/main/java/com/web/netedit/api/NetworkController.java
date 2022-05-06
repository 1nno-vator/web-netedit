package com.web.netedit.api;

import com.web.netedit.entity.LinkEntity;
import com.web.netedit.entity.NodeEntity;
import com.web.netedit.repository.LinkRepository;
import com.web.netedit.util.NetworkUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping(value = "/api")
public class NetworkController {

    private final NetworkService networkService;

    private final LinkRepository linkRepository;

    @Autowired
    public NetworkController(NetworkService networkService, LinkRepository linkRepository) {
        this.networkService = networkService;
        this.linkRepository = linkRepository;
    }

    @RequestMapping(value = "/connectionTest")
    public List<Map<String, Object>> connectionTest() {
        return networkService.connectionTest();
    }

    @RequestMapping(value = "/link", method = RequestMethod.GET)
    public List<Map<String, Object>> getLink() {
        // get All Link
        return networkService.getLink();
    }

    @RequestMapping(value = "/linkByZone", method = RequestMethod.POST)
    public List<Map<String, Object>> getLinkByZone(@RequestBody Map paramMap) {
        String wkt = (String) paramMap.get("wkt");
        String sggCode = (String) paramMap.get("sggCode");
        return networkService.getLinkByZone(wkt, sggCode);
    }

    @RequestMapping(value = "/getRcline", method = RequestMethod.POST)
    public List<Map<String, Object>> getRcline(@RequestBody Map paramMap) {
        String wkt = (String) paramMap.get("wkt");
        return networkService.getRcline(wkt);
    }

    @RequestMapping(value = "/node", method = RequestMethod.POST)
    public List<Map<String, Object>> getNode(@RequestBody Map paramMap) {
        String fromNode = (String) paramMap.get("fromNode");
        String toNode = (String) paramMap.get("toNode");
        return networkService.getNode(fromNode, toNode);
    }

    @RequestMapping(value = "/turn", method = RequestMethod.GET)
    public List<Map<String, Object>> getTurn() {
        return networkService.getTurn();
    }

    @RequestMapping(value = "/saveData", method = RequestMethod.POST)
    public Map<String, Object> saveData(@RequestBody List<Map<String, Object>> paramMapList) {

        List<LinkEntity> linkEntityList = new ArrayList<>();
        List<NodeEntity> fromNodeEntityList = new ArrayList<>();
        List<NodeEntity> toNodeEntityList = new ArrayList<>();

        for (Map<String, Object> map : paramMapList) {

            Map<String, Object> linkDataRepo = (Map<String, Object>) map.get("LINK_DATA_REPO");
            LinkEntity linkEntity = networkService.controlLinkData(linkDataRepo);
            linkEntityList.add(linkEntity);

            Map<String, Object> fromNodeDataRepo = (Map<String, Object>) linkDataRepo.get("FROM_NODE_DATA_REPO");
            NodeEntity fromNodeEntity = networkService.controlNodeData(fromNodeDataRepo);
            fromNodeEntityList.add(fromNodeEntity);

            Map<String, Object> toNodeDataRepo = (Map<String, Object>) linkDataRepo.get("TO_NODE_DATA_REPO");
            NodeEntity toNodeEntity = networkService.controlNodeData(toNodeDataRepo);
            toNodeEntityList.add(toNodeEntity);

        }

        Map<String, Object> resultMap = new HashMap<>();
        resultMap.put("LINK_ENTITY_LIST", linkEntityList);
        resultMap.put("FROM_NODE_ENTITY_LIST", fromNodeEntityList);
        resultMap.put("TO_NODE_ENTITY_LIST", toNodeEntityList);
        return resultMap;
    }

    @RequestMapping(value = "/saveData/{dataType}", method = RequestMethod.POST)
    public List<Map<String, Object>> saveData(@RequestBody Map paramMap, @PathVariable(value = "dataType") String dataType) {
        System.out.println(paramMap);
        System.out.println(dataType);
        List<Map<String, Object>> result = new ArrayList<>();
        return result;
    }

    @RequestMapping(value = "/getNodeGroup", method = RequestMethod.POST)
    public List<NodeEntity> nodeGroup(@RequestBody Map paramMap) {
        List<String> nodes = (List<String>) paramMap.get("nodes");
        List<NodeEntity> list = networkService.getNodeGroup(nodes);

        return list;
    }

}
