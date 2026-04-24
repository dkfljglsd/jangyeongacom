import type { Member, Transaction, PaidMap, PersonalTransaction } from '../types';
import { INITIAL_MEMBERS, INITIAL_TRANSACTIONS, INITIAL_PAID_MAP } from '../data/initial';

const MEMBERS_KEY = 'gaegebu_members';
const TRANSACTIONS_KEY = 'gaegebu_transactions';
const PAID_KEY = 'gaegebu_paid';

export function loadMembers(): Member[] {
  try {
    const raw = localStorage.getItem(MEMBERS_KEY);
    return raw ? JSON.parse(raw) : INITIAL_MEMBERS;
  } catch {
    return INITIAL_MEMBERS;
  }
}

export function saveMembers(members: Member[]) {
  localStorage.setItem(MEMBERS_KEY, JSON.stringify(members));
}

export function loadTransactions(): Transaction[] {
  try {
    const raw = localStorage.getItem(TRANSACTIONS_KEY);
    return raw ? JSON.parse(raw) : INITIAL_TRANSACTIONS;
  } catch {
    return INITIAL_TRANSACTIONS;
  }
}

export function saveTransactions(transactions: Transaction[]) {
  localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(transactions));
}

export function loadPaidMap(): PaidMap {
  try {
    const raw = localStorage.getItem(PAID_KEY);
    return raw ? JSON.parse(raw) : INITIAL_PAID_MAP;
  } catch {
    return INITIAL_PAID_MAP;
  }
}

export function savePaidMap(paid: PaidMap) {
  localStorage.setItem(PAID_KEY, JSON.stringify(paid));
}

const PERSONAL_KEY = 'gaegebu_personal';

export function loadPersonalTransactions(): PersonalTransaction[] {
  try {
    const raw = localStorage.getItem(PERSONAL_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function savePersonalTransactions(txs: PersonalTransaction[]) {
  localStorage.setItem(PERSONAL_KEY, JSON.stringify(txs));
}

const PASSWORD_KEY = 'gaegebu_passwords';

export function loadPasswordMap(): Record<string, string> {
  try {
    const raw = localStorage.getItem(PASSWORD_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function savePasswordMap(map: Record<string, string>) {
  localStorage.setItem(PASSWORD_KEY, JSON.stringify(map));
}
