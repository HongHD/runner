// 초기 게임 종류 시드 데이터 (GameManagement 화면 기준)
const GAME_TYPES_SEED = [
    // ── 퀴즈 · 경쟁 ──
    { category: '퀴즈·경쟁', category_icon: '🎯', name: '4지선다형', description: '객관식 퀴즈로 지식을 테스트', badge: 'NEW', is_active: false, order_num: 1 },
    { category: '퀴즈·경쟁', category_icon: '🎯', name: 'OX퀴즈', description: 'O/X로 정답을 맞추는 퀴즈', badge: 'NEW', is_active: false, order_num: 2 },
    { category: '퀴즈·경쟁', category_icon: '🎯', name: '스피드 부저', description: '가장 먼저 버저를 누른 사람 발표', badge: 'NEW', is_active: false, order_num: 3 },
    { category: '퀴즈·경쟁', category_icon: '🎯', name: '스피드 피아노', description: '음계 순서 빠르게 치기 대결', badge: 'NEW', is_active: false, order_num: 4 },
    { category: '퀴즈·경쟁', category_icon: '🎯', name: '스피드 타일', description: '섞인 타일 순서대로 완성 대결', badge: 'NEW', is_active: false, order_num: 5 },
    { category: '퀴즈·경쟁', category_icon: '🎯', name: '두더지 게임', description: '올라오는 두더지 빠르게 잡기', badge: 'NEW', is_active: false, order_num: 6 },
    { category: '퀴즈·경쟁', category_icon: '🎯', name: '버튼 배틀', description: '제한 시간 내 버튼 최다 클릭 대결', badge: 'NEW', is_active: false, order_num: 7 },
    { category: '퀴즈·경쟁', category_icon: '🎯', name: '스탑워치', description: '정확한 시간에 멈추기 대결', badge: 'NEW', is_active: false, order_num: 8 },

    // ── 투표 · 소통 ──
    { category: '투표·소통', category_icon: '💬', name: '공감투표', description: '실시간 투표 결과 확인', badge: 'NEW', is_active: false, order_num: 1 },
    { category: '투표·소통', category_icon: '💬', name: '실시간 설문', description: '다중 설문 수집·실시간 결과 차트', badge: null, is_active: false, order_num: 2 },
    { category: '투표·소통', category_icon: '💬', name: '익명 Q&A', description: '익명 질문 수집·좋아요 공감', badge: null, is_active: false, order_num: 3 },
    { category: '투표·소통', category_icon: '💬', name: '워드클라우드', description: '키워드 실시간 시각화', badge: null, is_active: false, order_num: 4 },
    { category: '투표·소통', category_icon: '💬', name: '게시판', description: '실시간 의견 수집 & 교체', badge: 'NEW', is_active: false, order_num: 5 },
    { category: '투표·소통', category_icon: '💬', name: '평가하기', description: '별점 및 피드백 수집', badge: 'NEW', is_active: false, order_num: 6 },
    { category: '투표·소통', category_icon: '💬', name: '그룹 만들기', description: '랜덤 그룹 자동 배정', badge: 'NEW', is_active: false, order_num: 7 },
    { category: '투표·소통', category_icon: '💬', name: '미션빙고', description: '동성 미션 수행 빙고 게임', badge: '준비중', is_active: false, order_num: 8 },
    { category: '투표·소통', category_icon: '💬', name: '스케치북', description: '이미지·글 포스트 자유 게시판', badge: 'NEW', is_active: false, order_num: 9 },

    // ── 랜덤 · 재미 ──
    { category: '랜덤·재미', category_icon: '🎲', name: '행운권 추첨', description: '무작위 당첨자 선정', badge: 'NEW', is_active: false, order_num: 1 },
    { category: '랜덤·재미', category_icon: '🎲', name: '빙고', description: '멀티플레이어 빙고', badge: 'NEW', is_active: false, order_num: 2 },
    { category: '랜덤·재미', category_icon: '🎲', name: '팀 스프린트', description: '팀별 탭 영산 속도 대결', badge: 'BETA', is_active: false, order_num: 3 },
    { category: '랜덤·재미', category_icon: '🎲', name: '풍선 터뜨리기', description: '팀 합산 타수로 풍선 먼저 터뜨리기', badge: 'NEW', is_active: false, order_num: 4 },
    { category: '랜덤·재미', category_icon: '🎲', name: '초성게임', description: '팀별 초성 단어 완성 대결', badge: 'NEW', is_active: false, order_num: 5 },
    { category: '랜덤·재미', category_icon: '🎲', name: '메모리게임', description: '카드 짝 맞추기 최소 시도 경쟁', badge: 'NEW', is_active: false, order_num: 6 },
    { category: '랜덤·재미', category_icon: '🎲', name: '가위바위보', description: '1:1 토너먼트 가위바위보 대결', badge: 'NEW', is_active: false, order_num: 7 },
    { category: '랜덤·재미', category_icon: '🎲', name: '핀볼 추첨기', description: '물리 기반 랜덤 추첨·동일 출발', badge: 'NEW', is_active: false, order_num: 8 },
    { category: '랜덤·재미', category_icon: '🎲', name: '유리징검다리', description: '오징어게임·진짜유리를 찾아라', badge: '준비중', is_active: false, order_num: 9 },
    { category: '랜덤·재미', category_icon: '🎲', name: '줄다리기', description: '오징어게임·팀 합산 탭으로 줄 당기기', badge: '준비중', is_active: false, order_num: 10 },
];

module.exports = GAME_TYPES_SEED;
