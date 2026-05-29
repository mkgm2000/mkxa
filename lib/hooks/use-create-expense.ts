'use client';

import { useCallback, useState } from 'react';
import { supabaseClient } from '@/lib/supabase/client';
import { saveState } from '@/lib/save-state';
import type { NewExpense, Expense } from '@/lib/expenses';

export interface UseCreateExpenseResult {
  create: (e: NewExpense) => Promise<Expense | null>;
  saving: boolean;
}

export function useCreateExpense(): UseCreateExpenseResult {
  const [saving, setSaving] = useState(false);

  const create = useCallback(async (e: NewExpense): Promise<Expense | null> => {
    setSaving(true);
    saveState.getState().set('saving');
    const { data, error } = await supabaseClient()
      .from('expenses')
      .insert(e)
      .select('*')
      .single();
    if (error) {
      saveState.getState().set('error');
      setSaving(false);
      return null;
    }
    saveState.getState().set('saved');
    setSaving(false);
    return data as Expense;
  }, []);

  return { create, saving };
}
