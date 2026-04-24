import { useState } from 'react';
import type { Member } from '../types';

const AVATARS = ['👩', '👧', '👦', '👨', '🧑', '👩‍🦱', '👨‍🦱', '🧒', '👴', '👵'];
const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#F1948A'];

interface Props {
  members: Member[];
  onSave: (members: Member[]) => void;
  onClose: () => void;
}

export default function MemberModal({ members, onSave, onClose }: Props) {
  const [list, setList] = useState<Member[]>(members);
  const [newName, setNewName] = useState('');

  const addMember = () => {
    if (!newName.trim()) return;
    const avatar = AVATARS[list.length % AVATARS.length];
    const color = COLORS[list.length % COLORS.length];
    setList([...list, {
      id: `m${Date.now()}`,
      name: newName.trim(),
      avatar,
      color,
    }]);
    setNewName('');
  };

  const removeMember = (id: string) => {
    setList(list.filter((m) => m.id !== id));
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2>멤버 관리</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="member-list-manage">
          {list.map((m) => (
            <div key={m.id} className="member-manage-item">
              <div className="member-avatar" style={{ background: m.color + '33' }}>{m.avatar}</div>
              <span className="member-manage-name">{m.name}</span>
              <button
                className="icon-btn danger"
                onClick={() => removeMember(m.id)}
                title="삭제"
              >✕</button>
            </div>
          ))}
        </div>

        <div className="form-group">
          <label>새 멤버 추가</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text" value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="이름 입력"
              onKeyDown={(e) => e.key === 'Enter' && addMember()}
              style={{ flex: 1 }}
            />
            <button type="button" className="btn-primary" style={{ flex: '0 0 auto', padding: '8px 16px' }} onClick={addMember}>
              추가
            </button>
          </div>
        </div>

        <div className="form-actions">
          <button type="button" className="btn-secondary" onClick={onClose}>취소</button>
          <button type="button" className="btn-primary" onClick={() => { onSave(list); onClose(); }}>
            저장
          </button>
        </div>
      </div>
    </div>
  );
}
