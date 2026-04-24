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
  onResetPaid: (txId: string) => void;
}

export default function GaegyebuPage({ members, transactions, paidMap, onAdd, onEdit, onDelete, onResetPaid }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [editTx, setEditTx] = useState<Transaction | undefined>();
  const [filterPayer, setFilterPayer] = useState('all');
  const [filterCat, setFilterCat] = useState('all');
  const [filterMonth, setFilterMonth] = useState('all');

  const getMember = (id: string) => members.find((m) => m.id === id);

  const isSettled = (tx: Transaction) =>
    tx.splitMemberIds
      .filter((mid) => mid !== tx.payerId)
      .every((mid) => !!paidMap[`${tx.id}:${mid}`]);

  const months = useMemo(() => {
    const s = new Set(transactions.map((t) => t.date.slice(0, 7)));
    return Array.from(s).sort().reverse();
  }, [transactions]);

  const filtered = useMemo(() => {
    return transactions
      .filter((t) => filterPayer === 'all' || t.payerId === filterPayer)
      .filter((t) => filterCat === 'all' || t.category === filterCat)
      .filter((t) => filterMonth === 'all' || t.date.startsWith(filterMonth))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [transactions, filterPayer, filterCat, filterMonth]);

  const totalAmount = filtered.reduce((s, t) => s + t.amount, 0);

  const handleSave = (data: Omit<Transaction, 'id'> & { id?: string }) => {
    if (data.id) onEdit({ ...data, id: data.id } as Transaction);
    else { const { id: _id, ...rest } = data; onAdd(rest); }
    setShowModal(false);
    setEditTx(undefined);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* 필터 바 */}
      <div className="filter-bar">
        <button className="add-btn" onClick={() => { setEditTx(undefined); setShowModal(true); }}>＋ 등록하기</button>
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
        <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--text-sub)', fontWeight: 600 }}>
          총 {filtered.length}건 · {fmtMoney(totalAmount)}
        </span>
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
                <th>1인당</th>
                <th>정산</th>
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
                    <td>
                      <span style={{ fontSize: 13, color: 'var(--text-sub)', fontWeight: 500 }}>
                        {fmtMoney(share)}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {isSettled(tx) ? (
                        <button
                          onClick={() => onResetPaid(tx.id)}
                          style={{
                            padding: '5px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                            border: '1.5px solid #FDBA74', background: '#FFF7ED',
                            color: '#EA580C', cursor: 'pointer', whiteSpace: 'nowrap',
                            transition: 'all 0.15s',
                          }}
                          title="정산 취소하고 정산 탭으로 이동"
                        >
                          🔄 다시 정산
                        </button>
                      ) : (
                        <span style={{
                          padding: '4px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                          background: '#FEF2F2', color: '#EF4444', border: '1px solid #FECACA',
                        }}>
                          미정산
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="tx-actions">
                        <button className="icon-btn" onClick={() => { setEditTx(tx); setShowModal(true); }} title="수정">✏️</button>
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
