import { useState, useEffect } from 'react';
import type { Member, Transaction, PaidMap, PersonalTransaction } from './types';
import { loadMembers, saveMembers, loadTransactions, saveTransactions, loadPaidMap, savePaidMap, loadPersonalTransactions, savePersonalTransactions } from './utils/storage';
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
  const [members, setMembers] = useState<Member[]>(loadMembers);
  const [transactions, setTransactions] = useState<Transaction[]>(loadTransactions);
  const [paidMap, setPaidMap] = useState<PaidMap>(loadPaidMap);
  const [personalTxs, setPersonalTxs] = useState<PersonalTransaction[]>(loadPersonalTransactions);
  const [showMemberModal, setShowMemberModal] = useState(false);

  useEffect(() => { saveMembers(members); }, [members]);
  useEffect(() => { saveTransactions(transactions); }, [transactions]);
  useEffect(() => { savePaidMap(paidMap); }, [paidMap]);
  useEffect(() => { savePersonalTransactions(personalTxs); }, [personalTxs]);

  const addPersonalTx = (tx: Omit<PersonalTransaction, 'id'>) => {
    setPersonalTxs((prev) => [...prev, { ...tx, id: `p${Date.now()}` }]);
  };
  const editPersonalTx = (updated: PersonalTransaction) => {
    setPersonalTxs((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  };
  const deletePersonalTx = (id: string) => {
    setPersonalTxs((prev) => prev.filter((t) => t.id !== id));
  };

  const addTransaction = (tx: Omit<Transaction, 'id'>) => {
    setTransactions((prev) => [...prev, { ...tx, id: `t${Date.now()}` }]);
  };

  const editTransaction = (updated: Transaction) => {
    setTransactions((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  };

  const deleteTransaction = (id: string) => {
    if (confirm('이 지출을 삭제할까요?')) {
      setTransactions((prev) => prev.filter((t) => t.id !== id));
      setPaidMap((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((k) => { if (k.startsWith(id + ':')) delete next[k]; });
        return next;
      });
    }
  };

  const togglePaid = (txId: string, memberId: string) => {
    const key = `${txId}:${memberId}`;
    setPaidMap((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // 해당 거래의 paidMap 초기화 → 정산 탭에 다시 나타남
  const resetPaid = (txId: string) => {
    setPaidMap((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((k) => { if (k.startsWith(txId + ':')) delete next[k]; });
      return next;
    });
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
        <MemberModal members={members} onSave={setMembers} onClose={() => setShowMemberModal(false)} />
      )}
    </div>
  );
}
