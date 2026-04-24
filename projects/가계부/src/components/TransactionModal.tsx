import { useState, useEffect } from 'react';
import type { Member, Transaction } from '../types';
import type { Category } from '../types';

const CATEGORIES: { value: Category; icon: string }[] = [
  { value: '식비', icon: '🍽️' },
  { value: '카페', icon: '☕' },
  { value: '쇼핑', icon: '🛍️' },
  { value: '교통', icon: '🚌' },
  { value: '생활', icon: '🏠' },
  { value: '문화', icon: '🎬' },
  { value: '의료', icon: '💊' },
  { value: '기타', icon: '📦' },
];

interface Props {
  members: Member[];
  tx?: Transaction;
  onSave: (tx: Omit<Transaction, 'id'> & { id?: string }) => void;
  onClose: () => void;
}

// "20250520", "2025.05.20", "2025/05/20", "05/20", "5/20" 등 → "YYYY-MM-DD"
function parseDate(raw: string): string | null {
  const s = raw.trim().replace(/[./]/g, '-');
  // YYYY-MM-DD
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(s)) {
    const [y, m, d] = s.split('-');
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  // YYYYMMDD
  if (/^\d{8}$/.test(s)) {
    return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
  }
  // MM-DD (올해)
  if (/^\d{1,2}-\d{1,2}$/.test(s)) {
    const [m, d] = s.split('-');
    const y = new Date().getFullYear();
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return null;
}

export default function TransactionModal({ members, tx, onSave, onClose }: Props) {
  const [date, setDate] = useState(tx?.date ?? new Date().toISOString().slice(0, 10));
  const [dateText, setDateText] = useState(tx?.date ?? new Date().toISOString().slice(0, 10));
  const [dateError, setDateError] = useState('');
  const [payerId, setPayerId] = useState(tx?.payerId ?? members[0]?.id ?? '');
  const [splitIds, setSplitIds] = useState<string[]>(tx?.splitMemberIds ?? members.map((m) => m.id));
  const [amount, setAmount] = useState(tx?.amount.toString() ?? '');
  const [category, setCategory] = useState<Category>(tx?.category ?? '식비');
  const [description, setDescription] = useState(tx?.description ?? '');

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const toggleSplit = (id: string) => {
    setSplitIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleDateTextChange = (val: string) => {
    setDateText(val);
    const parsed = parseDate(val);
    if (parsed) {
      setDate(parsed);
      setDateError('');
    } else {
      setDateError('날짜 형식: 2025-05-20 또는 2025.05.20 또는 05/20');
    }
  };

  const handleDatePickerChange = (val: string) => {
    setDate(val);
    setDateText(val);
    setDateError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || splitIds.length === 0) return;
    if (!date || dateError) return;
    onSave({
      id: tx?.id,
      date, payerId,
      splitMemberIds: splitIds,
      amount: Number(amount.replace(/,/g, '')),
      category, description,
    });
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2>{tx ? '지출 수정' : '지출 등록'}</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>날짜</label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', flexDirection: 'column' }}>
              <div style={{ display: 'flex', gap: 8, width: '100%' }}>
                {/* 텍스트 직접 입력 */}
                <input
                  type="text"
                  value={dateText}
                  onChange={(e) => handleDateTextChange(e.target.value)}
                  placeholder="2025-05-20 또는 5/20"
                  style={{ flex: 1, borderColor: dateError ? 'var(--red)' : undefined }}
                />
                {/* 달력 픽커 */}
                <input
                  type="date"
                  value={date}
                  onChange={(e) => handleDatePickerChange(e.target.value)}
                  style={{ width: 44, padding: '10px 6px', cursor: 'pointer', flexShrink: 0 }}
                  title="달력으로 선택"
                />
              </div>
              {dateError && (
                <span style={{ fontSize: 11, color: 'var(--red)' }}>{dateError}</span>
              )}
              {!dateError && date && (
                <span style={{ fontSize: 11, color: 'var(--text-sub)' }}>
                  ✓ {new Date(date + 'T00:00:00').toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })}
                </span>
              )}
            </div>
          </div>
          <div className="form-group">
            <label>결제자</label>
            <select value={payerId} onChange={(e) => setPayerId(e.target.value)} required>
              {members.map((m) => (
                <option key={m.id} value={m.id}>{m.avatar} {m.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>나누는 사람</label>
            <div className="member-toggle-list">
              {members.map((m) => (
                <button
                  key={m.id} type="button"
                  className={`member-toggle ${splitIds.includes(m.id) ? 'selected' : ''}`}
                  onClick={() => toggleSplit(m.id)}
                >
                  <span>{m.avatar}</span>
                  <span>{m.name}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label>금액 (원)</label>
            <input
              type="number" value={amount} min="0"
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0" required
            />
          </div>
          <div className="form-group">
            <label>카테고리</label>
            <select value={category} onChange={(e) => setCategory(e.target.value as Category)}>
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.icon} {c.value}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>내용</label>
            <input
              type="text" value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="예) 스타벅스, 마트 장보기"
              required
            />
          </div>
          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>취소</button>
            <button type="submit" className="btn-primary">{tx ? '수정하기' : '등록하기'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
