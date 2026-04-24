import type { Member, Transaction, Settlement } from '../types';

// 각 멤버의 순 잔액 계산 (양수: 받을 금액, 음수: 낼 금액)
export function calcBalances(members: Member[], transactions: Transaction[]): Record<string, number> {
  const balances: Record<string, number> = {};
  members.forEach((m) => (balances[m.id] = 0));

  transactions.forEach(({ payerId, splitMemberIds, amount }) => {
    const share = amount / splitMemberIds.length;
    splitMemberIds.forEach((mid) => {
      if (mid === payerId) return;
      balances[payerId] += share;
      balances[mid] -= share;
    });
  });

  return balances;
}

// 특정 A→B 간 정산 금액 (A가 B에게 줘야 할 금액)
export function calcPairBalance(
  _members: Member[],
  transactions: Transaction[],
  fromId: string,
  toId: string
): number {
  let total = 0;
  transactions.forEach(({ payerId, splitMemberIds, amount }) => {
    const share = Math.round(amount / splitMemberIds.length);
    if (payerId === toId && splitMemberIds.includes(fromId) && fromId !== toId) {
      total += share;
    }
    if (payerId === fromId && splitMemberIds.includes(toId) && fromId !== toId) {
      total -= share;
    }
  });
  return total;
}

// 최소 거래 수로 정산하는 추천 방법 (그리디)
export function calcSettlements(members: Member[], transactions: Transaction[]): Settlement[] {
  const balances = calcBalances(members, transactions);
  const creditors: { id: string; amount: number }[] = [];
  const debtors: { id: string; amount: number }[] = [];

  Object.entries(balances).forEach(([id, bal]) => {
    if (bal > 0.5) creditors.push({ id, amount: bal });
    else if (bal < -0.5) debtors.push({ id, amount: -bal });
  });

  const settlements: Settlement[] = [];
  let ci = 0;
  let di = 0;

  while (ci < creditors.length && di < debtors.length) {
    const credit = creditors[ci];
    const debt = debtors[di];
    const amount = Math.min(credit.amount, debt.amount);

    settlements.push({ from: debt.id, to: credit.id, amount: Math.round(amount) });

    credit.amount -= amount;
    debt.amount -= amount;

    if (credit.amount < 0.5) ci++;
    if (debt.amount < 0.5) di++;
  }

  return settlements;
}
