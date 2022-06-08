package com.web.netedit.repository;

import com.web.netedit.entity.SessionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SessionRepository extends JpaRepository<SessionEntity, String> {

    List<String> findDistinctBySESSION_SUFFIX();

}
