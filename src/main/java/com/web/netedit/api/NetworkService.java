package com.web.netedit.api;

import com.web.netedit.entity.LinkEntity;
import com.web.netedit.entity.NodeEntity;
import com.web.netedit.repository.LinkRepository;
import com.web.netedit.repository.NodeRepository;
import com.web.netedit.util.NetworkUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class NetworkService {

    private final NetworkDAO networkDAO;

    private final LinkRepository linkRepository;
    private final NodeRepository nodeRepository;

    @Autowired
    public NetworkService(NetworkDAO networkDAO, LinkRepository linkRepository, NodeRepository nodeRepository) {
        this.networkDAO = networkDAO;
        this.linkRepository = linkRepository;
        this.nodeRepository = nodeRepository;
    }

    public List<Map<String, Object>> connectionTest() {
        return networkDAO.connectionTest();
    }

    public List<Map<String, Object>> getLink() {
        return networkDAO.getLink();
    }

    public List<Map<String, Object>> getLinkByZone(String wkt, String sggCode) {
        Map<String, Object> map = new HashMap<>();
        System.out.println(wkt);
        map.put("WKT", wkt);
        map.put("SGG_CODE", sggCode);
        return networkDAO.getLinkByZone(map);
    }

    public List<Map<String, Object>> getNode(String _fromNode, String _toNode) {
        Map<String, Object> map = new HashMap<>();
        System.out.println(_fromNode);
        map.put("FROM_NODE", _fromNode);
        System.out.println(_toNode);
        map.put("TO_NODE", _toNode);
        return networkDAO.getNode(map);
    }

    public List<Map<String, Object>> getRcline(String wkt) {
        Map<String, Object> map = new HashMap<>();
        map.put("WKT", wkt);
        return networkDAO.getRcline(map);
    }

    public List<Map<String, Object>> getTurn() {
        return networkDAO.getTurn();
    }

    public LinkEntity controlLinkData(Map<String, Object> _linkDataRepo) {
        NetworkUtil util = new NetworkUtil();

        LinkEntity newLinkEntity = new LinkEntity();
        newLinkEntity = (LinkEntity) util.convertMapToObject(_linkDataRepo, newLinkEntity);

        Optional<LinkEntity> originLinkEntity = linkRepository.findById((String) _linkDataRepo.get("LINK_ID"));

        if (originLinkEntity.isPresent()) {
            originLinkEntity.get().setAll(newLinkEntity);
            linkRepository.save(originLinkEntity.get());
            return originLinkEntity.get();
        } else {
            linkRepository.save(newLinkEntity);
            return newLinkEntity;
        }

    }

    public NodeEntity controlNodeData(Map<String, Object> _nodeDataRepo) {
        NetworkUtil util = new NetworkUtil();

        NodeEntity newNodeEntity = new NodeEntity();
        newNodeEntity = (NodeEntity) util.convertMapToObject(_nodeDataRepo, newNodeEntity);

        Optional<NodeEntity> originNodeEntity = nodeRepository.findById((String) _nodeDataRepo.get("NODE_ID"));

        if (originNodeEntity.isPresent()) {
            originNodeEntity.get().setAll(newNodeEntity);
            nodeRepository.save(originNodeEntity.get());
            return originNodeEntity.get();
        } else {
            nodeRepository.save(newNodeEntity);
            return newNodeEntity;
        }
    }

    public List<NodeEntity> getNodeGroup(List<String> nodes) {
        List<NodeEntity> nodeEntityList = new ArrayList<>();

        for (String node : nodes) {
            System.out.println(node);
            Optional<NodeEntity> nodeEntity = nodeRepository.findById(node);
            if (nodeEntity.isPresent()) {
                nodeEntityList.add(nodeEntity.get());
            }
        }

        return nodeEntityList;
    }
}