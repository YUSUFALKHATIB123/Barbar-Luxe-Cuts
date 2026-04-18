
import React, { useState } from 'react';
import { FinancialRecord } from '../types';
import { useApp } from '../App';

interface ExpenseFormProps {
  onClose: () => void;
  onSubmit: (expense: Omit<FinancialRecord, 'id' | 'createdAt'>) => void;
  branchId: string;
}

const ExpenseForm: React.FC<ExpenseFormProps> = ({ onClose, onSubmit, branchId }) => {
  const { t, language } = useApp();
  const [category, setCategory] = useState<'rent' | 'utilities' | 'salary' | 'supplies' | 'maintenance'>('supplies');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [error, setError] = useState('');

  const categories = [
    { value: 'rent', label: language === 'ar' ? 'إيجار المحل' : 'Rent' },
    { value: 'utilities', label: language === 'ar' ? 'فواتير (كهرباء، ماء، إنترنت)' : 'Utilities (Electricity, Water, Internet)' },
    { value: 'salary', label: language === 'ar' ? 'رواتب' : 'Salaries' },
    { value: 'supplies', label: language === 'ar' ? 'مستلزمات' : 'Supplies' },
    { value: 'maintenance', label: language === 'ar' ? 'صيانة' : 'Maintenance' },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!amount || parseFloat(amount) <= 0) {
      setError(language === 'ar' ? 'يرجى إدخال مبلغ صحيح' : 'Please enter a valid amount');
      return;
    }

    if (!description.trim()) {
      setError(language === 'ar' ? 'يرجى إدخال الوصف' : 'Please enter a description');
      return;
    }

    onSubmit({
      type: 'expense',
      category,
      amount: parseFloat(amount),
      date,
      description: description.trim(),
      branchId,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-[#111] border border-white/10 rounded-[32px] p-6 space-y-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-white font-black text-xl">{language === 'ar' ? 'إضافة مصروف' : 'Add Expense'}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
            <span className="material-icons-round text-white text-sm">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-400 text-xs font-black uppercase tracking-widest mb-2">
              {language === 'ar' ? 'نوع المصروف' : 'Expense Category'}
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as any)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:border-primary transition-all"
            >
              {categories.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-gray-400 text-xs font-black uppercase tracking-widest mb-2">
              {language === 'ar' ? 'المبلغ' : 'Amount'} ({t('currency')})
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:border-primary transition-all"
              placeholder="0"
              step="0.01"
              min="0"
            />
          </div>

          <div>
            <label className="block text-gray-400 text-xs font-black uppercase tracking-widest mb-2">
              {language === 'ar' ? 'الوصف' : 'Description'}
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:border-primary transition-all"
              placeholder={language === 'ar' ? 'مثال: فاتورة كهرباء شهر يناير' : 'Example: January electricity bill'}
            />
          </div>

          <div>
            <label className="block text-gray-400 text-xs font-black uppercase tracking-widest mb-2">
              {language === 'ar' ? 'التاريخ' : 'Date'}
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:border-primary transition-all"
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-xs text-center">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-2xl border border-white/10 text-gray-300 font-bold"
            >
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="submit"
              className="flex-1 py-3 rounded-2xl bg-primary text-black font-black"
            >
              {language === 'ar' ? 'إضافة' : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ExpenseForm;
