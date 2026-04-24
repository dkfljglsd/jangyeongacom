import { useState, useMemo } from 'react';
import type { Member, Transaction } from '../types';

const CAT_COLORS: Record<string, string> = {
  식비: '#7C6FF7', 카페: '#F4845F', 쇼핑: '#F9C74F', 교통: '#4ECDC4',
  생활: '#90BE6D', 문화: '#F8961E', 의료: '#43AA8B', 기타: '#B5B5B5',
};
const CAT_ICONS: Record<string, string> = {
  식비: '🍽️', 카페: '☕', 쇼핑: '🛍️', 교통: '🚌',
  생활: '🏠', 문화: '🎬', 의료: '💊', 기타: '📦',
};

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

function fmtMoney(n: number) { return n.toLocaleString('ko-KR') + '원'; }
function fmtK(n: number) {
  if (n === 0) return '';
  return n.toLocaleString('ko-KR');
}

interface Props {
  members: Member[];
  transactions: Transaction[];
}

export default function CalendarPage({ members, transactions }: Props) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState(today.toISOString().slice(0, 10));
  const [filterMember, setFilterMember] = useState<'all' | string>('all');

  const getMember = (id: string) => members.find((m) => m.id === id);
  const selectedMember = filterMember !== 'all' ? getMember(filterMember) : null;

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  };

  // 달력 셀 목록
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrev = new Date(year, month, 0).getDate();
    const cells: { date: string; day: number; current: boolean }[] = [];

    for (let i = firstDay - 1; i >= 0; i--) {
      const d = daysInPrev - i;
      const m2 = month === 0 ? 12 : month;
      const y2 = month === 0 ? year - 1 : year;
      cells.push({ date: `${y2}-${String(m2).padStart(2, '0')}-${String(d).padStart(2, '0')}`, day: d, current: false });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ date: `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`, day: d, current: true });
    }
    const remaining = 42 - cells.length;
    for (let d = 1; d <= remaining; d++) {
      const m2 = month === 11 ? 1 : month + 2;
      const y2 = month === 11 ? year + 1 : year;
      cells.push({ date: `${y2}-${String(m2).padStart(2, '0')}-${String(d).padStart(2, '0')}`, day: d, current: false });
    }
    return cells;
  }, [year, month]);

  // 날짜별 전체 거래
  const txByDate = useMemo(() => {
    const map: Record<string, Transaction[]> = {};
    transactions.forEach((t) => {
      if (!map[t.date]) map[t.date] = [];
      map[t.date].push(t);
    });
    return map;
  }, [transactions]);

  // 특정 날짜에서 filterMember 기준 금액 계산
  const getDayAmount = (date: string) => {
    const txs = txByDate[date] ?? [];
    if (filterMember === 'all') {
      return txs.reduce((s, t) => s + t.amount, 0);
    }
    // 개인: 해당 멤버의 분담 금액
    return txs
      .filter((t) => t.splitMemberIds.includes(filterMember))
      .reduce((s, t) => s + Math.round(t.amount / t.splitMemberIds.length), 0);
  };

  // 선택한 날의 거래 목록 (필터 적용)
  const selectedTxs = useMemo(() => {
    const txs = txByDate[selectedDate] ?? [];
    if (filterMember === 'all') return txs;
    return txs.filter((t) => t.splitMemberIds.includes(filterMember));
  }, [txByDate, selectedDate, filterMember]);

  const selectedTotal = useMemo(() => {
    if (filterMember === 'all') {
      return selectedTxs.reduce((s, t) => s + t.amount, 0);
    }
    return selectedTxs.reduce((s, t) => s + Math.round(t.amount / t.splitMemberIds.length), 0);
  }, [selectedTxs, filterMember]);

  // 이번 달 전체/개인 합계
  const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
  const monthTotal = useMemo(() => {
    const txs = transactions.filter((t) => t.date.startsWith(monthPrefix));
    if (filterMember === 'all') return txs.reduce((s, t) => s + t.amount, 0);
    return txs
      .filter((t) => t.splitMemberIds.includes(filterMember))
      .reduce((s, t) => s + Math.round(t.amount / t.splitMemberIds.length), 0);
  }, [transactions, monthPrefix, filterMember]);

  // 멤버별 이달 분담 합계 (전체 뷰용 하단 요약)
  const memberMonthTotals = useMemo(() => {
    const txs = transactions.filter((t) => t.date.startsWith(monthPrefix));
    return members.map((m) => ({
      ...m,
      total: txs
        .filter((t) => t.splitMemberIds.includes(m.id))
        .reduce((s, t) => s + Math.round(t.amount / t.splitMemberIds.length), 0),
    }));
  }, [members, transactions, monthPrefix]);

  const todayStr = today.toISOString().slice(0, 10);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* ─── 상단: 멤버 필터 탭 ─── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            onClick={() => setFilterMember('all')}
            style={{
              padding: '7px 16px', borderRadius: 20, fontSize: 13, fontWeight: 600,
              border: `2px solid ${filterMember === 'all' ? 'var(--primary)' : 'var(--border)'}`,
              background: filterMember === 'all' ? 'var(--primary)' : 'var(--card)',
              color: filterMember === 'all' ? '#fff' : 'var(--text)',
              cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            📅 전체
          </button>
          {members.map((m) => (
            <button
              key={m.id}
              onClick={() => setFilterMember(m.id)}
              style={{
                padding: '7px 16px', borderRadius: 20, fontSize: 13, fontWeight: 600,
                border: `2px solid ${filterMember === m.id ? m.color : 'var(--border)'}`,
                background: filterMember === m.id ? m.color + '22' : 'var(--card)',
                color: filterMember === m.id ? m.color : 'var(--text)',
                cursor: 'pointer', transition: 'all 0.15s',
                display: 'flex', alignItems: 'center', gap: 5,
              }}
            >
              {m.avatar} {m.name}
            </button>
          ))}
        </div>

        {/* 이달 합계 뱃지 */}
        <div style={{
          padding: '8px 16px', borderRadius: 10,
          background: selectedMember ? selectedMember.color + '22' : 'var(--primary-light)',
          border: `1px solid ${selectedMember ? selectedMember.color + '55' : 'var(--primary)'}`,
          fontSize: 13,
        }}>
          <span style={{ color: 'var(--text-sub)' }}>{year}년 {month + 1}월 </span>
          <span style={{ fontWeight: 700, color: selectedMember ? selectedMember.color : 'var(--primary)' }}>
            {selectedMember ? `${selectedMember.name} 분담 ` : '총 지출 '}
            {fmtMoney(monthTotal)}
          </span>
        </div>
      </div>

      <div className="calendar-page">
        {/* ─── 달력 ─── */}
        <div className="cal-card">
          <div className="cal-nav">
            <button className="nav-btn" onClick={prevMonth}>‹</button>
            <h3>{year}년 {month + 1}월</h3>
            <button className="nav-btn" onClick={nextMonth}>›</button>
          </div>

          <div className="cal-grid">
            {WEEKDAYS.map((d) => (
              <div key={d} className="cal-weekday"
                style={{ color: d === '일' ? '#EF4444' : d === '토' ? '#3B82F6' : undefined }}>
                {d}
              </div>
            ))}

            {calendarDays.map(({ date, day, current }) => {
              const allTxs = txByDate[date] ?? [];
              const dayAmt = getDayAmount(date);
              const isToday = date === todayStr;
              const isSelected = date === selectedDate;

              // 멤버별 도트 (전체 뷰: 카테고리색 / 개인 뷰: 멤버색)
              const dotTxs = filterMember === 'all'
                ? allTxs
                : allTxs.filter((t) => t.splitMemberIds.includes(filterMember));

              return (
                <div
                  key={date}
                  className={`cal-day ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''} ${!current ? 'other-month' : ''}`}
                  onClick={() => setSelectedDate(date)}
                >
                  <div className="cal-day-num"
                    style={{ color: isSelected ? undefined : day % 7 === 0 && current ? '#EF4444' : undefined }}>
                    {day}
                  </div>
                  {dayAmt > 0 && (
                    <div className="cal-day-expense">{fmtK(dayAmt)}</div>
                  )}
                  {dotTxs.length > 0 && (
                    <div className="cal-day-dots">
                      {filterMember === 'all'
                        ? dotTxs.slice(0, 4).map((t, i) => (
                          <div key={i} className="cal-dot" style={{ background: CAT_COLORS[t.category] }} />
                        ))
                        : dotTxs.slice(0, 4).map((t, i) => (
                          <div key={i} className="cal-dot"
                            style={{ background: getMember(t.payerId)?.color ?? CAT_COLORS[t.category] }} />
                        ))
                      }
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* 전체 뷰 전용: 멤버별 이달 합계 바 */}
          {filterMember === 'all' && (
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {memberMonthTotals.map((m) => (
                <div key={m.id} style={{
                  flex: '1 1 0', minWidth: 80, padding: '8px 12px', borderRadius: 10,
                  background: m.color + '15', border: `1px solid ${m.color}44`,
                  display: 'flex', flexDirection: 'column', gap: 3,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
                    <span>{m.avatar}</span>
                    <span style={{ fontWeight: 600, color: m.color }}>{m.name}</span>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: m.color }}>{fmtMoney(m.total)}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-sub)' }}>이달 분담</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ─── 날짜 상세 ─── */}
        <div className="day-detail-card">
          <h3>
            {selectedDate.replace(/-/g, '.')} ({WEEKDAYS[new Date(selectedDate + 'T00:00:00').getDay()]})
          </h3>
          <p className="day-total">
            {selectedTxs.length > 0
              ? `${selectedMember ? `${selectedMember.name} 분담 ` : '총 지출 '}${fmtMoney(selectedTotal)} · ${selectedTxs.length}건`
              : '지출 없음'}
          </p>

          <div className="day-tx-list">
            {selectedTxs.length === 0 && (
              <p style={{ color: 'var(--text-sub)', fontSize: 13 }}>
                {selectedMember ? `${selectedMember.name}의 지출이 없어요.` : '이 날 지출 내역이 없어요.'}
              </p>
            )}
            {selectedTxs.map((tx) => {
              const payer = getMember(tx.payerId);
              const myShare = filterMember === 'all'
                ? tx.amount
                : Math.round(tx.amount / tx.splitMemberIds.length);
              const isMyPay = filterMember !== 'all' && tx.payerId === filterMember;

              return (
                <div key={tx.id} className="day-tx-item"
                  style={{ background: isMyPay ? '#F0FDF4' : undefined, borderColor: isMyPay ? '#86EFAC' : undefined }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                    background: CAT_COLORS[tx.category] + '33',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
                  }}>
                    {CAT_ICONS[tx.category]}
                  </div>
                  <div className="day-tx-info">
                    <div className="day-tx-desc">{tx.description}</div>
                    <div className="day-tx-payer">
                      <span style={{ background: payer?.color + '33', borderRadius: 4, padding: '1px 6px', whiteSpace: 'nowrap' }}>
                        {payer?.avatar} {payer?.name}
                      </span>
                      <span style={{ whiteSpace: 'nowrap' }}>결제 · {tx.splitMemberIds.length}명 나눔</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div className="day-tx-amount">{fmtMoney(myShare)}</div>
                    {filterMember !== 'all' && (
                      <div style={{ fontSize: 10, color: 'var(--text-sub)' }}>
                        {isMyPay ? '내가 결제' : `전체 ${fmtMoney(tx.amount)}`}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 전체 뷰: 해당 날 멤버별 분담 요약 */}
          {filterMember === 'all' && selectedTxs.length > 0 && (
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-sub)', marginBottom: 8 }}>멤버별 분담</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {members.map((m) => {
                  const amt = selectedTxs
                    .filter((t) => t.splitMemberIds.includes(m.id))
                    .reduce((s, t) => s + Math.round(t.amount / t.splitMemberIds.length), 0);
                  if (amt === 0) return null;
                  return (
                    <div key={m.id} style={{
                      padding: '6px 12px', borderRadius: 8,
                      background: m.color + '18', border: `1px solid ${m.color}44`,
                      display: 'flex', alignItems: 'center', gap: 6, fontSize: 13,
                    }}>
                      <span>{m.avatar}</span>
                      <span style={{ fontWeight: 600, color: m.color }}>{m.name}</span>
                      <span style={{ fontWeight: 700 }}>{fmtMoney(amt)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
