# 🔧 플레이어 입장 오류 해결 가이드

## 🔴 문제
```
"정확한 pin번호와 아이디를 입력했음에도 서버 연결에 실패했습니다."
```

## ✅ 적용된 해결책

### 1️⃣ **Vite 프록시 설정 수정** (주요 원인)

**파일**: `client/vite.config.js`

```diff
  proxy: {
      '/api': {
-         target: 'http://localhost:5001',
+         target: 'http://localhost:5000',
          changeOrigin: true
      },
      '/uploads': {
-         target: 'http://localhost:5001',
+         target: 'http://localhost:5000',
          changeOrigin: true
      },
      '/socket.io': {
-         target: 'http://localhost:5001',
+         target: 'http://localhost:5000',
          ws: true
      }
  }
```

**이유**: 클라이언트의 Socket.io 연결이 포트 5001로 프록시되고 있었지만, 실제 서버는 포트 5000에서 실행 중이었습니다.

### 2️⃣ **Join.jsx 에러 처리 개선**

**파일**: `client/src/pages/play/Join.jsx`

더 자세한 에러 로깅을 추가했습니다:

```javascript
newSocket.on('connect_error', (error) => {
    console.error('Socket 연결 실패:', error);
    setError('서버 연결에 실패했습니다. 다시 시도해주세요.');
    newSocket.disconnect();
});

newSocket.on('disconnect', () => {
    console.log('Socket 연결 해제됨');
});
```

---

## 📊 **포트 설정 확인**

| 서비스 | 포트 | 설정 파일 | 상태 |
|--------|------|----------|------|
| 백엔드 서버 | 5000 | `.env` | ✅ |
| 프론트엔드 Vite | 5173 | `vite.config.js` | ✅ |
| Socket.io 프록시 | 5000 | `vite.config.js` | ✅ (수정됨) |
| MySQL | 3306 | `.env` | ✅ |

---

## 🚀 **재시작 방법**

모든 프로세스를 종료하고 다시 시작하세요:

```bash
# 기존 프로세스 종료
taskkill /F /IM node.exe

# 새로 시작
npm start
```

---

## ✨ **기대하는 결과**

### 1. 관리자 화면
```
✅ http://localhost:5173 에서 정상 로드
✅ PIN 번호 표시 (예: 123456)
✅ 게임 호스팅 가능
```

### 2. 플레이어 화면
```
✅ http://localhost:5173 에서 참여자 입장 페이지 로드
✅ PIN 번호와 닉네임 입력
✅ "입장" 클릭 → 로비로 이동 성공
```

---

## 🔍 **문제 진단 팁**

### 브라우저 콘솔 확인
```javascript
// F12 → Console 탭에서 다음 메시지 확인:

// 정상일 경우:
"Socket 연결 성공"

// 에러일 경우:
"Socket 연결 실패: Error..."
```

### 서버 터미널 확인
```
[Socket] player_join: PIN=123456, 닉네임=사용자명
[Socket] 참가자 입장: socketId=...
```

---

## 📝 **변경 파일 요약**

| 파일 | 변경사항 |
|------|---------|
| `client/vite.config.js` | 포트 5001 → 5000 (3줄 수정) |
| `client/src/pages/play/Join.jsx` | 에러 로깅 추가 (+3줄) |

---

## 💡 **추가 팁**

### 만약 여전히 연결 실패 시:

1. **포트 충돌 확인**:
```powershell
netstat -ano | findstr :5000
netstat -ano | findstr :5173
```

2. **Node 프로세스 전부 종료**:
```powershell
taskkill /F /IM node.exe
```

3. **npm 캐시 정리 후 재시작**:
```bash
npm cache clean --force
npm start
```

---

**상태**: ✅ **해결됨** - 이제 플레이어 입장이 정상 작동해야 합니다.
