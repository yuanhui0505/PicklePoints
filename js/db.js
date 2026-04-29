import { db } from './firebase-config.js';
import {
  collection, doc, getDoc, getDocs, addDoc, setDoc, updateDoc, deleteDoc,
  onSnapshot, query, orderBy, where, serverTimestamp, increment
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

// --- Tournaments ---

export function watchTournaments(cb) {
  const q = query(collection(db, 'tournaments'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
}

export function watchTournament(id, cb) {
  return onSnapshot(doc(db, 'tournaments', id), snap => {
    if (snap.exists()) cb({ id: snap.id, ...snap.data() });
  });
}

export async function createTournament({ name, year, description = '' }) {
  return addDoc(collection(db, 'tournaments'), {
    name, year: Number(year), description, isActive: true, createdAt: serverTimestamp()
  });
}

export async function updateTournament(id, data) {
  return updateDoc(doc(db, 'tournaments', id), data);
}

export async function deleteTournament(id) {
  return deleteDoc(doc(db, 'tournaments', id));
}

// --- Teams ---

export function watchTeams(tid, cb) {
  const q = query(collection(db, 'tournaments', tid, 'teams'), orderBy('points', 'desc'));
  return onSnapshot(q, snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
}

export async function createTeam(tid, { name, players = [], playerIds = [], genders = [], category }) {
  return addDoc(collection(db, 'tournaments', tid, 'teams'), {
    name, players, playerIds, genders, category, points: 0, wins: 0, losses: 0
  });
}

export async function updateTeam(tid, teamId, data) {
  return updateDoc(doc(db, 'tournaments', tid, 'teams', teamId), data);
}

export async function deleteTeam(tid, teamId) {
  return deleteDoc(doc(db, 'tournaments', tid, 'teams', teamId));
}

export async function addMatchResult(tid, winnerId, loserId) {
  await updateTeam(tid, winnerId, { points: increment(2), wins: increment(1) });
  await updateTeam(tid, loserId, { points: increment(1), losses: increment(1) });
}

export async function checkAndCloseTournament(tid) {
  const snap = await getDocs(collection(db, 'tournaments', tid, 'matches'));
  const matches = snap.docs.map(d => d.data());
  if (matches.length === 0) return;
  if (matches.every(m => m.isFinished)) {
    await updateTournament(tid, { isActive: false });
  }
}

// --- Matches ---

export function watchMatches(tid, cb) {
  const q = query(collection(db, 'tournaments', tid, 'matches'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
}

export function watchMatch(tid, mid, cb) {
  return onSnapshot(doc(db, 'tournaments', tid, 'matches', mid), snap => {
    if (snap.exists()) cb({ id: snap.id, ...snap.data() });
  });
}

export async function createMatch(tid, { teamAId, teamAName, teamBId, teamBName, category, round = 1, scoringSystem = 'sideout', winScore, deuce = true }) {
  const defaultWinScore = scoringSystem === 'rally' ? 21 : 11;
  return addDoc(collection(db, 'tournaments', tid, 'matches'), {
    teamAId, teamAName, teamBId, teamBName, category, round, scoringSystem,
    winScore: winScore ?? defaultWinScore, deuce,
    scoreA: 0, scoreB: 0,
    serverNum: scoringSystem === 'rally' ? 1 : 2,
    servingTeam: 'A',
    isFinished: false, winnerId: null, resultRecorded: false, history: [],
    createdAt: serverTimestamp()
  });
}

export async function updateMatch(tid, mid, data) {
  return updateDoc(doc(db, 'tournaments', tid, 'matches', mid), data);
}

export async function deleteMatch(tid, mid) {
  return deleteDoc(doc(db, 'tournaments', tid, 'matches', mid));
}

// --- Players (global) ---

export function watchGlobalPlayers(cb) {
  const q = query(collection(db, 'players'), orderBy('name'));
  return onSnapshot(q, snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
}

export async function createGlobalPlayer({ name, gender, duprId = '' }) {
  return addDoc(collection(db, 'players'), { name, gender, duprId });
}

export async function updateGlobalPlayer(pid, data) {
  return updateDoc(doc(db, 'players', pid), data);
}

export async function deleteGlobalPlayer(pid) {
  return deleteDoc(doc(db, 'players', pid));
}

// --- Admin Settings ---

export async function getAdminHash() {
  const snap = await getDoc(doc(db, 'settings', 'admin'));
  return snap.exists() ? snap.data().passwordHash : null;
}

export async function setAdminHash(hash) {
  return setDoc(doc(db, 'settings', 'admin'), { passwordHash: hash }, { merge: true });
}

// --- Managers ---

export function watchManagers(cb) {
  const q = query(collection(db, 'managers'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
}

export async function getManagerByUsername(username) {
  const q = query(collection(db, 'managers'), where('username', '==', username));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() };
}

export async function createManager({ name, username, passwordHash }) {
  return addDoc(collection(db, 'managers'), { name, username, passwordHash, createdAt: serverTimestamp() });
}

export async function updateManager(id, data) {
  return updateDoc(doc(db, 'managers', id), data);
}

export async function deleteManager(id) {
  return deleteDoc(doc(db, 'managers', id));
}
