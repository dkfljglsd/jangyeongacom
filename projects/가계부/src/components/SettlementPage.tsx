import { useMemo } from 'react';
import type { Member, Transaction, PaidMap } from '../types';
import { calcBalances, calcPairBalance, calcSettlements } from '../utils/settlement';

function fmtMoney(n: number) { return n.toLocaleString('ko-KR') + '원'; }

interface Props {
  members: Member[];
  transactions: Transaction[];
  paidMap: PaidMap;
}

export default function SettlementPage({ members, transactions, paidMap: _paidMap }: Props) {
  const balances = useMemo(() => calcBalances(members, transactions), [members, transactions]);
  const settlements = useMemo(() => calcSettlements(members, transactions), [members, transactions]);
  const getMember = (id: string) => members.find((m) => m.id === id);

  const total = settlements.reduce((s, x) => s + x.amount, 0);

  const handleShare = () => {
    const lines = settlements.map((s) => {
      const f = getMember(s.from);
      const t = getMember(s.to);
      return `${f?.name} → ${t?.name}: ${fmtMoney(s.amount)}`;
    });
    const text = ['[공동 가계부 정산 내역]', ...lines, `총 정산 금액: ${fmtMoney(total)}`].join('\n');
    navigator.clipboard.writeText(text).then(() => alert('정산 내역이 클립보드에 복사되었습니다!'));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ fontSize: 18, fontWeight: 700 }}>정산</h2>
        <div style={{ background: 'var(--primary)', color: '#fff', borderRadius: 10, padding: '10px 20px' }}>
          <div style={{ fontSize: 11 }}>총 정산 금액</div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>{fmtMoney(total)}</div>
          <div style={{ fontSize: 11 }}>{settlements.length}건</div>
        </div>
      </div>

      <div className="settlement-full-page">
        {/* Left: Matrix + Balances */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="panel-card">
            <div className="panel-header">
              <h3>정산 요약 (누가 누구에게)</h3>
            </div>
            <table className="matrix-table">
              <thead>
                <tr>
                  <th></th>
                  {members.map((m) => (
                    <th key={m.id} style={{ color: m.color }}>{m.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {members.map((row) => (
                  <tr key={row.id}>
                    <td style={{ color: row.color, fontWeight: 600 }}>{row.name}</td>
                    {members.map((col) => {
                      if (row.id === col.id) return <td key={col.id} className="matrix-diagonal">-</td>;
                      const amt = calcPairBalance(members, transactions, row.id, col.id);
                      return (
                        <td key={col.id}>
                          {amt !== 0 ? (
                            <span style={{ color: amt > 0 ? 'var(--accent)' : 'var(--red)', fontWeight: 700 }}>
                              {amt > 0 ? '+' : ''}{fmtMoney(Math.round(amt))}
                            </span>
                          ) : '-'}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="balance-cards" style={{ marginTop: 16 }}>
              {members.map((m) => {
                const bal = Math.round(balances[m.id] ?? 0);
                const cls = bal > 0 ? 'receive' : bal < 0 ? 'pay' : 'neutral';
                return (
                  <div key={m.id} className={`balance-card ${cls}`}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div className="member-avatar avatar-sm" style={{ background: m.color + '33' }}>{m.avatar}</div>
                      <span className="bc-name">{m.name}</span>
                      <span className="bc-label" style={{ marginLeft: 'auto' }}>
                        {bal > 0 ? '받을 금액' : bal < 0 ? '낼 금액' : '정산 완료'}
                      </span>
                      <span className="bc-amount" style={{ fontSize: 16 }}>
                        {bal === 0 ? '0원' : (bal < 0 ? '-' : '') + fmtMoney(Math.abs(bal))}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Transfer suggestions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="panel-card">
            <div className="panel-header">
              <h3>✨ 추천 정산 방법</h3>
            </div>
            {settlements.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-sub)' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>🎉</div>
                <p>모든 정산이 완료되었습니다!</p>
              </div>
            ) : (
              <>
                <div className="transfer-list">
                  {settlements.map((s, i) => {
                    const f = getMember(s.from);
                    const t = getMember(s.to);
                    return (
                      <div key={i} className="transfer-item">
                        <div className="member-avatar avatar-sm" style={{ background: f?.color + '33' }}>{f?.avatar}</div>
                        <div className="transfer-names">
                          <span>{f?.name}</span>
                          <span style={{ color: 'var(--text-sub)' }}>→</span>
                          <span>{t?.name}</span>
                        </div>
                        <span className="transfer-amount">{fmtMoney(s.amount)}</span>
                        <button className="send-btn">전송</button>
                      </div>
                    );
                  })}
                </div>
                <p style={{ fontSize: 12, color: 'var(--text-sub)', marginTop: 12 }}>
                  💡 {settlements.length}번의 거래로 모든 정산이 완료돼요!
                </p>
              </>
            )}
          </div>

          <button className="share-btn" onClick={handleShare}>
            📤 정산 내역 공유하기
          </button>
        </div>
      </div>
    </div>
  );
}
