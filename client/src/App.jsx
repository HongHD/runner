import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './store/authStore';

// === Admin Layout ===
import AdminLayout from './pages/admin/AdminLayout';

// === Admin Pages ===
import AdminLogin from './pages/admin/Login';
import AdminRegister from './pages/admin/Register';
import Dashboard from './pages/admin/Dashboard';
import GameManagement from './pages/admin/GameManagement';
import GameTypeList from './pages/admin/GameTypeList';
import GameDesignBoard from './pages/admin/GameDesignBoard';
import GameEditor from './pages/admin/GameEditor';
import HostGame from './pages/admin/HostGame';
import HostSurvey from './pages/admin/HostSurvey';
import HostBoard from './pages/admin/HostBoard';
import HostOX from './pages/admin/HostOX';
import HostMultipleChoice from './pages/admin/HostMultipleChoice';
import HostMole from './pages/admin/HostMole';
import HostStopwatch from './pages/admin/HostStopwatch';
import HostButtonBattle from './pages/admin/HostButtonBattle';
import HostSpeedPiano from './pages/admin/HostSpeedPiano';
import HostSpeedTile from './pages/admin/HostSpeedTile';
import HostEmpathyVote from './pages/admin/HostEmpathyVote';
import HostWordCloud from './pages/admin/HostWordCloud';
import HostLuckyDraw from './pages/admin/HostLuckyDraw';
import HostLadder from './pages/admin/HostLadder';
import UserManagement from './pages/admin/UserManagement';
import RankingPage from './pages/admin/RankingPage';
import StatsPage from './pages/admin/StatsPage';
import SettingsPage from './pages/admin/SettingsPage';
import LogPage from './pages/admin/LogPage';

// === Player Pages ===
import PlayerJoin from './pages/play/Join';
import PlayerLobby from './pages/play/Lobby';
import PlayerGame from './pages/play/PlayGame';
import PlayerSurvey from './pages/play/PlaySurvey';
import PlayerResult from './pages/play/Result';
import PlayerBoard from './pages/play/PlayBoard';
import PlaySpeedPiano from './pages/play/PlaySpeedPiano';
import PlaySpeedTile from './pages/play/PlaySpeedTile';
import PlayEmpathyVote from './pages/play/PlayEmpathyVote';
import PlayLadder from './pages/play/PlayLadder';

function PrivateRoute({ children }) {
    const { token } = useAuthStore();
    return token ? children : <Navigate to="/admin/login" replace />;
}

function App() {
    const { token } = useAuthStore();

    return (
        <BrowserRouter>
            <Routes>
                {/* ── Admin Auth ── */}
                <Route path="/admin/login" element={token ? <Navigate to="/admin/dashboard" /> : <AdminLogin />} />
                <Route path="/admin/register" element={token ? <Navigate to="/admin/dashboard" /> : <AdminRegister />} />

                {/* ── Admin (공통 레이아웃) ── */}
                <Route path="/admin" element={<PrivateRoute><AdminLayout /></PrivateRoute>}>
                    <Route index element={<Navigate to="/admin/dashboard" replace />} />
                    <Route path="dashboard" element={<Dashboard />} />
                    <Route path="games" element={<GameManagement />} />
                    <Route path="game-types" element={<GameTypeList />} />
                    <Route path="users" element={<UserManagement />} />
                    <Route path="ranking" element={<RankingPage />} />
                    <Route path="stats" element={<StatsPage />} />
                    <Route path="settings" element={<SettingsPage />} />
                    <Route path="log" element={<LogPage />} />
                    <Route path="game/create" element={<GameEditor />} />
                    <Route path="game/:id/edit" element={<GameEditor />} />
                    <Route path="game-design/:type" element={<GameDesignBoard />} />
                </Route>

                {/* ── HostGame 별도 레이아웃 ── */}
                <Route
                    path="/admin/game/:id/play"
                    element={<PrivateRoute><HostGame /></PrivateRoute>}
                />
                <Route
                    path="/admin/game/realtime-survey/play"
                    element={<PrivateRoute><HostSurvey /></PrivateRoute>}
                />
                <Route
                    path="/admin/game/board/play"
                    element={<PrivateRoute><HostBoard /></PrivateRoute>}
                />
                <Route
                    path="/admin/game/ox/:id/play"
                    element={<PrivateRoute><HostOX /></PrivateRoute>}
                />
                <Route
                    path="/admin/game/multiple_choice/:id/play"
                    element={<PrivateRoute><HostMultipleChoice /></PrivateRoute>}
                />
                <Route
                    path="/admin/game/mole/:id/play"
                    element={<PrivateRoute><HostMole /></PrivateRoute>}
                />
                <Route
                    path="/admin/game/stopwatch/play"
                    element={<PrivateRoute><HostStopwatch /></PrivateRoute>}
                />
                <Route
                    path="/admin/game/button_battle/play"
                    element={<PrivateRoute><HostButtonBattle /></PrivateRoute>}
                />
                <Route
                    path="/admin/game/speed-piano/:id/play"
                    element={<PrivateRoute><HostSpeedPiano /></PrivateRoute>}
                />
                <Route
                    path="/admin/game/speed-tile/:id/play"
                    element={<PrivateRoute><HostSpeedTile /></PrivateRoute>}
                />
                <Route
                    path="/admin/game/empathy-vote/play"
                    element={<PrivateRoute><HostEmpathyVote /></PrivateRoute>}
                />
                <Route
                    path="/admin/game/word-cloud/play"
                    element={<PrivateRoute><HostWordCloud /></PrivateRoute>}
                />
                <Route
                    path="/admin/game/lucky-draw/play"
                    element={<PrivateRoute><HostLuckyDraw /></PrivateRoute>}
                />
                <Route
                    path="/admin/game/ladder/play"
                    element={<PrivateRoute><HostLadder /></PrivateRoute>}
                />

                {/* ── Player Routes ── */}
                <Route path="/play">
                    <Route index element={<PlayerJoin />} />
                    <Route path="lobby" element={<PlayerLobby />} />
                    <Route path="game" element={<PlayerGame />} />
                    <Route path="survey" element={<PlayerSurvey />} />
                    <Route path="board" element={<PlayerBoard />} />
                    <Route path="speed-piano" element={<PlaySpeedPiano />} />
                    <Route path="speed-tile" element={<PlaySpeedTile />} />
                    <Route path="empathy-vote" element={<PlayEmpathyVote />} />
                    <Route path="ladder" element={<PlayLadder />} />
                    <Route path="result" element={<PlayerResult />} />
                </Route>

                {/* ── Root Redirect ── */}
                <Route path="/" element={<Navigate to="/play" replace />} />
                <Route path="*" element={<Navigate to="/play" replace />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
