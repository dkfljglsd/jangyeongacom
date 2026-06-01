import {
  collection, doc, onSnapshot, setDoc, deleteDoc,
  getDocs, writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase';
import type { Member, Transaction, PaidMap, PersonalTransaction } from '../types';

// localStorage에 있는 기존 데이터를 Firestore로 한 번만 마이그레이션
export async function migrateFromLocalStorage(): Promise<void> {
  const txSnap = await getDocs(collection(db, 'transactions'));
  if (!txSnap.empty) return; // 이미 데이터 있으면 스킵

  const batch = writeBatch(db);
  let hasData = false;

  const rawTxs = localStorage.getItem('gaegebu_transactions');
  if (rawTxs) {
    (JSON.parse(rawTxs) as Transaction[]).forEach(tx => {
      batch.set(doc(db, 'transactions', tx.id), tx);
      hasData = true;
    });
  }

  const rawMembers = localStorage.getItem('gaegebu_members');
  if (rawMembers) {
    (JSON.parse(rawMembers) as Member[]).forEach(m => {
      batch.set(doc(db, 'members', m.id), m);
      hasData = true;
    });
  }

  const rawPersonal = localStorage.getItem('gaegebu_personal');
  if (rawPersonal) {
    (JSON.parse(rawPersonal) as PersonalTransaction[]).forEach(tx => {
      batch.set(doc(db, 'personalTransactions', tx.id), tx);
      hasData = true;
    });
  }

  if (hasData) await batch.commit();

  const rawPaid = localStorage.getItem('gaegebu_paid');
  if (rawPaid) {
    await setDoc(doc(db, 'settings', 'paidMap'), JSON.parse(rawPaid));
  }
}

// ---- 실시간 구독 ----

export function subscribeMembers(cb: (m: Member[]) => void) {
  return onSnapshot(collection(db, 'members'), snap => {
    const members = snap.docs.map(d => d.data() as Member);
    members.sort((a, b) => a.id.localeCompare(b.id));
    cb(members);
  });
}

export function subscribeTransactions(cb: (t: Transaction[]) => void) {
  return onSnapshot(collection(db, 'transactions'), snap => {
    const txs = snap.docs.map(d => d.data() as Transaction);
    txs.sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
    cb(txs);
  });
}

export function subscribePaidMap(cb: (p: PaidMap) => void) {
  return onSnapshot(doc(db, 'settings', 'paidMap'), snap => {
    cb((snap.data() ?? {}) as PaidMap);
  });
}

export function subscribePersonalTransactions(cb: (t: PersonalTransaction[]) => void) {
  return onSnapshot(collection(db, 'personalTransactions'), snap => {
    const txs = snap.docs.map(d => d.data() as PersonalTransaction);
    txs.sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
    cb(txs);
  });
}

// ---- 멤버 ----

export async function saveMembers(members: Member[]): Promise<void> {
  const existing = await getDocs(collection(db, 'members'));
  const batch = writeBatch(db);
  existing.docs.forEach(d => batch.delete(d.ref));
  members.forEach(m => batch.set(doc(db, 'members', m.id), m));
  await batch.commit();
}

// ---- 지출 ----

export async function addTransactionToDb(tx: Transaction): Promise<void> {
  await setDoc(doc(db, 'transactions', tx.id), tx);
}

export async function updateTransactionInDb(tx: Transaction): Promise<void> {
  await setDoc(doc(db, 'transactions', tx.id), tx);
}

export async function deleteTransactionFromDb(id: string): Promise<void> {
  await deleteDoc(doc(db, 'transactions', id));
}

// ---- 정산 ----

export async function savePaidMap(paid: PaidMap): Promise<void> {
  await setDoc(doc(db, 'settings', 'paidMap'), paid);
}

// ---- 개인 지출 ----

export async function addPersonalTxToDb(tx: PersonalTransaction): Promise<void> {
  await setDoc(doc(db, 'personalTransactions', tx.id), tx);
}

export async function updatePersonalTxInDb(tx: PersonalTransaction): Promise<void> {
  await setDoc(doc(db, 'personalTransactions', tx.id), tx);
}

export async function deletePersonalTxFromDb(id: string): Promise<void> {
  await deleteDoc(doc(db, 'personalTransactions', id));
}

// ---- 비밀번호 (기기별 localStorage 유지) ----

const PASSWORD_KEY = 'gaegebu_passwords';

export function loadPasswordMap(): Record<string, string> {
  try {
    const raw = localStorage.getItem(PASSWORD_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

export function savePasswordMap(map: Record<string, string>) {
  localStorage.setItem(PASSWORD_KEY, JSON.stringify(map));
}
