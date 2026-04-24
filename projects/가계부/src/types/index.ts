export interface Member {
  id: string;
  name: string;
  avatar: string; // emoji or color
  color: string;
}

export type Category =
  | '식비'
  | '카페'
  | '쇼핑'
  | '교통'
  | '생활'
  | '문화'
  | '의료'
  | '기타';

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  payerId: string;
  splitMemberIds: string[];
  amount: number;
  category: Category;
  description: string;
}

export interface Settlement {
  from: string;
  to: string;
  amount: number;
}

// key: `${txId}:${memberId}` → true면 이미 정산 완료
export type PaidMap = Record<string, boolean>;

export interface PersonalTransaction {
  id: string;
  memberId: string;
  date: string; // YYYY-MM-DD
  type: 'income' | 'expense';
  amount: number;
  category: string;
  description: string;
}
