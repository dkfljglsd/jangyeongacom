import type { Member, Transaction, PaidMap } from '../types';

export const INITIAL_MEMBERS: Member[] = [
  { id: 'm1', name: '장영아', avatar: '👩', color: '#FF6B6B' },
  { id: 'm2', name: '장영은', avatar: '👧', color: '#4ECDC4' },
  { id: 'm3', name: '최희재', avatar: '👦', color: '#45B7D1' },
];

export const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: 't1', date: '2026-04-15', payerId: 'm3',
    splitMemberIds: ['m1', 'm2', 'm3'], amount: 4500,
    category: '문화', description: '영화 티켓',
  },
  {
    id: 't2', date: '2026-04-16', payerId: 'm2',
    splitMemberIds: ['m1', 'm2', 'm3'], amount: 9600,
    category: '교통', description: '택시비',
  },
  {
    id: 't3', date: '2026-04-17', payerId: 'm1',
    splitMemberIds: ['m1', 'm2', 'm3'], amount: 23400,
    category: '생활', description: '마트 장보기',
  },
  {
    id: 't4', date: '2026-04-18', payerId: 'm3',
    splitMemberIds: ['m1', 'm2', 'm3'], amount: 13500,
    category: '카페', description: '카페 커피',
  },
  {
    id: 't5', date: '2026-04-24', payerId: 'm1',
    splitMemberIds: ['m1', 'm2', 'm3'], amount: 6000,
    category: '식비', description: '편의점 간식',
  },
  {
    id: 't6', date: '2026-05-19', payerId: 'm2',
    splitMemberIds: ['m1', 'm2', 'm3'], amount: 15000,
    category: '식비', description: '저녁 식사',
  },
];

// 스크린샷 기준: 모든 항목 정산 완료 상태
export const INITIAL_PAID_MAP: PaidMap = {
  't1:m1': true, 't1:m2': true,
  't2:m1': true, 't2:m3': true,
  't3:m2': true, 't3:m3': true,
  't4:m1': true, 't4:m2': true,
  't5:m2': true, 't5:m3': true,
  't6:m1': true, 't6:m3': true,
};
