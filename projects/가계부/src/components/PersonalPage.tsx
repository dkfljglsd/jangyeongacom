import { useState, useMemo, useEffect } from 'react';
import type { Member, Transaction, PersonalTransaction } from '../types';
import { loadPasswordMap, savePasswordMap } from '../utils/storage';

const INCOME_CATS = ['급여', '용돈', '부수입', '환급', '기타수입'];
const EXPENSE_CATS = ['식비', '카페', '쇼핑', '교통', '생활', '문화', '의료', '기타'];
const CAT_ICONS: Record<string, string> = {
  급여: '💼', 용돈: '💵', 부수입: '💰', 환급: '🔄', 기타수입: '➕',
  식비: '🍽️', 카페: '☕', 쇼핑: '🛍️', 교통: '🚌',
  생활: '🏠', 문화: '🎬', 의료: '💊', 기타: '📦',
};

function fmtMoney(n: number) { return n.toLocaleString('ko-KR') + '원'; }
function fmtDate(d: string) {
  const date = new Date(d + 'T00:00:00');
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${d.slice(5).replace('-', '.')}(${days[date.getDay()]})`;
}
function today() { return new Date().toISOString().slice(0, 10); }

interface ModalProps {
  memberId: string;
  memberColor: string;
  tx?: PersonalTransaction;
  onSave: (tx: Omit<PersonalTransaction, 'id'> & { id?: string }) => void;
  onClose: () => void;
}

function PersonalModal({ memberId, memberColor, tx, onSave, onClose }: ModalProps) {
  const [type, setType] = useState<'income' | 'expense'>(tx?.type ?? 'expense');
  const [amount, setAmount] = useState(tx ? String(tx.amount) : '');
  const [category, setCategory] = useState(tx?.category ?? (tx?.type === 'income' ? INCOME_CATS[0] : EXPENSE_CATS[0]));
  const [description, setDescription] = useState(tx?.description ?? '');
  const [date, setDate] = useState(tx?.date ?? today());

  const cats = type === 'income' ? INCOME_CATS : EXPENSE_CATS;

  const handleTypeChange = (t: 'income' | 'expense') => {
    setType(t);
    setCategory(t === 'income' ? INCOME_CATS[0] : EXPENSE_CATS[0]);
  };

  const handleSubmit = () => {
    const n = parseInt(amount.replace(/,/g, ''), 10);
    if (!n || n <= 0) { alert('금액을 입력해주세요'); return; }
    if (!description.trim()) { alert('내용을 입력해주세요'); return; }
    onSave({ id: tx?.id, memberId, date, type, amount: n, category, description: description.trim() });
  };

  const isIncome = type === 'income';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{tx ? '내역 수정' : '내역 추가'}</h2>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          <button
            onClick={() => handleTypeChange('income')}
            style={{
              flex: 1, padding: '12px 0', borderRadius: 10, fontWeight: 700, fontSize: 15,
              border: `2px solid ${isIncome ? '#22c55e' : 'var(--border)'}`,
              background: isIncome ? '#f0fdf4' : 'var(--bg)',
              color: isIncome ? '#16a34a' : 'var(--text-sub)',
              cursor: 'pointer', transition: 'all 0.15s',
            }}
          >＋ 수입</button>
          <button
            onClick={() => handleTypeChange('expense')}
            style={{
              flex: 1, padding: '12px 0', borderRadius: 10, fontWeight: 700, fontSize: 15,
              border: `2px solid ${!isIncome ? '#ef4444' : 'var(--border)'}`,
              background: !isIncome ? '#fef2f2' : 'var(--bg)',
              color: !isIncome ? '#dc2626' : 'var(--text-sub)',
              cursor: 'pointer', transition: 'all 0.15s',
            }}
          >－ 지출</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group">
            <label className="form-label">날짜</label>
            <input type="date" className="form-input" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">금액</label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                inputMode="numeric"
                className="form-input"
                placeholder="0"
                value={amount}
                onChange={(e) => {
                  const v = e.target.value.replace(/[^0-9]/g, '');
                  setAmount(v ? parseInt(v).toLocaleString('ko-KR') : '');
                }}
                style={{ paddingRight: 32 }}
              />
              <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: 'var(--text-sub)' }}>원</span>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">카테고리</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {cats.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  style={{
                    padding: '6px 12px', borderRadius: 16, fontSize: 12, fontWeight: 600,
                    border: `1.5px solid ${category === c ? (isIncome ? '#22c55e' : memberColor) : 'var(--border)'}`,
                    background: category === c ? (isIncome ? '#f0fdf4' : memberColor + '18') : 'var(--bg)',
                    color: category === c ? (isIncome ? '#16a34a' : memberColor) : 'var(--text-sub)',
                    cursor: 'pointer',
                  }}
                >{CAT_ICONS[c]} {c}</button>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">내용</label>
            <input
              type="text"
              className="form-input"
              placeholder="무엇에 썼나요?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 24 }}>
          <button className="btn-secondary" style={{ flex: 1 }} onClick={onClose}>취소</button>
          <button
            onClick={handleSubmit}
            style={{
              flex: 2, padding: '12px 0', borderRadius: 10, fontWeight: 700, fontSize: 14,
              border: 'none', cursor: 'pointer',
              background: isIncome ? '#22c55e' : memberColor,
              color: '#fff',
            }}
          >{tx ? '수정하기' : (isIncome ? '수입 추가' : '지출 추가')}</button>
        </div>
      </div>
    </div>
  );
}

type ListItem =
  | { kind: 'personal'; tx: PersonalTransaction }
  | { kind: 'shared'; tx: Transaction; share: number; payerName: string };

// ─── 잠금 화면 ───────────────────────────────────────────────
interface LockScreenProps {
  member: Member;
  onUnlock: (pw: string) => boolean;
}
function LockScreen({ member, onUnlock }: LockScreenProps) {
  const [input, setInput] = useState('');
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);

  const handleTry = () => {
    if (onUnlock(input)) return;
    setError(true);
    setShake(true);
    setInput('');
    setTimeout(() => setShake(false), 500);
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      minHeight: 360, gap: 20,
    }}>
      <div style={{
        width: 72, height: 72, borderRadius: '50%',
        background: member.color + '22', display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: 36, border: `2px solid ${member.color}`,
      }}>{member.avatar}</div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 18, fontWeight: 700 }}>{member.name}의 개인 내역</div>
        <div style={{ fontSize: 13, color: 'var(--text-sub)', marginTop: 4 }}>비밀번호를 입력하세요</div>
      </div>
      <div style={{ animation: shake ? 'shake 0.4s ease' : undefined }}>
        <input
          type="password"
          className="form-input"
          placeholder="비밀번호"
          value={input}
          onChange={(e) => { setInput(e.target.value); setError(false); }}
          onKeyDown={(e) => e.key === 'Enter' && handleTry()}
          autoFocus
          style={{ textAlign: 'center', width: 200, fontSize: 18, letterSpacing: 4,
            borderColor: error ? '#ef4444' : undefined }}
        />
        {error && <div style={{ fontSize: 12, color: '#ef4444', textAlign: 'center', marginTop: 6 }}>비밀번호가 틀렸습니다</div>}
      </div>
      <button
        onClick={handleTry}
        style={{
          padding: '10px 32px', borderRadius: 10, fontWeight: 700, fontSize: 14,
          background: member.color, color: '#fff', border: 'none', cursor: 'pointer',
        }}
      >🔓 잠금 해제</button>
      <style>{`@keyframes shake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-8px)}40%,80%{transform:translateX(8px)}}`}</style>
    </div>
  );
}

// ─── 비밀번호 관리 모달 ───────────────────────────────────────
interface PwModalProps {
  member: Member;
  hasPassword: boolean;
  onSetPassword: (pw: string) => void;
  onRemovePassword: () => void;
  onClose: () => void;
}
function PasswordModal({ member, hasPassword, onSetPassword, onRemovePassword, onClose }: PwModalProps) {
  const [mode, setMode] = useState<'menu' | 'set' | 'remove'>(hasPassword ? 'menu' : 'set');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [currentPw, setCurrentPw] = useState('');
  const [error, setError] = useState('');

  const handleSet = () => {
    if (newPw.length < 4) { setError('비밀번호는 4자 이상이어야 합니다'); return; }
    if (newPw !== confirmPw) { setError('비밀번호가 일치하지 않습니다'); return; }
    onSetPassword(newPw);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 380 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🔐 비밀번호 관리</h2>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20,
          padding: '10px 14px', borderRadius: 10, background: member.color + '15',
          border: `1px solid ${member.color}33` }}>
          <span style={{ fontSize: 24 }}>{member.avatar}</span>
          <span style={{ fontWeight: 700, color: member.color }}>{member.name}</span>
          <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-sub)' }}>
            {hasPassword ? '🔒 비밀번호 설정됨' : '🔓 비밀번호 없음'}
          </span>
        </div>

        {mode === 'menu' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              onClick={() => { setMode('set'); setError(''); }}
              style={{ padding: '12px 16px', borderRadius: 10, border: '1.5px solid var(--border)',
                background: 'var(--bg)', fontWeight: 600, fontSize: 14, cursor: 'pointer', textAlign: 'left' }}
            >🔑 비밀번호 변경</button>
            <button
              onClick={() => { setMode('remove'); setError(''); }}
              style={{ padding: '12px 16px', borderRadius: 10, border: '1.5px solid #fecaca',
                background: '#fef2f2', color: '#dc2626', fontWeight: 600, fontSize: 14, cursor: 'pointer', textAlign: 'left' }}
            >🔓 비밀번호 해제</button>
          </div>
        )}

        {mode === 'set' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {hasPassword && (
              <div className="form-group">
                <label className="form-label">현재 비밀번호</label>
                <input type="password" className="form-input" placeholder="현재 비밀번호 입력"
                  value={currentPw} onChange={(e) => { setCurrentPw(e.target.value); setError(''); }} />
              </div>
            )}
            <div className="form-group">
              <label className="form-label">새 비밀번호</label>
              <input type="password" className="form-input" placeholder="4자 이상"
                value={newPw} onChange={(e) => { setNewPw(e.target.value); setError(''); }} />
            </div>
            <div className="form-group">
              <label className="form-label">비밀번호 확인</label>
              <input type="password" className="form-input" placeholder="다시 입력"
                value={confirmPw} onChange={(e) => { setConfirmPw(e.target.value); setError(''); }}
                onKeyDown={(e) => e.key === 'Enter' && handleSet()} />
            </div>
            {error && <div style={{ fontSize: 12, color: '#ef4444' }}>{error}</div>}
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              {hasPassword && <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setMode('menu')}>뒤로</button>}
              <button
                onClick={handleSet}
                style={{ flex: 2, padding: '11px 0', borderRadius: 10, fontWeight: 700,
                  background: member.color, color: '#fff', border: 'none', cursor: 'pointer' }}
              >{hasPassword ? '변경하기' : '설정하기'}</button>
            </div>
          </div>
        )}

        {mode === 'remove' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">현재 비밀번호 확인</label>
              <input type="password" className="form-input" placeholder="현재 비밀번호 입력"
                value={currentPw} onChange={(e) => { setCurrentPw(e.target.value); setError(''); }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { onRemovePassword(); onClose(); }
                }} />
            </div>
            {error && <div style={{ fontSize: 12, color: '#ef4444' }}>{error}</div>}
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setMode('menu')}>뒤로</button>
              <button
                onClick={() => { onRemovePassword(); onClose(); }}
                style={{ flex: 2, padding: '11px 0', borderRadius: 10, fontWeight: 700,
                  background: '#ef4444', color: '#fff', border: 'none', cursor: 'pointer' }}
              >비밀번호 해제</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface Props {
  members: Member[];
  transactions: Transaction[];
  personalTxs: PersonalTransaction[];
  onAdd: (tx: Omit<PersonalTransaction, 'id'>) => void;
  onEdit: (tx: PersonalTransaction) => void;
  onDelete: (id: string) => void;
}

export default function PersonalPage({ members, transactions, personalTxs, onAdd, onEdit, onDelete }: Props) {
  const [selectedMemberId, setSelectedMemberId] = useState<string>(members[0]?.id ?? '');
  const [showModal, setShowModal] = useState(false);
  const [editTx, setEditTx] = useState<PersonalTransaction | undefined>();
  const [filterMonth, setFilterMonth] = useState('all');
  const [filterKind, setFilterKind] = useState<'all' | 'income' | 'personal' | 'shared'>('all');

  // 비밀번호
  const [passwordMap, setPasswordMap] = useState<Record<string, string>>(loadPasswordMap);
  const [unlockedSet, setUnlockedSet] = useState<Set<string>>(new Set());
  const [showPwModal, setShowPwModal] = useState(false);

  useEffect(() => { savePasswordMap(passwordMap); }, [passwordMap]);

  const isLocked = (memberId: string) =>
    !!passwordMap[memberId] && !unlockedSet.has(memberId);

  const tryUnlock = (memberId: string, pw: string): boolean => {
    if (passwordMap[memberId] === pw) {
      setUnlockedSet((prev) => new Set([...prev, memberId]));
      return true;
    }
    return false;
  };

  const setPassword = (memberId: string, pw: string) => {
    setPasswordMap((prev) => ({ ...prev, [memberId]: pw }));
    setUnlockedSet((prev) => new Set([...prev, memberId]));
  };

  const removePassword = (memberId: string) => {
    setPasswordMap((prev) => { const next = { ...prev }; delete next[memberId]; return next; });
  };

  const selectedMember = members.find((m) => m.id === selectedMemberId);

  // 개인 내역
  const myPersonalTxs = useMemo(
    () => personalTxs.filter((t) => t.memberId === selectedMemberId),
    [personalTxs, selectedMemberId]
  );

  // 공동 내역 (나눠쓴 것)
  const mySharedTxs = useMemo(
    () => transactions.filter((t) => t.splitMemberIds.includes(selectedMemberId)),
    [transactions, selectedMemberId]
  );

  // 월 목록 (개인 + 공동 합산)
  const months = useMemo(() => {
    const s = new Set([
      ...myPersonalTxs.map((t) => t.date.slice(0, 7)),
      ...mySharedTxs.map((t) => t.date.slice(0, 7)),
    ]);
    return Array.from(s).sort().reverse();
  }, [myPersonalTxs, mySharedTxs]);

  // 필터 적용
  const filteredPersonal = useMemo(
    () => myPersonalTxs.filter((t) => filterMonth === 'all' || t.date.startsWith(filterMonth)),
    [myPersonalTxs, filterMonth]
  );
  const filteredShared = useMemo(
    () => mySharedTxs.filter((t) => filterMonth === 'all' || t.date.startsWith(filterMonth)),
    [mySharedTxs, filterMonth]
  );

  // 합산 통계
  const totalIncome = filteredPersonal.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalPersonalExpense = filteredPersonal.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const totalSharedExpense = filteredShared.reduce((s, t) => s + Math.round(t.amount / t.splitMemberIds.length), 0);
  const totalExpenseAll = totalPersonalExpense + totalSharedExpense;
  const balance = totalIncome - totalExpenseAll;

  // 통합 리스트 (날짜 내림차순 + filterKind 적용)
  const allItems = useMemo((): ListItem[] => {
    const personalItems: ListItem[] = filteredPersonal
      .filter((tx) => filterKind === 'all' || filterKind === tx.type || filterKind === 'personal')
      .filter((_tx) => filterKind !== 'shared')
      .map((tx): ListItem => ({ kind: 'personal', tx }));

    const sharedItems: ListItem[] = (filterKind === 'all' || filterKind === 'shared')
      ? filteredShared.map((tx): ListItem => ({
          kind: 'shared',
          tx,
          share: Math.round(tx.amount / tx.splitMemberIds.length),
          payerName: members.find((m) => m.id === tx.payerId)?.name ?? '',
        }))
      : [];

    return [...personalItems, ...sharedItems].sort((a, b) => b.tx.date.localeCompare(a.tx.date));
  }, [filteredPersonal, filteredShared, filterKind, members]);

  const handleSave = (data: Omit<PersonalTransaction, 'id'> & { id?: string }) => {
    if (data.id) onEdit({ ...data, id: data.id } as PersonalTransaction);
    else { const { id: _id, ...rest } = data; onAdd(rest); }
    setShowModal(false);
    setEditTx(undefined);
  };

  if (members.length === 0) {
    return (
      <div className="empty-state" style={{ marginTop: 60 }}>
        <div className="empty-icon">👥</div>
        <p>멤버를 먼저 추가해주세요</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* 멤버 선택 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {members.map((m) => (
          <button
            key={m.id}
            onClick={() => { setSelectedMemberId(m.id); setFilterMonth('all'); setFilterKind('all'); }}
            style={{
              padding: '10px 20px', borderRadius: 20, fontSize: 13, fontWeight: 600,
              border: `2px solid ${selectedMemberId === m.id ? m.color : 'var(--border)'}`,
              background: selectedMemberId === m.id ? m.color + '22' : 'var(--card)',
              color: selectedMemberId === m.id ? m.color : 'var(--text-sub)',
              cursor: 'pointer', transition: 'all 0.15s',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <span style={{ fontSize: 18 }}>{m.avatar}</span>
            {m.name}
            {passwordMap[m.id] && (
              <span style={{ fontSize: 11 }}>{isLocked(m.id) ? '🔒' : '🔓'}</span>
            )}
          </button>
        ))}
      </div>

      {selectedMember && isLocked(selectedMember.id) && (
        <LockScreen
          member={selectedMember}
          onUnlock={(pw) => tryUnlock(selectedMember.id, pw)}
        />
      )}

      {selectedMember && !isLocked(selectedMember.id) && (
        <>
          {/* 비밀번호 관리 버튼 */}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={() => setShowPwModal(true)}
              style={{
                padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                border: '1.5px solid var(--border)', background: 'var(--card)',
                color: 'var(--text-sub)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
              }}
            >
              {passwordMap[selectedMember.id] ? '🔐 비밀번호 관리' : '🔓 비밀번호 설정'}
            </button>
          </div>

          {/* 요약 카드 4개 */}
          <div className="stats-row" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
            <div className="stat-card" style={{ borderTop: '3px solid #22c55e' }}>
              <div className="sc-label">💚 총 수입</div>
              <div className="sc-value" style={{ color: '#16a34a' }}>{fmtMoney(totalIncome)}</div>
              <div className="sc-sub">{filteredPersonal.filter((t) => t.type === 'income').length}건</div>
            </div>
            <div className="stat-card" style={{ borderTop: '3px solid #ef4444' }}>
              <div className="sc-label">💸 개인 지출</div>
              <div className="sc-value" style={{ color: '#dc2626' }}>{fmtMoney(totalPersonalExpense)}</div>
              <div className="sc-sub">{filteredPersonal.filter((t) => t.type === 'expense').length}건</div>
            </div>
            <div className="stat-card" style={{ borderTop: '3px solid #f97316' }}>
              <div className="sc-label">🤝 공동 분담금</div>
              <div className="sc-value" style={{ color: '#ea580c' }}>{fmtMoney(totalSharedExpense)}</div>
              <div className="sc-sub">{filteredShared.length}건 참여</div>
            </div>
            <div className="stat-card" style={{ borderTop: `3px solid ${selectedMember.color}` }}>
              <div className="sc-label">💰 잔액</div>
              <div className="sc-value" style={{ color: balance >= 0 ? '#16a34a' : '#dc2626' }}>
                {balance >= 0 ? '' : '-'}{fmtMoney(Math.abs(balance))}
              </div>
              <div className="sc-sub">수입 - 전체 지출</div>
            </div>
          </div>

          {/* 필터 바 */}
          <div className="filter-bar">
            <button
              className="add-btn"
              onClick={() => { setEditTx(undefined); setShowModal(true); }}
            >＋ 내역 추가</button>
            <div className="filter-select">
              <span>📅</span>
              <select value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)}>
                <option value="all">전체 날짜</option>
                {months.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            {/* 유형 필터 */}
            {(['all', 'income', 'personal', 'shared'] as const).map((k) => {
              const labels = { all: '전체', income: '💚 수입', personal: '💸 개인 지출', shared: '🤝 공동 지출' };
              const active = filterKind === k;
              return (
                <button
                  key={k}
                  onClick={() => setFilterKind(k)}
                  style={{
                    padding: '6px 12px', borderRadius: 16, fontSize: 12, fontWeight: 600,
                    border: `1.5px solid ${active ? (selectedMember?.color ?? 'var(--primary)') : 'var(--border)'}`,
                    background: active ? (selectedMember?.color ?? 'var(--primary)') + '18' : 'var(--card)',
                    color: active ? (selectedMember?.color ?? 'var(--primary)') : 'var(--text-sub)',
                    cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap',
                  }}
                >{labels[k]}</button>
              );
            })}
            <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--text-sub)', fontWeight: 600 }}>
              총 {allItems.length}건
            </span>
          </div>

          {/* 통합 내역 목록 */}
          <div className="tx-card">
            {allItems.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📝</div>
                <p>내역이 없습니다</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {allItems.map((item, i) => {
                  const date = item.tx.date;
                  const prevDate = i > 0 ? allItems[i - 1].tx.date : null;
                  const showDate = date !== prevDate;

                  if (item.kind === 'personal') {
                    const tx = item.tx;
                    const isIncome = tx.type === 'income';
                    return (
                      <div key={tx.id}>
                        {showDate && (
                          <div style={{ padding: '10px 16px 6px', fontSize: 12, fontWeight: 700, color: 'var(--text-sub)', borderBottom: '1px solid var(--border)' }}>
                            {fmtDate(tx.date)}
                          </div>
                        )}
                        <div
                          style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid var(--border)', transition: 'background 0.1s' }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg)')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = '')}
                        >
                          <div style={{ width: 40, height: 40, borderRadius: 12, flexShrink: 0, background: isIncome ? '#f0fdf4' : selectedMember.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                            {CAT_ICONS[tx.category] ?? '📦'}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{tx.description}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-sub)', marginTop: 2 }}>{tx.category}</div>
                          </div>
                          <div style={{ fontSize: 15, fontWeight: 700, color: isIncome ? '#16a34a' : '#dc2626', whiteSpace: 'nowrap' }}>
                            {isIncome ? '+' : '-'}{fmtMoney(tx.amount)}
                          </div>
                          <div className="tx-actions" style={{ flexShrink: 0 }}>
                            <button className="icon-btn" onClick={() => { setEditTx(tx); setShowModal(true); }} title="수정">✏️</button>
                            <button className="icon-btn danger" onClick={() => { if (confirm('이 내역을 삭제할까요?')) onDelete(tx.id); }} title="삭제">🗑️</button>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // 공동 내역
                  const { tx, share, payerName } = item;
                  const iAmPayer = tx.payerId === selectedMemberId;
                  return (
                    <div key={tx.id}>
                      {showDate && (
                        <div style={{ padding: '10px 16px 6px', fontSize: 12, fontWeight: 700, color: 'var(--text-sub)', borderBottom: '1px solid var(--border)' }}>
                          {fmtDate(tx.date)}
                        </div>
                      )}
                      <div
                        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid var(--border)', background: '#fffbf5', transition: 'background 0.1s' }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = '#fff3e0')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = '#fffbf5')}
                      >
                        <div style={{ width: 40, height: 40, borderRadius: 12, flexShrink: 0, background: '#fff3e0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                          {CAT_ICONS[tx.category] ?? '📦'}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{tx.description}</span>
                            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 6, background: '#fed7aa', color: '#c2410c' }}>공동</span>
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--text-sub)', marginTop: 2 }}>
                            {tx.category} · {iAmPayer ? '내가 결제' : `${payerName} 결제`} · {tx.splitMemberIds.length}명 나눔
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 15, fontWeight: 700, color: '#ea580c', whiteSpace: 'nowrap' }}>
                            -{fmtMoney(share)}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-sub)' }}>총 {fmtMoney(tx.amount)}</div>
                        </div>
                        {/* 공동 내역은 읽기 전용 */}
                        <div style={{ width: 56, flexShrink: 0 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {showModal && selectedMember && (
        <PersonalModal
          memberId={selectedMemberId}
          memberColor={selectedMember.color}
          tx={editTx}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditTx(undefined); }}
        />
      )}

      {showPwModal && selectedMember && (
        <PasswordModal
          member={selectedMember}
          hasPassword={!!passwordMap[selectedMember.id]}
          onSetPassword={(pw) => setPassword(selectedMember.id, pw)}
          onRemovePassword={() => removePassword(selectedMember.id)}
          onClose={() => setShowPwModal(false)}
        />
      )}
    </div>
  );
}
