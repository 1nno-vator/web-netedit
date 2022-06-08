package com.web.netedit.api;

import com.web.netedit.entity.SessionEntity;
import com.web.netedit.repository.SessionRepository;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;
import javax.servlet.http.HttpSessionEvent;
import javax.servlet.http.HttpSessionListener;
import java.sql.Timestamp;
import java.util.Enumeration;
import java.util.Hashtable;
import java.util.Map;
import java.util.UUID;

@RestController
public class WebSessionListener implements HttpSessionListener {

    private static Hashtable<String, Object> loginSessionList = new Hashtable();

    private final SessionRepository sessionRepository;

    public WebSessionListener(SessionRepository sessionRepository) {
        this.sessionRepository = sessionRepository;
    }

    @RequestMapping(value = "/setSession", method = RequestMethod.POST)
    public String setSession(HttpServletRequest hsr) {
        HttpSession session = hsr.getSession();
        String _uuid = UUID.randomUUID().toString();
        session.setAttribute("uuid", _uuid);

        synchronized(loginSessionList){
            loginSessionList.put(_uuid, session); // key, value
        }

        Timestamp timestamp = new Timestamp(System.currentTimeMillis());

        SessionEntity sessionEntity = new SessionEntity();
        sessionEntity.setUUID(_uuid);
        sessionEntity.setSESSION_ID(session.getId());
        sessionEntity.setLAST_ACTIVE_TM(timestamp);
        sessionEntity.setACTIVE_YN("Y");


        sessionRepository.findDistinctBySESSION_SUFFIX();

        currentSessionList();

        return _uuid;
    }

    @RequestMapping(value = "/expireSession", method = RequestMethod.POST)
    public void expireSession(@RequestBody Map paramMap) {
        String _uuid = (String) paramMap.get("sessionUid");

        HttpSession session = null;
        synchronized(loginSessionList){
            session = (HttpSession) loginSessionList.get(_uuid);
        }

        if (session != null) {
            session.removeAttribute("uuid");
            session.invalidate();

            synchronized(loginSessionList){
                System.out.println("expire");
                loginSessionList.remove(_uuid);
            }

            currentSessionList();
        }

    }

    private void currentSessionList(){
        Enumeration elements = loginSessionList.elements();
        HttpSession session = null;

        System.out.println("Current Session List");
        System.out.println("------------------------------");
        /* 향상된for문을 사용하여 HashTable의 값을 출력 */
        for(Map.Entry<String, Object> e : loginSessionList.entrySet()) {
            System.out.println("Key : " + e.getKey() + ", Value : " + ((HttpSession) e.getValue()).getId());
        }
        System.out.println("------------------------------");
    }

    @Override
    public void sessionCreated(HttpSessionEvent se) {
        //
    }

    @Override
    public void sessionDestroyed(HttpSessionEvent se) {
        //
    }
}
