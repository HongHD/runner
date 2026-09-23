# 🎹 스피드 피아노 게임 구현 가이드

## 📋 개요

스피드 피아노는 관리자 화면에서 무작위로 나온 음들을 사용자들이 가장 빠르고 정확하게 피아노 건반에서 누르는 속도를 겨루는 게임입니다.

### 주요 특징
- **점진적 난이도 증가**: 레벨 1부터 10까지, 각 레벨마다 3개~10개의 음을 무작위로 선택
- **실시간 점수 계산**: 정확도(100점) + 속도 보너스(최대 50점)
- **음색 구분**: 낮은 도(파란색) ~ 높은 도(빨간색)까지 각 음마다 일관된 색상
- **5초 타이밍**: 각 레벨마다 5초의 시간 제한

---

## 🎯 게임 규칙

### 관리자 화면 (HostSpeedPiano.jsx)
1. **게임 시작**: "시작" 버튼을 클릭하여 게임 개시
2. **음 표시**: 현재 레벨의 음들이 화면에 표시됨 (예: 도 미 솔)
3. **다음 레벨 진행**: 5초 후 자동으로 다음 레벨로 전환, 또는 "다음 레벨" 버튼으로 수동 진행
4. **실시간 점수 갱신**: 플레이어들의 정확도, 속도, 점수가 실시간으로 업데이트됨
5. **게임 종료**: "종료" 버튼을 클릭하여 게임을 중단하고 최종 점수 집계

### 플레이어 화면 (PlaySpeedPiano.jsx)
1. **음 시퀀스 순서 입력**: 현재 음을 가장 윗부분에 크게 표시
2. **건반 클릭**: 도레미파솔라시도 건반을 해당 순서대로 클릭
3. **정확도 반영**: 
   - 올바른 음: 100점 + 속도 보너스
   - 잘못된 음: -10점
4. **속도 표시**: 초당 몇 개의 음을 정확히 눌렀는지 실시간 표시
5. **순위 확인**: 게임 종료 후 최종 순위 및 점수 확인

---

## 🎨 색상 체계

각 음은 고정된 색상으로 표시됩니다:

| 음 | 한글 | 색상 | HEX코드 |
|----|------|------|---------|
| C | 도 | 파란색 | #3B82F6 |
| D | 레 | 보라색 | #7C3AED |
| E | 미 | 핑크색 | #EC4899 |
| F | 파 | 주황색 | #F59E0B |
| G | 솔 | 초록색 | #10B981 |
| A | 라 | 하늘색 | #0EA5E9 |
| B | 시 | 인디고색 | #6366F1 |
| C_HIGH | 도 (높음) | 빨간색 | #EF4444 |

---

## 📁 구현된 파일

### 프론트엔드 (Client)

#### 1. `client/src/pages/admin/HostSpeedPiano.jsx`
**역할**: 관리자 게임 호스팅 화면
- 현재 레벨 및 음 표시
- 실시간 참가자 점수 목록
- "시작", "다음 레벨", "종료" 버튼 제어
- 필터링 기능 (전체, 완료, 미완료)

**주요 기능**:
```javascript
// 레벨별 음 생성
const generateNotesForLevel = (level) => {
    const count = Math.min(level + 2, 10); // 레벨 1=3개, ..., 레벨 10=10개
    // 무작위 선택 로직
}

// 소켓 이벤트 발송
socket.emit('admin_speed_piano_level', { pinCode, level, notes, gameId })
socket.emit('admin_speed_piano_end', { pinCode })
```

#### 2. `client/src/pages/play/PlaySpeedPiano.jsx`
**역할**: 플레이어 게임 플레이 화면
- 현재 음 큰 표시
- 8개 피아노 건반 UI
- 정확도, 속도, 시도 횟수 실시간 표시
- 게임 종료 시 최종 점수

**주요 기능**:
```javascript
// 건반 클릭 처리
const handlePianoKeyClick = (key) => {
    // 정확도 판단
    const isCorrect = nextNote === key;
    
    // 점수 계산
    const scoreGained = calculateScore(true, elapsedMs);
    
    // 서버 업데이트
    socket.emit('player_speed_piano_note', { ... })
}

// 점수 계산 함수
const calculateScore = (isCorrect, elapsedTime) => {
    if (!isCorrect) return 0;
    let accuracyScore = 100;
    let speedBonus = Math.max(0, 50 - (elapsedTime / 100));
    return Math.round(accuracyScore + speedBonus);
}
```

#### 3. `client/src/App.jsx`
**변경 사항**:
- `HostSpeedPiano` 임포트 추가
- `PlaySpeedPiano` 임포트 추가
- 라우트 추가:
  - `/admin/game/speed_piano/:id/play` → HostSpeedPiano
  - `/play/speed-piano` → PlaySpeedPiano

#### 4. `client/src/pages/admin/GameManagement.jsx`
**변경 사항**:
- 스피드 피아노 게임 클릭 시 라우팅:
  ```javascript
  } else if (game.id === 'g4') {
      navigate('/admin/game/speed-piano/1/play');
  }
  ```

#### 5. `client/src/pages/play/PlayGame.jsx`
**변경 사항**:
- `speed_piano` 게임 타입 감지:
  ```javascript
  if (type === 'speed_piano') return 'speed_piano_waiting';
  } else if (type === 'speed_piano') {
      setPlayerState('speed_piano_waiting');
  }
  ```
- `speed_piano_level` 소켓 이벤트 리스너 추가

### 백엔드 (Server)

#### 1. `server/socket/index.js`
**변경 사항**:

##### 맵 추가 (줄 ~27):
```javascript
// Speed Piano 맵
const speedPianoSessionMap = new Map(); // sessionId → { level, currentNotes, startTime }
const speedPianoScoreMap = new Map(); // sessionId → Map{ participantId → {...} }
```

##### 3개의 새로운 소켓 이벤트 핸들러 추가:

**1) admin_speed_piano_level** (관리자 → 서버 → 플레이어)
- 레벨별 음 정보를 플레이어들에게 브로드캐스트

**2) player_speed_piano_note** (플레이어 → 서버)
- 플레이어의 음 입력 처리
- 정확도, 속도, 점수 계산 및 저장
- 관리자에게 실시간 업데이트 전송

**3) admin_speed_piano_end** (관리자 → 서버)
- 게임 종료 처리
- 최종 순위 계산 및 저장
- 관리자/플레이어에게 최종 순위 전송

---

## 🔌 소켓 이벤트 플로우

### 게임 시작 ~ 레벨 진행
```
관리자 "시작" 클릭
    ↓
admin_start_game 발생
    ↓
displayLevel(1) 호출
    ↓
admin_speed_piano_level 이벤트 발송
    ↓
플레이어들이 speed_piano_level 수신 → PlaySpeedPiano 화면으로 이동
```

### 플레이어 건반 입력
```
플레이어 건반 클릭
    ↓
handlePianoKeyClick() 호출
    ↓
player_speed_piano_note 이벤트 발송
    ↓
서버: 정확도/속도/점수 계산
    ↓
admin_speed_piano_update 이벤트로 관리자 화면 실시간 업데이트
```

### 게임 종료 및 점수 집계
```
관리자 "종료" 버튼 클릭
    ↓
admin_speed_piano_end 이벤트 발송
    ↓
서버: 최종 순위 계산 및 DB 저장
    ↓
admin_ranking_data / player_ranking_data 이벤트 발송
    ↓
관리자/플레이어 최종 순위 화면 표시
```

---

## 💾 데이터 구조

### 플레이어 점수 데이터 (speedPianoScoreMap)
```javascript
{
  participantId: {
    correctCount: 15,        // 정확하게 누른 음 개수
    totalAttempts: 18,       // 총 시도 횟수
    speed: 2.5,             // 초당 정확한 클릭 수
    score: 1850             // 최종 점수 (100 + 보너스) * 정확한 개수
  }
}
```

### Participant DB 저장 필드
```javascript
{
  id: 123,
  nickname: "사용자명",
  session_id: 456,
  score: 1850,              // 최종 점수
  rank: 1,                  // 순위
  team: "A팀",
  joined_at: "2024-01-01...",
  socket_id: "socket_id..."
}
```

---

## 🚀 테스트 방법

### 1. 관리자 화면 접속
```
1. /admin/games 이동
2. "스피드 피아노" 카드 클릭
3. 게임 호스팅 화면으로 이동
```

### 2. 플레이어 참가
```
1. 별도 브라우저 또는 탭에서 /play 접속
2. PIN 코드 입력 (관리자 화면 상단 참고)
3. 닉네임 입력 후 로비 진입
```

### 3. 게임 플레이
```
1. 관리자: "시작" 버튼 클릭
2. 플레이어: 나타난 음들을 건반에서 순서대로 클릭
3. 관리자: "다음 레벨" 버튼으로 레벨 진행
4. 관리자: "종료" 버튼으로 게임 종료 및 점수 집계
```

---

## 🐛 주요 구현 포인트

### 1. 음색 일관성
- 모든 음은 `NOTE_INFO` 객체에서 색상 정의
- 관리자/플레이어 화면 모두 동일한 색상 사용

### 2. 점수 계산 로직
- **정확도 점수**: 항상 100점 (정확할 때만 부여)
- **속도 보너스**: `Math.max(0, 50 - (elapsedMs / 100))`
- **오답 페널티**: -10점

### 3. 레벨 난이도
- 레벨 N = N + 2개 음 (레벨 1 = 3개, 레벨 2 = 4개, ..., 레벨 10 = 10개)
- 최대 10개 음까지 제한

### 4. 5초 자동 진행
- `setTimeout(() => { displayLevel(currentLevel + 1) }, 5000)`
- 관리자가 "다음 레벨" 버튼으로 수동 진행 가능

### 5. 실시간 동기화
- 플레이어의 모든 입력은 즉시 서버로 전송
- 서버가 점수 계산 후 관리자에게 브로드캐스트

---

## 📝 추가 기능 (선택사항)

### 추후 개선 아이디어
1. 음악 파일 재생 (각 음 클릭 시 소리 출력)
2. 난이도 선택 (쉬움/보통/어려움)
3. 제한 시간 내 최대한 많은 음 누르기 모드
4. 멀티플레이 대결 (1:1 대시보드)
5. 리플레이 기능 (기록된 음 순서 자동 재생)

---

## ✅ 체크리스트

- [x] 관리자 호스팅 화면 (HostSpeedPiano.jsx)
- [x] 플레이어 게임 화면 (PlaySpeedPiano.jsx)
- [x] 소켓 이벤트 핸들러 (3개)
- [x] 점수 계산 로직
- [x] 색상 체계 일관화
- [x] 라우트 추가 (App.jsx)
- [x] GameManagement 연결
- [x] PlayGame 리다이렉트 로직
- [x] 음 생성 알고리즘 (무작위)
- [x] 실시간 업데이트 UI

---

## 🎓 관련 파일 요약

| 파일 | 역할 | 수정 사항 |
|------|------|---------|
| HostSpeedPiano.jsx | 관리자 화면 | 신규 생성 |
| PlaySpeedPiano.jsx | 플레이어 화면 | 신규 생성 |
| App.jsx | 라우트 설정 | import + 라우트 추가 |
| GameManagement.jsx | 게임 선택 화면 | 클릭 핸들러 추가 |
| PlayGame.jsx | 플레이어 진입점 | 타입 감지 + 리다이렉트 |
| index.js (socket) | 소켓 서버 | 3개 이벤트 핸들러 추가 |

---

**작성일**: 2026.04.08  
**버전**: 1.0  
**상태**: 완성됨 ✓
