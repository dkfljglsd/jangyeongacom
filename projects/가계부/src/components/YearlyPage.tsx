import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { Member, Transaction } from '../types';

function fmtMoney(n: number) { return n.toLocaleString('ko-KR') + '원'; }

const MONTH_LABELS = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', fontSize: 13 }}>
      <div style={{ fontWeight: 700, marginBottom: 6 }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} style={{ color: p.color, marginBottom: 2 }}>
          {p.dataKey}: {fmtMoney(p.value)}
        </div>
      ))}
    </div>
  );
};

interface Props {
  members: Member[];
  transactions: Transaction[];
}

export default function YearlyPage({ members, transactions }: Props) {
  const years = useMemo(() => {
    const s = new Set(transactions.map((t) => t.date.slice(0, 4)));
    return Array.from(s).sort().reverse();
  }, [transactions]);

  const [selectedYear, setSelectedYear] = useState<string>(() => years[0] ?? new Date().getFullYear().toString());
  const [viewMode, setViewMode] = useState<'total' | 'member'>('total');

  const yearIdx = years.indexOf(selectedYear);
  const canPrev = yearIdx < years.length - 1;
  const canNext = yearIdx > 0;

  const navBtnStyle = (enabled: boolean): React.CSSProperties => ({
    width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border)',
    background: enabled ? 'var(--card)' : 'var(--bg)',
    color: enabled ? 'var(--text)' : 'var(--text-sub)',
    fontSize: 16, fontWeight: 700, cursor: enabled ? 'pointer' : 'default',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'all 0.15s',
  });

  const yearTxs = useMemo(
    () => transactions.filter((t) => t.date.startsWith(selectedYear)),
    [transactions, selectedYear]
  );

  // 월별 총합 데이터 (1~12월)
  const monthlyData = useMemo(() => {
    return MONTH_LABELS.map((label, i) => {
      const mm = String(i + 1).padStart(2, '0');
      const prefix = `${selectedYear}-${mm}`;
      const txs = yearTxs.filter((t) => t.date.startsWith(prefix));
      const total = txs.reduce((s, t) => s + t.amount, 0);
      const row: Record<string, any> = { month: label, 합계: total, count: txs.length };
      members.forEach((m) => {
        row[m.name] = txs
          .filter((t) => t.splitMemberIds.includes(m.id))
          .reduce((s, t) => s + Math.round(t.amount / t.splitMemberIds.length), 0);
      });
      return row;
    });
  }, [yearTxs, selectedYear, members]);

  const yearTotal = yearTxs.reduce((s, t) => s + t.amount, 0);
  const activeMonths = monthlyData.filter((d) => d['합계'] > 0);
  const monthlyAvg = activeMonths.length > 0 ? Math.round(yearTotal / activeMonths.length) : 0;
  const maxMonth = monthlyData.reduce((best, d) => (d['합계'] > best['합계'] ? d : best), monthlyData[0]);

  // 멤버별 연간 총 분담금
  const memberYearTotals = useMemo(() => {
    return members.map((m) => ({
      ...m,
      total: yearTxs
        .filter((t) => t.splitMemberIds.includes(m.id))
        .reduce((s, t) => s + Math.round(t.amount / t.splitMemberIds.length), 0),
      paid: yearTxs
        .filter((t) => t.payerId === m.id)
        .reduce((s, t) => s + t.amount, 0),
    }));
  }, [members, yearTxs]);

  return (
    <div className="analysis-page">
      {/* 헤더: 연도 선택 + 뷰 토글 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setViewMode('total')}
            style={{
              padding: '8px 18px', borderRadius: 20, fontSize: 13, fontWeight: 600,
              border: `2px solid ${viewMode === 'total' ? 'var(--primary)' : 'var(--border)'}`,
              background: viewMode === 'total' ? 'var(--primary)' : 'var(--card)',
              color: viewMode === 'total' ? '#fff' : 'var(--text)',
              cursor: 'pointer', transition: 'all 0.15s',
            }}
          >📊 전체 합계</button>
          <button
            onClick={() => setViewMode('member')}
            style={{
              padding: '8px 18px', borderRadius: 20, fontSize: 13, fontWeight: 600,
              border: `2px solid ${viewMode === 'member' ? 'var(--primary)' : 'var(--border)'}`,
              background: viewMode === 'member' ? 'var(--primary)' : 'var(--card)',
              color: viewMode === 'member' ? '#fff' : 'var(--text)',
              cursor: 'pointer', transition: 'all 0.15s',
            }}
          >👥 멤버별</button>
        </div>

        {/* 연도 화살표 선택 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button style={navBtnStyle(canPrev)} disabled={!canPrev} onClick={() => canPrev && setSelectedYear(years[yearIdx + 1])}>‹</button>
          <span style={{
            padding: '6px 20px', borderRadius: 8, border: '1px solid var(--border)',
            background: 'var(--card)', fontSize: 15, fontWeight: 700,
            minWidth: 80, textAlign: 'center',
          }}>{selectedYear}년</span>
          <button style={navBtnStyle(canNext)} disabled={!canNext} onClick={() => canNext && setSelectedYear(years[yearIdx - 1])}>›</button>
        </div>
      </div>

      {/* 요약 카드 */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="sc-label">📊 연간 총 지출</div>
          <div className="sc-value">{fmtMoney(yearTotal)}</div>
          <div className="sc-sub">{yearTxs.length}건</div>
        </div>
        <div className="stat-card">
          <div className="sc-label">📅 월 평균 지출</div>
          <div className="sc-value">{fmtMoney(monthlyAvg)}</div>
          <div className="sc-sub">지출 있는 {activeMonths.length}개월 기준</div>
        </div>
        <div className="stat-card">
          <div className="sc-label">🔺 최대 지출월</div>
          <div className="sc-value" style={{ fontSize: 20 }}>{maxMonth?.['합계'] > 0 ? maxMonth.month : '-'}</div>
          <div className="sc-sub">{maxMonth?.['합계'] > 0 ? fmtMoney(maxMonth['합계']) : '데이터 없음'}</div>
        </div>
      </div>

      {/* 월별 바 차트 */}
      <div className="chart-card">
        <h3>{selectedYear}년 월별 지출 추이</h3>
        {yearTotal > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={monthlyData} margin={{ top: 8, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" fontSize={12} />
              <YAxis fontSize={11} tickFormatter={(v) => v === 0 ? '0' : `${Math.round(v / 1000)}K`} />
              <Tooltip content={<CustomTooltip />} />
              {viewMode === 'total' ? (
                <Bar dataKey="합계" fill="var(--primary)" radius={[4, 4, 0, 0]} />
              ) : (
                members.map((m) => (
                  <Bar key={m.id} dataKey={m.name} fill={m.color} radius={[4, 4, 0, 0]} stackId="a" />
                ))
              )}
              {viewMode === 'member' && <Legend />}
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="empty-state" style={{ padding: 60 }}>
            <div className="empty-icon">📊</div>
            <p>{selectedYear}년 지출 데이터가 없습니다</p>
          </div>
        )}
      </div>

      {/* 월별 상세 테이블 */}
      <div className="tx-card" style={{ overflowX: 'auto' }}>
        <table className="tx-table">
          <thead>
            <tr>
              <th>월</th>
              <th>건수</th>
              {viewMode === 'member' && members.map((m) => (
                <th key={m.id}>{m.avatar} {m.name}</th>
              ))}
              <th>합계</th>
            </tr>
          </thead>
          <tbody>
            {monthlyData.map((row) => {
              const isEmpty = row['합계'] === 0;
              return (
                <tr key={row.month} style={{ opacity: isEmpty ? 0.4 : 1 }}>
                  <td><span className="tx-date">{row.month}</span></td>
                  <td style={{ color: 'var(--text-sub)', fontSize: 13 }}>{row.count}건</td>
                  {viewMode === 'member' && members.map((m) => (
                    <td key={m.id} style={{ fontSize: 13, color: m.color, fontWeight: 600 }}>
                      {row[m.name] > 0 ? fmtMoney(row[m.name]) : '-'}
                    </td>
                  ))}
                  <td><span className="tx-amount">{isEmpty ? '-' : fmtMoney(row['합계'])}</span></td>
                </tr>
              );
            })}
            {/* 합계 행 */}
            <tr style={{ fontWeight: 700, borderTop: '2px solid var(--border)' }}>
              <td colSpan={2} style={{ fontWeight: 700 }}>연간 합계</td>
              {viewMode === 'member' && members.map((m) => {
                const mt = memberYearTotals.find((x) => x.id === m.id);
                return (
                  <td key={m.id} style={{ fontSize: 13, color: m.color, fontWeight: 700 }}>
                    {mt && mt.total > 0 ? fmtMoney(mt.total) : '-'}
                  </td>
                );
              })}
              <td><span className="tx-amount">{fmtMoney(yearTotal)}</span></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 멤버별 연간 요약 */}
      {viewMode === 'member' && (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${members.length}, 1fr)`, gap: 12 }}>
          {memberYearTotals.map((m) => (
            <div key={m.id} className="stat-card" style={{ borderTop: `3px solid ${m.color}` }}>
              <div className="sc-label">{m.avatar} {m.name}</div>
              <div className="sc-value" style={{ color: m.color }}>{fmtMoney(m.total)}</div>
              <div className="sc-sub">분담금 합계</div>
              <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text-sub)' }}>
                결제: {fmtMoney(m.paid)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
