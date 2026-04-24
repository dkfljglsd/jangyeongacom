import React, { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import type { Member, Transaction } from '../types';

const CAT_COLORS: Record<string, string> = {
  식비: '#7C6FF7', 카페: '#F4845F', 쇼핑: '#F9C74F', 교통: '#4ECDC4',
  생활: '#90BE6D', 문화: '#F8961E', 의료: '#43AA8B', 기타: '#B5B5B5',
};
const CAT_ICONS: Record<string, string> = {
  식비: '🍽️', 카페: '☕', 쇼핑: '🛍️', 교통: '🚌',
  생활: '🏠', 문화: '🎬', 의료: '💊', 기타: '📦',
};

function fmtMoney(n: number) { return n.toLocaleString('ko-KR') + '원'; }

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 13 }}>
      <strong>{payload[0].name ?? payload[0].dataKey}</strong>: {fmtMoney(payload[0].value)}
    </div>
  );
};

interface Props {
  members: Member[];
  transactions: Transaction[];
}

export default function AnalysisPage({ members, transactions }: Props) {
  const [selectedMemberId, setSelectedMemberId] = useState<'all' | string>('all');

  const months = useMemo(() => {
    const s = new Set(transactions.map((t) => t.date.slice(0, 7)));
    return Array.from(s).sort().reverse();
  }, [transactions]);

  const [selectedMonth, setSelectedMonth] = useState<string>(() => months[0] ?? new Date().toISOString().slice(0, 7));

  const monthTxs = useMemo(
    () => transactions.filter((t) => t.date.startsWith(selectedMonth)),
    [transactions, selectedMonth]
  );

  const selectedMember = members.find((m) => m.id === selectedMemberId);

  // ─── 전체 분석 데이터 ───
  const overallCatData = useMemo(() => {
    const map: Record<string, number> = {};
    monthTxs.forEach((t) => { map[t.category] = (map[t.category] ?? 0) + t.amount; });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [monthTxs]);

  const overallTotal = monthTxs.reduce((s, t) => s + t.amount, 0);

  // 멤버별 결제 금액 비교 차트용
  const memberPayData = useMemo(() => {
    return members.map((m) => ({
      name: m.name,
      color: m.color,
      결제금액: monthTxs.filter((t) => t.payerId === m.id).reduce((s, t) => s + t.amount, 0),
      분담금액: monthTxs
        .filter((t) => t.splitMemberIds.includes(m.id))
        .reduce((s, t) => s + Math.round(t.amount / t.splitMemberIds.length), 0),
    }));
  }, [members, monthTxs]);

  // ─── 개인 분석 데이터 ───
  const myPaidTxs = useMemo(
    () => monthTxs.filter((t) => t.payerId === selectedMemberId),
    [monthTxs, selectedMemberId]
  );
  const myInvolvedTxs = useMemo(
    () => monthTxs.filter((t) => t.splitMemberIds.includes(selectedMemberId as string)),
    [monthTxs, selectedMemberId]
  );

  // 내가 결제한 카테고리
  const myCatPaid = useMemo(() => {
    const map: Record<string, number> = {};
    myPaidTxs.forEach((t) => { map[t.category] = (map[t.category] ?? 0) + t.amount; });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [myPaidTxs]);

  // 내 분담 기준 카테고리
  const myCatShare = useMemo(() => {
    const map: Record<string, number> = {};
    myInvolvedTxs.forEach((t) => {
      const share = Math.round(t.amount / t.splitMemberIds.length);
      map[t.category] = (map[t.category] ?? 0) + share;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [myInvolvedTxs]);

  const myTotalPaid = myPaidTxs.reduce((s, t) => s + t.amount, 0);
  const myTotalShare = myInvolvedTxs.reduce((s, t) => s + Math.round(t.amount / t.splitMemberIds.length), 0);
  const myDays = useMemo(() => new Set(myInvolvedTxs.map((t) => t.date)).size || 1, [myInvolvedTxs]);
  const topCatShare = myCatShare[0];

  const overallDays = useMemo(() => new Set(monthTxs.map((t) => t.date)).size || 1, [monthTxs]);

  return (
    <div className="analysis-page">
      {/* ─── 상단: 월 선택 + 멤버 탭 ─── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {/* 전체 버튼 */}
          <button
            onClick={() => setSelectedMemberId('all')}
            style={{
              padding: '8px 18px', borderRadius: 20, fontSize: 13, fontWeight: 600,
              border: `2px solid ${selectedMemberId === 'all' ? 'var(--primary)' : 'var(--border)'}`,
              background: selectedMemberId === 'all' ? 'var(--primary)' : 'var(--card)',
              color: selectedMemberId === 'all' ? '#fff' : 'var(--text)',
              cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            📊 전체
          </button>
          {/* 멤버별 버튼 */}
          {members.map((m) => (
            <button
              key={m.id}
              onClick={() => setSelectedMemberId(m.id)}
              style={{
                padding: '8px 18px', borderRadius: 20, fontSize: 13, fontWeight: 600,
                border: `2px solid ${selectedMemberId === m.id ? m.color : 'var(--border)'}`,
                background: selectedMemberId === m.id ? m.color + '22' : 'var(--card)',
                color: selectedMemberId === m.id ? m.color : 'var(--text)',
                cursor: 'pointer', transition: 'all 0.15s',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              {m.avatar} {m.name}
            </button>
          ))}
        </div>

        {/* 월 선택 (화살표 네비게이션) */}
        {(() => {
          const idx = months.indexOf(selectedMonth);
          const canPrev = idx < months.length - 1;
          const canNext = idx > 0;
          const navBtnStyle = (enabled: boolean): React.CSSProperties => ({
            width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border)',
            background: enabled ? 'var(--card)' : 'var(--bg)',
            color: enabled ? 'var(--text)' : 'var(--text-sub)',
            fontSize: 16, fontWeight: 700, cursor: enabled ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.15s',
          });
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button
                style={navBtnStyle(canPrev)}
                disabled={!canPrev}
                onClick={() => canPrev && setSelectedMonth(months[idx + 1])}
              >‹</button>
              <span style={{
                padding: '6px 16px', borderRadius: 8, border: '1px solid var(--border)',
                background: 'var(--card)', fontSize: 14, fontWeight: 700,
                minWidth: 90, textAlign: 'center',
              }}>{selectedMonth}</span>
              <button
                style={navBtnStyle(canNext)}
                disabled={!canNext}
                onClick={() => canNext && setSelectedMonth(months[idx - 1])}
              >›</button>
            </div>
          );
        })()}
      </div>

      {/* ════════════════════════════════════ */}
      {/* 전체 분석 뷰 */}
      {/* ════════════════════════════════════ */}
      {selectedMemberId === 'all' && (
        <>
          <div className="stats-row">
            <div className="stat-card">
              <div className="sc-label">📊 총 공동 지출</div>
              <div className="sc-value">{fmtMoney(overallTotal)}</div>
              <div className="sc-sub">{monthTxs.length}건</div>
            </div>
            <div className="stat-card">
              <div className="sc-label">📅 1일 평균 지출</div>
              <div className="sc-value">{fmtMoney(Math.round(overallTotal / overallDays))}</div>
              <div className="sc-sub">{overallDays}일 기준</div>
            </div>
            <div className="stat-card">
              <div className="sc-label">🏆 최다 카테고리</div>
              <div className="sc-value" style={{ fontSize: 18 }}>{overallCatData[0]?.name ?? '-'}</div>
              <div className="sc-sub">{overallCatData[0] ? fmtMoney(overallCatData[0].value) : '-'}</div>
            </div>
          </div>

          <div className="analysis-top">
            {/* 카테고리 도넛 */}
            <div className="chart-card">
              <h3>카테고리별 지출</h3>
              {overallCatData.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={overallCatData} cx="50%" cy="50%" innerRadius={65} outerRadius={105} dataKey="value" paddingAngle={2}>
                      {overallCatData.map((e) => <Cell key={e.name} fill={CAT_COLORS[e.name] ?? '#B5B5B5'} />)}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend formatter={(v) => <span style={{ fontSize: 12 }}>{v}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="empty-state" style={{ padding: 40 }}><div className="empty-icon">📊</div><p>데이터 없음</p></div>
              )}
            </div>

            {/* 카테고리 상세 */}
            <div className="chart-card">
              <h3>카테고리 상세</h3>
              <div className="category-list">
                {overallCatData.map((c) => {
                  const pct = overallTotal > 0 ? Math.round((c.value / overallTotal) * 100) : 0;
                  return (
                    <div key={c.name} className="category-row">
                      <div className="cat-color-dot" style={{ background: CAT_COLORS[c.name] }} />
                      <span style={{ fontSize: 16 }}>{CAT_ICONS[c.name]}</span>
                      <span className="cat-name">{c.name}</span>
                      <span className="cat-pct">{pct}%</span>
                      <div className="cat-bar-bg">
                        <div className="cat-bar-fill" style={{ width: `${pct}%`, background: CAT_COLORS[c.name] }} />
                      </div>
                      <span className="cat-amount">{fmtMoney(c.value)}</span>
                    </div>
                  );
                })}
                {overallCatData.length === 0 && <p style={{ color: 'var(--text-sub)', fontSize: 13 }}>지출이 없습니다.</p>}
              </div>
            </div>
          </div>

          {/* 멤버별 결제/분담 비교 */}
          <div className="chart-card">
            <h3>멤버별 결제 vs 분담 비교</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={memberPayData} margin={{ top: 8, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" fontSize={13} />
                <YAxis fontSize={11} tickFormatter={(v) => `${Math.round(v / 1000)}K`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="결제금액" fill="#7C6FF7" radius={[4, 4, 0, 0]} />
                <Bar dataKey="분담금액" fill="#4ECDC4" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {/* ════════════════════════════════════ */}
      {/* 개인 분석 뷰 */}
      {/* ════════════════════════════════════ */}
      {selectedMemberId !== 'all' && selectedMember && (
        <>
          {/* 개인 요약 카드 4개 */}
          <div className="stats-row" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
            <div className="stat-card" style={{ borderTop: `3px solid ${selectedMember.color}` }}>
              <div className="sc-label">💳 내가 결제한 금액</div>
              <div className="sc-value" style={{ color: selectedMember.color }}>{fmtMoney(myTotalPaid)}</div>
              <div className="sc-sub">{myPaidTxs.length}건</div>
            </div>
            <div className="stat-card" style={{ borderTop: `3px solid ${selectedMember.color}` }}>
              <div className="sc-label">💰 내 실제 분담 금액</div>
              <div className="sc-value">{fmtMoney(myTotalShare)}</div>
              <div className="sc-sub">{myInvolvedTxs.length}건 참여</div>
            </div>
            <div className="stat-card" style={{ borderTop: `3px solid ${selectedMember.color}` }}>
              <div className="sc-label">📅 1일 평균 소비</div>
              <div className="sc-value">{fmtMoney(Math.round(myTotalShare / myDays))}</div>
              <div className="sc-sub">{myDays}일 기준</div>
            </div>
            <div className="stat-card" style={{ borderTop: `3px solid ${selectedMember.color}` }}>
              <div className="sc-label">🏆 최다 소비 카테고리</div>
              <div className="sc-value" style={{ fontSize: 18 }}>{topCatShare?.name ?? '-'}</div>
              <div className="sc-sub">{topCatShare ? fmtMoney(topCatShare.value) : '-'}</div>
            </div>
          </div>

          <div className="analysis-top">
            {/* 내 소비 카테고리 도넛 */}
            <div className="chart-card">
              <h3>{selectedMember.avatar} {selectedMember.name}의 소비 카테고리</h3>
              {myCatShare.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={myCatShare} cx="50%" cy="50%" innerRadius={65} outerRadius={105} dataKey="value" paddingAngle={2}>
                      {myCatShare.map((e) => <Cell key={e.name} fill={CAT_COLORS[e.name] ?? '#B5B5B5'} />)}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend formatter={(v) => <span style={{ fontSize: 12 }}>{v}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="empty-state" style={{ padding: 40 }}><div className="empty-icon">📊</div><p>참여한 지출 없음</p></div>
              )}
            </div>

            {/* 내 소비 카테고리 상세 */}
            <div className="chart-card">
              <h3>카테고리별 내 분담 금액</h3>
              <div className="category-list">
                {myCatShare.map((c) => {
                  const pct = myTotalShare > 0 ? Math.round((c.value / myTotalShare) * 100) : 0;
                  return (
                    <div key={c.name} className="category-row">
                      <div className="cat-color-dot" style={{ background: CAT_COLORS[c.name] }} />
                      <span style={{ fontSize: 16 }}>{CAT_ICONS[c.name]}</span>
                      <span className="cat-name">{c.name}</span>
                      <span className="cat-pct">{pct}%</span>
                      <div className="cat-bar-bg">
                        <div className="cat-bar-fill" style={{ width: `${pct}%`, background: CAT_COLORS[c.name] }} />
                      </div>
                      <span className="cat-amount">{fmtMoney(c.value)}</span>
                    </div>
                  );
                })}
                {myCatShare.length === 0 && <p style={{ color: 'var(--text-sub)', fontSize: 13 }}>참여한 지출이 없습니다.</p>}
              </div>
            </div>
          </div>

          {/* 내가 결제한 건 vs 참여만 한 건 도넛 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* 결제한 카테고리 */}
            <div className="chart-card">
              <h3>💳 내가 직접 결제한 카테고리</h3>
              {myCatPaid.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={myCatPaid} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={2}>
                        {myCatPaid.map((e) => <Cell key={e.name} fill={CAT_COLORS[e.name] ?? '#B5B5B5'} />)}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                    {myCatPaid.map((c) => (
                      <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: CAT_COLORS[c.name] }} />
                        <span>{c.name}</span>
                        <span style={{ fontWeight: 700 }}>{fmtMoney(c.value)}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="empty-state" style={{ padding: 30 }}><p>직접 결제한 내역 없음</p></div>
              )}
            </div>

            {/* 이달 참여 거래 목록 */}
            <div className="chart-card" style={{ maxHeight: 320, overflowY: 'auto' }}>
              <h3>📋 이달 참여 내역 ({myInvolvedTxs.length}건)</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
                {myInvolvedTxs.length === 0 && <p style={{ color: 'var(--text-sub)', fontSize: 13 }}>참여 내역이 없습니다.</p>}
                {myInvolvedTxs.map((tx) => {
                  const payer = members.find((m) => m.id === tx.payerId);
                  const share = Math.round(tx.amount / tx.splitMemberIds.length);
                  const isPayer = tx.payerId === selectedMemberId;
                  return (
                    <div key={tx.id} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '8px 10px', borderRadius: 8,
                      border: '1px solid var(--border)',
                      background: isPayer ? '#F0FDF4' : 'var(--bg)',
                    }}>
                      <span style={{ fontSize: 18 }}>{CAT_ICONS[tx.category]}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{tx.description}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-sub)' }}>
                          {tx.date.slice(5).replace('-', '.')} · {isPayer ? '내가 결제' : `${payer?.name} 결제`}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: isPayer ? 'var(--green)' : 'var(--accent)' }}>
                          {isPayer ? `+${fmtMoney(tx.amount - share)}` : `-${fmtMoney(share)}`}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--text-sub)' }}>내 분담 {fmtMoney(share)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
