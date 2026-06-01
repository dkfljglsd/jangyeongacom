import { useState, useEffect, useRef } from 'react';
import type { Member, Transaction, PaidMap, PersonalTransaction } from './types';
import {
  migrateFromLocalStorage,
  subscribeMembers, subscribeTransactions, subscribePaidMap, subscribePersonalTransactions,
  saveMembers,
  addTransactionToDb, updateTransactionInDb, deleteTransactionFromDb,
  savePaidMap,
  addPersonalTxToDb, updatePersonalTxInDb, deletePersonalTxFromDb,
} from './utils/storage';
import GaegyebuPage from './components/GaegyebuPage';
import LedgerPage from './components/LedgerPage';
import AnalysisPage from './components/AnalysisPage';
import CalendarPage from './components/CalendarPage';
import MemberModal from './components/MemberModal';
import YearlyPage from './components/YearlyPage';
import PersonalPage from './components/PersonalPage';

type Tab = 'gaegyebu' | 'settlement' | 'analysis' | 'calendar' | 'yearly' | 'personal';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'gaegyebu', label: '가계부', icon: '📒' },
  { id: 'settlement', label: '정산', icon: '💳' },
  { id: 'analysis', label: '분석', icon: '📊' },
  { id: 'calendar', label: '캘린더', icon: '📅' },
  { id: 'yearly', label: '연간', icon: '📈' },
  { id: 'personal', label: '개인', icon: '👤' },
];

export default function App() {
  const [tab, setTab] = useState<Tab>('gaegyebu');
  const [members, setMembers] = useState<Member[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [paidMap, setPaidMap] = useState<PaidMap>({});
  const [personalTxs, setPersonalTxs] = useState<PersonalTransaction[]>([]);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // stale closure 방지용 ref
  const paidMapRef = useRef<PaidMap>({});
  useEffect(() => { paidMapRef.current = paidMap; }, [paidMap]);

  useEffect(() => {
    const cleanups: Array<() => void> = [];
    let cancelled = false;

    (async () => {
      await migrateFromLocalStorage();
      if (cancelled) return;

      cleanups.push(subscribeMembers(setMembers));
      cleanups.push(subscribeTransactions(setTransactions));
      cleanups.push(subscribePaidMap(setPaidMap));
      cleanups.push(subscribePersonalTransactions(setPersonalTxs));
      setLoading(false);
    })().catch(err => {
      console.error('Firebase 연결 오류:', err);
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
      cleanups.forEach(fn => fn());
    };
  }, []);

  // ---- 개인 지출 ----
  const addPersonalTx = (tx: Omit<PersonalTransaction, 'id'>) => {
    addPersonalTxToDb({ ...tx, id: `p${Date.now()}` });
  };
  const editPersonalTx = (updated: PersonalTransaction) => {
    updatePersonalTxInDb(updated);
  };
  const deletePersonalTx = (id: string) => {
    deletePersonalTxFromDb(id);
  };

  // ---- 공동 지출 ----
  const addTransaction = (tx: Omit<Transaction, 'id'>) => {
    addTransactionToDb({ ...tx, id: `t${Date.now()}` });
  };

  const editTransaction = (updated: Transaction) => {
    updateTransactionInDb(updated);
  };

  const deleteTransaction = (id: string) => {
    if (confirm('이 지출을 삭제할까요?')) {
      deleteTransactionFromDb(id);
      const newPaid = { ...paidMapRef.current };
      Object.keys(newPaid).forEach(k => { if (k.startsWith(id + ':')) delete newPaid[k]; });
      savePaidMap(newPaid);
    }
  };

  const togglePaid = (txId: string, memberId: string) => {
    const key = `${txId}:${memberId}`;
    const newPaid = { ...paidMapRef.current, [key]: !paidMapRef.current[key] };
    savePaidMap(newPaid);
  };

  const resetPaid = (txId: string) => {
    const newPaid = { ...paidMapRef.current };
    Object.keys(newPaid).forEach(k => { if (k.startsWith(txId + ':')) delete newPaid[k]; });
    savePaidMap(newPaid);
  };

  const handleExport = () => {
    const header = '날짜,결제자,나누는 사람,금액,카테고리,내용\n';
    const rows = transactions.map((t) => {
      const payer = members.find((m) => m.id === t.payerId)?.name ?? '';
      const splits = t.splitMemberIds.map((id) => members.find((m) => m.id === id)?.name ?? '').join('/');
      return `${t.date},${payer},${splits},${t.amount},${t.category},${t.description}`;
    }).join('\n');
    const blob = new Blob(['﻿' + header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `가계부_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 16 }}>
        <div style={{ fontSize: 48 }}>💳</div>
        <div style={{ fontSize: 18, color: '#666' }}>데이터 불러오는 중...</div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-left">
          <div className="header-logo">💳</div>
          <div className="header-title">
            <h1>공동 가계부</h1>
            <p>함께 쓰고 깔끔하게 정산하기 😊</p>
          </div>
          <nav className="tab-nav">
            {TABS.map((t) => (
              <button key={t.id} className={`tab-btn ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
                <span>{t.icon}</span><span>{t.label}</span>
              </button>
            ))}
          </nav>
        </div>
        <div className="header-right">
          <div className="header-members">
            {members.map((m) => (
              <div key={m.id} className="member-chip" onClick={() => setShowMemberModal(true)} title={m.name}>
                <div className="member-avatar" style={{ background: m.color + '33' }}>{m.avatar}</div>
                <span>{m.name}</span>
              </div>
            ))}
            <button className="add-member-btn" onClick={() => setShowMemberModal(true)} title="멤버 관리">+</button>
          </div>
          <button className="export-btn" onClick={handleExport}>⬇️ 내보내기</button>
        </div>
      </header>

      <main className="main-content">
        {tab === 'gaegyebu' && (
          <GaegyebuPage
            members={members}
            transactions={transactions}
            paidMap={paidMap}
            onAdd={addTransaction}
            onEdit={editTransaction}
            onDelete={deleteTransaction}
            onResetPaid={resetPaid}
          />
        )}
        {tab === 'settlement' && (
          <LedgerPage
            members={members}
            transactions={transactions}
            paidMap={paidMap}
            onAdd={addTransaction}
            onEdit={editTransaction}
            onDelete={deleteTransaction}
            onTogglePaid={togglePaid}
          />
        )}
        {tab === 'analysis' && <AnalysisPage members={members} transactions={transactions} />}
        {tab === 'calendar' && <CalendarPage members={members} transactions={transactions} />}
        {tab === 'yearly' && <YearlyPage members={members} transactions={transactions} />}
        {tab === 'personal' && (
          <PersonalPage
            members={members}
            transactions={transactions}
            personalTxs={personalTxs}
            onAdd={addPersonalTx}
            onEdit={editPersonalTx}
            onDelete={deletePersonalTx}
          />
        )}
      </main>

      {showMemberModal && (
        <MemberModal members={members} onSave={saveMembers} onClose={() => setShowMemberModal(false)} />
      )}
    </div>
  );
}
