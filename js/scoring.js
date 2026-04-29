const MAX_HISTORY = 50;
const DEFAULT_WIN_SCORE = { sideout: 11, rally: 21 };

function checkWin(myScore, opScore, winScore, deuce) {
  if (myScore < winScore) return false;
  if (!deuce) return true;
  return (myScore - opScore) >= 2;
}

function getWinScore(state) {
  return state.winScore || DEFAULT_WIN_SCORE[state.scoringSystem] || 11;
}

export function applyRallyWin(state, winner) {
  if (state.isFinished) return state;
  if (state.scoringSystem === 'rally') return applyRallyPoint(state, winner);
  return winner === state.servingTeam ? applyPoint(state) : applyFault(state);
}

// 發球得分制：只有發球方贏球才得分
export function applyPoint(state) {
  const s = withSnapshot(state);
  if (s.servingTeam === 'A') s.scoreA++; else s.scoreB++;
  const my = s.servingTeam === 'A' ? s.scoreA : s.scoreB;
  const op = s.servingTeam === 'A' ? s.scoreB : s.scoreA;
  if (checkWin(my, op, getWinScore(s), s.deuce !== false)) {
    s.isFinished = true;
    s.winnerId = s.servingTeam;
  }
  return s;
}

export function applyFault(state) {
  const s = withSnapshot(state);
  if (s.serverNum === 1) {
    s.serverNum = 2;
  } else {
    s.servingTeam = s.servingTeam === 'A' ? 'B' : 'A';
    s.serverNum = 1;
  }
  return s;
}

// 落地得分制：每球贏家都得分，發球權跟著贏家走
function applyRallyPoint(state, winner) {
  const s = withSnapshot(state);
  if (winner === 'A') s.scoreA++; else s.scoreB++;
  const myScore   = winner === 'A' ? s.scoreA : s.scoreB;
  const opScore   = winner === 'A' ? s.scoreB : s.scoreA;
  if (checkWin(myScore, opScore, getWinScore(s), s.deuce !== false)) {
    s.isFinished = true;
    s.winnerId = winner;
  }
  s.servingTeam = winner;
  s.serverNum = 1;
  return s;
}

export function applyUndo(state) {
  if (!state.history || state.history.length === 0) return state;
  const history = [...state.history];
  const prev = JSON.parse(history.pop());
  return { ...state, ...prev, history };
}

export function getDisplayScore(state) {
  if (state.scoringSystem === 'rally') {
    return `${state.scoreA}-${state.scoreB}`;
  }
  const sScore = state.servingTeam === 'A' ? state.scoreA : state.scoreB;
  const rScore = state.servingTeam === 'A' ? state.scoreB : state.scoreA;
  return `${sScore}-${rScore}-${state.serverNum}`;
}

export function getSpeechScore(state) {
  if (state.scoringSystem === 'rally') {
    return `${state.scoreA}, ${state.scoreB}`;
  }
  const sScore = state.servingTeam === 'A' ? state.scoreA : state.scoreB;
  const rScore = state.servingTeam === 'A' ? state.scoreB : state.scoreA;
  return `${sScore}, ${rScore}, ${state.serverNum}`;
}

function withSnapshot(state) {
  const snap = JSON.stringify({
    scoreA: state.scoreA, scoreB: state.scoreB,
    serverNum: state.serverNum, servingTeam: state.servingTeam,
    isFinished: state.isFinished, winnerId: state.winnerId ?? null
  });
  const history = [...(state.history || []), snap].slice(-MAX_HISTORY);
  return { ...state, history };
}
