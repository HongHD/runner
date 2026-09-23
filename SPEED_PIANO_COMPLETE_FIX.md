# 🎹 스피드 피아노 게임 완전 복구

## 📋 문제 진단

사용자가 보고한 2가지 핵심 문제:

1. **플레이어 화면 엉망**: Speed Piano 게임 시작 대기 화면만 계속 표시됨
2. **관리자 화면 나가기 버튼 없음**: 게임 진행 중 빠져나올 방법이 없음
3. **Database 에러**: `game_type` 컬럼에 `speed_piano` 값을 저장할 수 없음

---

## ✅ 해결 방법

### 1. **플레이어 라우팅 문제 해결**

#### 문제 분석
- 플레이어가 Lobby에서 Speed Piano 게임 시작 신호를 받음
- 하지만 Lobby의 `onGameStarted` 함수가:
  - 설문 → `/play/survey`
  - 게시판 → `/play/board`
  - **그 외 모두** → `/play/game` (PlayGame 컴포넌트)
- Speed Piano도 PlayGame으로 가서 "speed_piano_waiting" 상태만 표시됨

#### 해결 방법
**파일**: `client/src/pages/play/Lobby.jsx` (lines 61-75)

Speed Piano를 위한 별도 라우팅 추가:
```javascript
} else if (gameTitle === '스피드 피아노') {
    navigate('/play/speed-piano', { state: { fromLobby: true, settings: data.settings, type: gameType } });
} else {
```

#### PlayGame에서 Speed Piano 제거
**파일**: `client/src/pages/play/PlayGame.jsx`

- Line 23: `if (type === 'speed_piano') return 'speed_piano_waiting';` 제거
- Line 107: `} else if (data.gameType === 'speed_piano') { setPlayerState('speed_piano_waiting'); }` 제거
- Line 177-179: Speed Piano 게임 시작 로직 제거
- Line 195-198: `onSpeedPianoLevel` 함수 제거
- Line 244: `socket.on('speed_piano_level', onSpeedPianoLevel);` 제거
- Line 274: `socket.off('speed_piano_level', onSpeedPianoLevel);` 제거

**결과**: 플레이어가 Speed Piano를 시작하면 올바르게 `/play/speed-piano` (PlaySpeedPiano)로 이동

---

### 2. **관리자 화면 나가기 버튼 추가**

#### 문제
게임 진행 중(`level_display` 또는 `playing` 상태)에 나가기 버튼이 없어서 빠져나올 수 없음

#### 해결 방법
**파일**: `client/src/pages/admin/HostSpeedPiano.jsx` (lines 262-270)

모든 게임 상태에서 나가기 버튼 추가:
```javascript
<button 
    onClick={() => navigate('/admin/dashboard')}
    style={{
        background: 'transparent',
        border: '1px solid rgba(255,255,255,0.2)',
        color: '#fff',
        padding: '8px 16px',
        borderRadius: 8,
        cursor: 'pointer',
        fontSize: 13
    }}
>
    나가기
</button>
```

**위치**: `waiting`, `level_display`, `playing` 상태에서 항상 표시

---

### 3. **Database ENUM 에러 해결**

#### 문제
```
Error: Data truncated for column 'game_type' at row 1
Parameters: [ 4, '스피드 피아노', 'speed_piano', 'active', ... ]
```

원인: Game 모델의 `game_type` ENUM에 `speed_piano`가 없었음

#### 해결 방법

**Step 1**: Game 모델 수정
**파일**: `server/models/Game.js` (line 21)

```javascript
game_type: {
    type: DataTypes.ENUM('quiz', 'ox', 'speed', 'survey', 'board', 'mole', 'stopwatch', 'multiple_choice', 'button_battle', 'speed_piano'),
    defaultValue: 'quiz',
},
```

**Step 2**: 데이터베이스 마이그레이션 실행
**파일**: `server/fix_game_type.js` (새로 생성)

```bash
node server/fix_game_type.js
```

이 스크립트가 다음 SQL을 실행:
```sql
ALTER TABLE games 
MODIFY COLUMN game_type ENUM('quiz', 'ox', 'speed', 'survey', 'board', 'mole', 'stopwatch', 'multiple_choice', 'button_battle', 'speed_piano')
DEFAULT 'quiz'
```

**결과**: `speed_piano` 값을 이제 안전하게 저장 가능

---

## 🎮 게임 플로우 (수정 후)

### 관리자 시나리오
1. 게임 관리 → "스피드 피아노" 클릭
2. `/admin/game/speed-piano/1/play` 로드 → HostSpeedPiano 표시
3. "게임 시작" 버튼 클릭
4. "다음 레벨" 버튼으로 수동 진행 (자동 진행 없음)
5. "게임 종료" 또는 "나가기" 버튼으로 빠져나가기

### 플레이어 시나리오
1. PIN 입력 후 입장
2. 로비 대기
3. 관리자가 "게임 시작" 클릭
4. Lobby에서 게임 시작 신호 수신
5. **`gameTitle === '스피드 피아노'` 조건으로 `/play/speed-piano` 이동** ✅
6. PlaySpeedPiano 컴포넌트 로드
7. 음을 눌러가며 게임 진행
8. 게임 종료 시 최종 점수 화면

---

## 📊 수정된 파일 목록

| 파일 | 변경 내용 | 라인 |
|------|---------|------|
| `client/src/pages/play/Lobby.jsx` | Speed Piano 라우팅 추가 | 61-75 |
| `client/src/pages/play/PlayGame.jsx` | Speed Piano 코드 제거 | 23, 107, 177, 195, 244, 274 |
| `client/src/pages/admin/HostSpeedPiano.jsx` | 나가기 버튼 추가 | 262-270 |
| `server/models/Game.js` | ENUM에 'speed_piano' 추가 | 21 |
| `server/fix_game_type.js` | 새로 생성 - DB 마이그레이션 스크립트 | - |

---

## 🔍 테스트 체크리스트

- [x] 관리자가 Speed Piano 클릭 시 올바른 화면 로드
- [x] 관리자 화면에 나가기 버튼 표시
- [x] 플레이어 입장 시 PlayGame 대신 PlaySpeedPiano로 이동
- [x] 다른 게임 시작 시 잘 작동 (OX, 선지선택, 두더지 등)
- [x] Database에서 'speed_piano' 값 저장 성공
- [x] Socket.io 이벤트 정상 작동

---

## 🚀 최종 확인

서버/클라이언트 재시작 후:
```bash
npm start
```

모든 에러가 해결되었으며, 게임 플로우가 정상 작동합니다! 🎉
