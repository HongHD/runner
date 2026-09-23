# 🔧 포트 충돌 해결 가이드

## 문제
```
Error: listen EADDRINUSE: address already in use :::5001
```

이 에러는 포트 5001이 이미 다른 프로세스에서 사용 중일 때 발생합니다.

---

## ✅ 적용된 해결책

### 1. 포트 설정 변경
**파일**: `server/.env`

```diff
- PORT=5001
+ PORT=5000
```

변경사항: 포트를 5001에서 5000으로 변경했습니다.

### 2. 에러 처리 개선
**파일**: `server/index.js`

포트 충돌 발생 시 명확한 에러 메시지와 해결 방법을 제시하는 핸들러를 추가했습니다.

```javascript
server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`\n❌ 에러: 포트 ${PORT}가 이미 사용 중입니다.`);
        console.error(`💡 해결방법:`);
        console.error(`   1. 터미널에서: netstat -ano | findstr :${PORT}`);
        console.error(`   2. PID를 확인 후: taskkill /PID <PID> /F`);
        console.error(`   3. 또는 .env 파일의 PORT 값을 변경하세요.\n`);
    }
    process.exit(1);
});
```

### 3. 프로세스 종료
이전에 포트 5001을 사용 중이던 프로세스(PID 10432)를 종료했습니다.

```powershell
taskkill /PID 10432 /F
```

---

## 🚀 다시 실행하기

이제 다음 명령어로 정상 실행됩니다:

```bash
npm start
```

---

## 📋 포트 충돌 발생 시 대응 방법

### 방법 1: 포트 사용 중인 프로세스 종료

1. **포트를 사용 중인 프로세스 찾기**:
```powershell
netstat -ano | findstr :5000
```

2. **출력된 PID로 프로세스 종료**:
```powershell
taskkill /PID <PID> /F
```

### 방법 2: 포트 번호 변경

1. `server/.env` 파일 열기
2. `PORT` 값 변경 (예: 5000 → 5002)
3. 서버 재시작

---

## ✨ 개선된 기능

- ✅ 포트 충돌 시 명확한 에러 메시지 제공
- ✅ 해결 방법을 에러 메시지에 포함
- ✅ 포트 5000으로 변경하여 기본 설정과 일치
- ✅ 프로세스 종료로 즉시 실행 가능

---

**해결 완료**: ✅ 서버 시작 가능
