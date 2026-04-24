import { useState, useMemo } from 'react';
import type { Member, Transaction, PaidMap } from '../types';
import TransactionModal from './TransactionModal';

const CAT_ICONS: Record<string, string> = {
  식비: '🍽️', 카페: '☕', 쇼핑: '🛍️', 교통: '🚌',
  생활: '🏠', 문화: '🎬', 의료: '💊', 기타: '📦',
};

function fmtDate(d: string) {
  const date = new Date(d + 'T00:00:00');
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${d.slice(5).replace('-', '.')}(${days[date.getDay()]})`;
}
function fmtMoney(n: number) { return n.toLocaleString('ko-KR') + '원'; }

interface Props {
  members: Member[];
  transactions: Transaction[];
  paidMap: PaidMap;
  onAdd: (tx: Omit<Transaction, 'id'>) => void;
  onEdit: (tx: Transaction) => void;
  onDelete: (id: string) => void;
  onTogglePaid: (txId: string, memberId: string) => void;
}

export default function LedgerPage({ members, transactions, paidMap, onAdd, onEdit, onDelete, onTogglePaid }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [editTx, setEditTx] = useState<Transaction | undefined>();
  const [filterPayer, setFilterPayer] = useState('all');
  const [filterCat, setFilterCat] = useState('all');
  const [filterMonth, setFilterMonth] = useState('all');

  const getMember = (id: string) => members.find((m) => m.id === id);

  const months = useMemo(() => {
    const s = new Set(transactions.map((t) => t.date.slice(0, 7)));
    return Array.from(s).sort().reverse();
  }, [transactions]);

  // 거래가 완전히 정산됐는지 (결제자 제외 모든 참여자가 냈는지)
  const isFullySettled = (tx: Transaction) =>
    tx.splitMemberIds
      .filter((mid) => mid !== tx.payerId)
      .every((mid) => !!paidMap[`${tx.id}:${mid}`]);

  const filtered = useMemo(() => {
    return transactions
      .filter((t) => !isFullySettled(t))          // 정산 완료 항목 숨김
      .filter((t) => filterPayer === 'all' || t.payerId === filterPayer)
      .filter((t) => filterCat === 'all' || t.category === filterCat)
      .filter((t) => filterMonth === 'all' || t.date.startsWith(filterMonth))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [transactions, paidMap, filterPayer, filterCat, filterMonth]);

  // paidMap 반영한 멤버별 순 잔액
  const memberTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    members.forEach((m) => (totals[m.id] = 0));
    transactions.forEach((tx) => {
      const share = tx.amount / tx.splitMemberIds.length;
      tx.splitMemberIds.forEach((mid) => {
        if (mid === tx.payerId) return;
        if (!paidMap[`${tx.id}:${mid}`]) {
          totals[tx.payerId] = (totals[tx.payerId] ?? 0) + share;
          totals[mid] = (totals[mid] ?? 0) - share;
        }
      });
    });
    return totals;
  }, [members, transactions, paidMap]);

  // paidMap 반영한 A→B 간 미정산 금액
  const pairBalance = useMemo(() => {
    const map: Record<string, number> = {};
    transactions.forEach((tx) => {
      const share = Math.round(tx.amount / tx.splitMemberIds.length);
      tx.splitMemberIds.forEach((mid) => {
        if (mid === tx.payerId) return;
        if (paidMap[`${tx.id}:${mid}`]) return; // 이미 냈으면 제외
        // mid가 payerId에게 share 만큼 빚짐
        const key = `${mid}:${tx.payerId}`;
        map[key] = (map[key] ?? 0) + share;
      });
    });
    return map;
  }, [transactions, paidMap]);

  // paidMap 반영한 최소 거래 정산
  const settlements = useMemo(() => {
    const creditors: { id: string; amount: number }[] = [];
    const debtors: { id: string; amount: number }[] = [];
    Object.entries(memberTotals).forEach(([id, bal]) => {
      if (bal > 0.5) creditors.push({ id, amount: bal });
      else if (bal < -0.5) debtors.push({ id, amount: -bal });
    });
    const result: { from: string; to: string; amount: number }[] = [];
    let ci = 0, di = 0;
    while (ci < creditors.length && di < debtors.length) {
      const c = creditors[ci], d = debtors[di];
      const amt = Math.min(c.amount, d.amount);
      result.push({ from: d.id, to: c.id, amount: Math.round(amt) });
      c.amount -= amt; d.amount -= amt;
      if (c.amount < 0.5) ci++;
      if (d.amount < 0.5) di++;
    }
    return result;
  }, [memberTotals]);

  const totalSettlement = settlements.reduce((s, x) => s + x.amount, 0);

  const handleSave = (data: Omit<Transaction, 'id'> & { id?: string }) => {
    if (data.id) {
      onEdit({ ...data, id: data.id } as Transaction);
    } else {
      const { id: _id, ...rest } = data;
      onAdd(rest);
    }
    setShowModal(false);
    setEditTx(undefined);
  };

  const handleShare = () => {
    const lines = settlements.map((s) => {
      const f = getMember(s.from);
      const t = getMember(s.to);
      return `${f?.name} → ${t?.name}: ${fmtMoney(s.amount)}`;
    });
    const text = ['[공동 가계부 정산 내역]', ...lines, `총 정산 금액: ${fmtMoney(totalSettlement)}`].join('\n');
    navigator.clipboard.writeText(text).then(() => alert('정산 내역이 클립보드에 복사되었습니다!'));
  };

  const openEdit = (tx: Transaction) => { setEditTx(tx); setShowModal(true); };
  const openAdd = () => { setEditTx(undefined); setShowModal(true); };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 20, alignItems: 'start' }}>

      {/* ════ 왼쪽: 거래 목록 ════ */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* 필터 바 */}
        <div className="filter-bar">
          <button className="add-btn" onClick={openAdd}>＋ 등록하기</button>
          <div className="filter-select">
            <span>📅</span>
            <select value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)}>
              <option value="all">전체 날짜</option>
              {months.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="filter-select">
            <span>👤</span>
            <select value={filterPayer} onChange={(e) => setFilterPayer(e.target.value)}>
              <option value="all">결제자 전체</option>
              {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div className="filter-select">
            <span>🏷️</span>
            <select value={filterCat} onChange={(e) => setFilterCat(e.target.value)}>
              <option value="all">카테고리 전체</option>
              {Object.keys(CAT_ICONS).map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {/* 거래 테이블 */}
        <div className="tx-card" style={{ overflowX: 'auto' }}>
          {filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">💸</div>
              <p>등록된 지출이 없습니다</p>
            </div>
          ) : (
            <table className="tx-table">
              <thead>
                <tr>
                  <th>날짜</th>
                  <th>결제자</th>
                  <th>나누는 사람</th>
                  <th>금액</th>
                  <th>구매한 것</th>
                  {members.map((m) => (
                    <th key={m.id} style={{ color: m.color, minWidth: 88 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
                        <span>{m.avatar}</span><span>{m.name}</span>
                      </div>
                    </th>
                  ))}
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((tx) => {
                  const payer = getMember(tx.payerId);
                  const splits = tx.splitMemberIds.map(getMember).filter(Boolean) as Member[];
                  const shown = splits.slice(0, 2);
                  const extra = splits.length - 2;
                  const share = Math.round(tx.amount / tx.splitMemberIds.length);

                  return (
                    <tr key={tx.id}>
                      <td><span className="tx-date">{fmtDate(tx.date)}</span></td>
                      <td>
                        <div className="tx-payer">
                          {payer && <div className="member-avatar avatar-sm" style={{ background: payer.color + '33' }}>{payer.avatar}</div>}
                          <span>{payer?.name}</span>
                        </div>
                      </td>
                      <td>
                        <div className="tx-splits">
                          {shown.map((m) => (
                            <div key={m.id} className="member-avatar avatar-sm" style={{ background: m.color + '33' }} title={m.name}>{m.avatar}</div>
                          ))}
                          {extra > 0 && <div className="split-more">+{extra}</div>}
                        </div>
                      </td>
                      <td><span className="tx-amount">{fmtMoney(tx.amount)}</span></td>
                      <td>
                        <div className="tx-category">
                          <span>{CAT_ICONS[tx.category]}</span>
                          <span>{tx.description}</span>
                        </div>
                      </td>

                      {members.map((m) => {
                        const isPayer = m.id === tx.payerId;
                        const isInvolved = tx.splitMemberIds.includes(m.id);

                        if (!isInvolved) return (
                          <td key={m.id} style={{ textAlign: 'center' }}>
                            <span style={{ color: '#ccc', fontWeight: 600 }}>X</span>
                          </td>
                        );

                        if (isPayer) {
                          const unpaidCount = tx.splitMemberIds.filter(mid =>
                            mid !== tx.payerId && !paidMap[`${tx.id}:${mid}`]
                          ).length;
                          const unpaidAmt = unpaidCount * share;
                          const receiveAmt = tx.amount - share;
                          if (receiveAmt === 0) return (
                            <td key={m.id} style={{ textAlign: 'center' }}>
                              <span style={{ color: '#aaa', fontSize: 12 }}>혼자</span>
                            </td>
                          );
                          return (
                            <td key={m.id} style={{ textAlign: 'center' }}>
                              <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                                <span style={{ fontSize: 10, color: 'var(--green)', fontWeight: 600 }}>받을</span>
                                <span style={{ fontSize: 13, fontWeight: 700, color: unpaidAmt > 0 ? 'var(--green)' : '#aaa' }}>
                                  {unpaidAmt > 0 ? fmtMoney(unpaidAmt) : '완료'}
                                </span>
                              </div>
                            </td>
                          );
                        }

                        const key = `${tx.id}:${m.id}`;
                        const isPaid = !!paidMap[key];
                        return (
                          <td key={m.id} style={{ textAlign: 'center' }}>
                            <button
                              className={`pay-cell-btn ${isPaid ? 'paid' : 'unpaid'}`}
                              onClick={() => onTogglePaid(tx.id, m.id)}
                              title={isPaid ? '취소' : '돈 냈어요!'}
                            >
                              {isPaid ? (
                                <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                                  <span style={{ fontSize: 12 }}>✅</span>
                                  <span style={{ fontSize: 11, textDecoration: 'line-through', color: '#aaa' }}>{fmtMoney(share)}</span>
                                </span>
                              ) : (
                                <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>{fmtMoney(share)}</span>
                                  <span style={{ fontSize: 10, color: 'var(--text-sub)' }}>탭하면 완료</span>
                                </span>
                              )}
                            </button>
                          </td>
                        );
                      })}

                      <td>
                        <div className="tx-actions">
                          <button className="icon-btn" onClick={() => openEdit(tx)} title="수정">✏️</button>
                          <button className="icon-btn danger" onClick={() => onDelete(tx.id)} title="삭제">🗑️</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ════ 오른쪽: 정산 패널 ════ */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* 총 정산 금액 */}
        <div style={{
          background: 'var(--primary)', borderRadius: 14, padding: '16px 20px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)' }}>총 정산 금액</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#fff' }}>{fmtMoney(totalSettlement)}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 2 }}>{settlements.length}건 정산 필요</div>
          </div>
          <span style={{ fontSize: 32 }}>👛</span>
        </div>

        {/* 멤버별 잔액 */}
        <div className="panel-card">
          <div className="panel-header"><h3>정산 현황</h3></div>

          {/* 매트릭스 — paidMap 반영 */}
          <table className="matrix-table">
            <thead>
              <tr>
                <th></th>
                {members.map((m) => <th key={m.id} style={{ color: m.color }}>{m.name}</th>)}
              </tr>
            </thead>
            <tbody>
              {members.map((row) => (
                <tr key={row.id}>
                  <td style={{ color: row.color, fontWeight: 600 }}>{row.name}</td>
                  {members.map((col) => {
                    if (row.id === col.id) return <td key={col.id} className="matrix-diagonal">-</td>;
                    // row가 col에게 줘야 할 금액
                    const owes = pairBalance[`${row.id}:${col.id}`] ?? 0;
                    return (
                      <td key={col.id}>
                        {owes > 0
                          ? <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{fmtMoney(owes)}</span>
                          : '-'}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>

          {/* 멤버별 잔액 카드 — paidMap 반영 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14 }}>
            {members.map((m) => {
              const bal = Math.round(memberTotals[m.id] ?? 0);
              const isReceive = bal > 0;
              const isPay = bal < 0;
              return (
                <div key={m.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 12px', borderRadius: 10,
                  background: isReceive ? '#F0FDF4' : isPay ? '#FEF2F2' : 'var(--bg)',
                  border: `1px solid ${isReceive ? '#86EFAC' : isPay ? '#FCA5A5' : 'var(--border)'}`,
                }}>
                  <div className="member-avatar avatar-sm" style={{ background: m.color + '33' }}>{m.avatar}</div>
                  <span style={{ fontWeight: 600, fontSize: 13, flex: 1 }}>{m.name}</span>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-sub)' }}>
                      {isReceive ? '받을 금액' : isPay ? '낼 금액' : '정산 완료'}
                    </div>
                    <div style={{
                      fontSize: 15, fontWeight: 800,
                      color: isReceive ? 'var(--green)' : isPay ? 'var(--red)' : 'var(--text-sub)',
                    }}>
                      {bal === 0 ? '0원' : fmtMoney(Math.abs(bal))}
                    </div>
                    {bal === 0 && (
                      <div style={{ fontSize: 10, color: 'var(--text-sub)' }}>
                        완료
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 추천 정산 방법 */}
        <div className="panel-card">
          <div className="panel-header"><h3>✨ 추천 정산 방법</h3></div>
          {settlements.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-sub)' }}>
              <div style={{ fontSize: 28, marginBottom: 6 }}>🎉</div>
              <p style={{ fontSize: 13 }}>모든 정산이 완료되었습니다!</p>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {settlements.map((s, i) => {
                  const f = getMember(s.from);
                  const t = getMember(s.to);
                  return (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '10px 12px', borderRadius: 10,
                      border: '1px solid var(--border)', background: 'var(--bg)',
                    }}>
                      <div className="member-avatar avatar-sm" style={{ background: f?.color + '33' }}>{f?.avatar}</div>
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{f?.name}</span>
                      <span style={{ color: 'var(--text-sub)', fontSize: 14 }}>→</span>
                      <div className="member-avatar avatar-sm" style={{ background: t?.color + '33' }}>{t?.avatar}</div>
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{t?.name}</span>
                      <span style={{ marginLeft: 'auto', fontWeight: 700, color: 'var(--primary)', fontSize: 14 }}>
                        {fmtMoney(s.amount)}
                      </span>
                    </div>
                  );
                })}
              </div>
              <p style={{ fontSize: 11, color: 'var(--text-sub)', marginTop: 10 }}>
                💡 {settlements.length}번의 거래로 모든 정산이 완료돼요!
              </p>
            </>
          )}
        </div>

        {/* 공유 버튼 */}
        <button className="share-btn" onClick={handleShare}>
          📤 정산 내역 공유하기
        </button>
      </div>

      {showModal && (
        <TransactionModal
          members={members}
          tx={editTx}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditTx(undefined); }}
        />
      )}
    </div>
  );
}
