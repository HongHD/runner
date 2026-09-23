import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useGameStore = create(
    persist(
        (set) => ({
            socket: null,
            gameState: 'waiting', // waiting, playing, result
            pinCode: null,
            nickname: null,
            pinCode: null,
            nickname: null,
            participantId: null,
            sessionId: null,
            team: null, // added team tracking
            gameTitle: null, // Track which game user is in
            gameType: null,  // Track game type (e.g. 'ox', 'buzzer')
            players: [],
            currentQuestion: null,
            timeLeft: 0,
            score: 0,
            leaderboard: [],
            gameSettings: null,
            speedPianoLevel: null, // Speed Piano 레벨 데이터
            speedPianoNotes: [], // Speed Piano 음 데이터

            setSocket: (socket) => set({ socket }),
            disconnectSocket: () => set((state) => {
                if (state.socket) state.socket.disconnect();
                return { socket: null };
            }),
            setGameState: (stateName) => set({ gameState: stateName }),
            setRoomInfo: (pinCode, nickname) => set({ pinCode, nickname }),
            setSessionInfo: (participantId, sessionId, gameTitle) => set({ participantId, sessionId, gameTitle }),
            setTeam: (team) => set({ team }),
            setGameType: (gameType) => set({ gameType }),
            setGameSettings: (gameSettings) => set({ gameSettings }),
            setSpeedPianoLevel: (level, notes) => set({ speedPianoLevel: level, speedPianoNotes: notes }),
            clearSpeedPianoData: () => set({ speedPianoLevel: null, speedPianoNotes: [] }),
            setPlayers: (players) => set({ players }),
            addPlayer: (player) => set((state) => ({ players: [...state.players, player] })),
            setCurrentQuestion: (question) => set({ currentQuestion: question }),
            setTimeLeft: (time) => set({ timeLeft: time }),
            setScore: (score) => set({ score }),
            setLeaderboard: (leaderboard) => set({ leaderboard }),
            resetGame: () => set((state) => {
                if (state.socket) state.socket.disconnect();
                return {
                    socket: null,
                    gameState: 'waiting',
                    pinCode: null,
                    nickname: null,
                    participantId: null,
                    sessionId: null,
                    team: null,
                    gameTitle: null,
                    gameType: null,
                    players: [],
                    currentQuestion: null,
                    timeLeft: 0,
                    score: 0,
                    leaderboard: [],
                    gameSettings: null,
                    speedPianoLevel: null,
                    speedPianoNotes: []
                };
            })
        }),
        {
            name: 'game-storage',
            partialize: (state) => ({
                pinCode: state.pinCode,
                nickname: state.nickname,
                participantId: state.participantId,
                sessionId: state.sessionId,
                gameState: state.gameState,
                team: state.team,
                gameTitle: state.gameTitle,
                gameType: state.gameType,
                gameSettings: state.gameSettings,
            }),
        }
    )
);

export default useGameStore;
