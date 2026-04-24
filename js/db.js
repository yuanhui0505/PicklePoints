import { db } from './firebase-config.js';
import {
  collection, doc, getDoc, addDoc, setDoc, updateDoc, deleteDoc,
  onSnapshot, query, orderBy, serverTimestamp, increment
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

export async function createMatch(tid, { teamAId, teamAName, teamBId, teamBName, category, round = 1 }) {
  return addDoc(collection(db, 'tournaments', tid, 'matches'), {
    teamAId, teamAName, teamBId, teamBName, category, round,
    scoreA: 0, scoreB: 0, serverNum: 2, servingTeam: 'A',
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

// --- Players ---

export function watchPlayers(tid, cb) {
  const q = query(collection(db, 'tournaments', tid, 'players'), orderBy('name'));
  return onSnapshot(q, snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
}

export async function createPlayer(tid, { name, gender, duprId = '' }) {
  return addDoc(collection(db, 'tournaments', tid, 'players'), { name, gender, duprId });
}

export async function deletePlayer(tid, playerId) {
  return deleteDoc(doc(db, 'tournaments', tid, 'players', playerId));
}

// --- Admin Settings ---

export async function getAdminHash() {
  const snap = await getDoc(doc(db, 'settings', 'admin'));
  return snap.exists() ? snap.data().passwordHash : null;
}

export async function setAdminHash(hash) {
  return setDoc(doc(db, 'settings', 'admin'), { passwordHash: hash }, { merge: true });
}
