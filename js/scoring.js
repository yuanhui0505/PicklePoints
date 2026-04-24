const MAX_HISTORY = 50;

export function applyRallyWin(state, winner) {
  if (state.isFinished) return state;
  return winner === state.servingTeam ? applyPoint(state) : applyFault(state);
}

export function applyPoint(state) {
  const s = withSnapshot(state);
  if (s.servingTeam === 'A') s.scoreA++; else s.scoreB++;
  const my = s.servingTeam === 'A' ? s.scoreA : s.scoreB;
  const op = s.servingTeam === 'A' ? s.scoreB : s.scoreA;
  if (my >= 11 && (my - op) >= 2) {
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

export function applyUndo(state) {
  if (!state.history || state.history.length === 0) return state;
  const history = [...state.history];
  const prev = JSON.parse(history.pop());
  return { ...state, ...prev, history };
}

export function getDisplayScore(state) {
  const sScore = state.servingTeam === 'A' ? state.scoreA : state.scoreB;
  const rScore = state.servingTeam === 'A' ? state.scoreB : state.scoreA;
  return `${sScore}-${rScore}-${state.serverNum}`;
}

export function getSpeechScore(state) {
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
