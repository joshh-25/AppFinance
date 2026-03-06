// Finance App File: frontend/src/features/expenses/ExpensesPage.jsx
// Purpose: Expenses create/update form page.

import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../../shared/components/AppLayout.jsx';
import Toast from '../../shared/components/Toast.jsx';
import { useToast } from '../../shared/hooks/useToast.js';
import { createExpense, updateExpense } from '../../shared/lib/api.js';

const EXPENSE_EDIT_CONTEXT_KEY = 'finance:expense-edit-context';

const INITIAL_FORM = {
  expense_date: '',
  payee: '',
  description: '',
  category: '',
  amount: '',
  remarks: '',
  payment: '',
  tin_number: '',
  non_vat: '0',
  ocr_raw_text: ''
};

const CATEGORY_OPTIONS = ['Merchandise Inventory', 'Repair', 'Asset', 'Store Supplies', 'Freight In'];

function mapEditContextToForm(source = {}) {
  return {
    expense_date: source.expense_date || source.date || '',
    payee: source.payee || '',
    description: source.description || '',
    category: source.category || '',
    amount: source.amount || '',
    remarks: source.remarks || '',
    payment: source.payment || '',
    tin_number: source.tin_number || '',
    non_vat: String(Number(source.non_vat || 0) > 0 ? '1' : '0'),
    ocr_raw_text: source.ocr_raw_text || ''
  };
}

function buildExpensePayload(form) {
  return {
    expense_date: form.expense_date,
    payee: form.payee,
    description: form.description,
    category: form.category,
    amount: form.amount,
    remarks: form.remarks,
    payment: form.payment,
    tin_number: form.tin_number,
    non_vat: Number(form.non_vat || 0) > 0 ? 1 : 0,
    ocr_raw_text: form.ocr_raw_text
  };
}

function hasRequiredFields(form) {
  return (
    String(form.expense_date || '').trim() !== '' &&
    String(form.payee || '').trim() !== '' &&
    String(form.description || '').trim() !== '' &&
    String(form.amount || '').trim() !== ''
  );
}

export default function ExpensesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toasts, showToast, removeToast } = useToast();
  const ocrInputRef = useRef(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [editingExpenseId, setEditingExpenseId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [ocrBusy, setOcrBusy] = useState(false);
  const isEditMode = editingExpenseId !== null;
  useEffect(() => {
    const raw = window.sessionStorage.getItem(EXPENSE_EDIT_CONTEXT_KEY);
    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') {
        window.sessionStorage.removeItem(EXPENSE_EDIT_CONTEXT_KEY);
        return;
      }
      const editId = Number(parsed.id || 0);
      if (editId <= 0) {
        window.sessionStorage.removeItem(EXPENSE_EDIT_CONTEXT_KEY);
        return;
      }
      const nextForm = mapEditContextToForm(parsed);
      setEditingExpenseId(editId);
      setForm(nextForm);
    } catch {
      window.sessionStorage.removeItem(EXPENSE_EDIT_CONTEXT_KEY);
    }
  }, []);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function resetForm() {
    setEditingExpenseId(null);
    setForm(INITIAL_FORM);
    window.sessionStorage.removeItem(EXPENSE_EDIT_CONTEXT_KEY);
  }

  async function handleSave(event) {
    event?.preventDefault?.();
    if (!hasRequiredFields(form)) {
      showToast('error', 'Date, payee, description, and amount are required.');
      return;
    }

    setSaving(true);
    try {
      const payload = buildExpensePayload(form);
      if (isEditMode) {
        await updateExpense(editingExpenseId, payload);
        showToast('success', 'Expense updated successfully.');
      } else {
        await createExpense(payload);
        showToast('success', 'Expense saved successfully.');
      }
      await queryClient.invalidateQueries({ queryKey: ['expenses-list'] });
      resetForm();
    } catch (error) {
      showToast('error', String(error?.message || 'Failed to save expense.'));
    } finally {
      setSaving(false);
    }
  }

  function handleOcrButtonClick() {
    if (ocrInputRef.current) {
      ocrInputRef.current.click();
    }
  }

  async function handleOcrFileSelect(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) {
      return;
    }

    setOcrBusy(true);
    try {
      const { runExpenseOcr } = await import('../../shared/lib/expenseOcr.js');
      const { text, fields } = await runExpenseOcr(file);
      let autoFilledCount = 0;

      setForm((prev) => {
        const next = { ...prev };
        const assignIfEmpty = (key, value) => {
          const normalizedValue = String(value || '').trim();
          if (normalizedValue === '') {
            return;
          }
          if (String(next[key] || '').trim() !== '') {
            return;
          }
          next[key] = normalizedValue;
          autoFilledCount += 1;
        };

        assignIfEmpty('expense_date', fields.expense_date);
        assignIfEmpty('payee', fields.payee);
        assignIfEmpty('description', fields.description);
        assignIfEmpty('category', fields.category);
        assignIfEmpty('amount', fields.amount);
        assignIfEmpty('payment', fields.payment);
        assignIfEmpty('tin_number', fields.tin_number);
        assignIfEmpty('remarks', fields.remarks);
        if (fields.non_vat === 1 && Number(next.non_vat || 0) !== 1) {
          next.non_vat = '1';
          autoFilledCount += 1;
        }
        if (String(text || '').trim() !== '') {
          next.ocr_raw_text = text.slice(0, 12000);
        }

        return next;
      });

      if (autoFilledCount > 0) {
        showToast('success', `Upload complete. Auto-filled ${autoFilledCount} field(s).`);
      } else {
        showToast('warning', 'Upload complete, but no fields were confidently auto-filled. You can enter values manually.');
      }
    } catch (error) {
      showToast('error', String(error?.message || 'Upload processing failed.'));
    } finally {
      setOcrBusy(false);
    }
  }

  return (
    <AppLayout title="Expenses">
      <Toast toasts={toasts} onDismiss={removeToast} />
      <section className="card bill-form-card expense-form-card">
        <div className="card-title-row">
          <div className="card-title-left">
            <div className="card-title-accent" />
            <div>
              <h3 className="card-title">
                Expenses Form <span className="mode-badge">{isEditMode ? 'Edit Mode' : 'Create Mode'}</span>
              </h3>
            </div>
          </div>
          <div className="card-title-actions">
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/records/expenses')}>
              View Records
            </button>
            <button
              type="button"
              className={isEditMode ? 'btn btn-secondary' : 'btn active'}
              onClick={handleOcrButtonClick}
              disabled={saving || ocrBusy}
            >
              {ocrBusy ? 'Uploading...' : 'Upload'}
            </button>
            <input
              ref={ocrInputRef}
              type="file"
              accept=".pdf,image/*"
              className="expense-ocr-input"
              onChange={handleOcrFileSelect}
            />
          </div>
        </div>

        <form id="expense-form" className="form-grid expense-form-grid" onSubmit={handleSave} autoComplete="off">
          <label>
            Date
            <input name="expense_date" type="date" value={form.expense_date} onChange={updateField} />
          </label>
          <label>
            Serial #
            <input type="text" value={isEditMode ? String(editingExpenseId) : ''} readOnly />
          </label>
          <label>
            Payee
            <input name="payee" type="text" value={form.payee} onChange={updateField} />
          </label>
          <label className="expense-description-label">
            Description
            <textarea
              name="description"
              value={form.description}
              onChange={updateField}
              rows={6}
              className="expense-description-input"
            />
          </label>
          <label>
            Category
            <select name="category" value={form.category} onChange={updateField}>
              <option value="" />
              {CATEGORY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label>
            Amount
            <input name="amount" type="text" value={form.amount} onChange={updateField} inputMode="decimal" />
          </label>
          <label>
            Remarks
            <input name="remarks" type="text" value={form.remarks} onChange={updateField} />
          </label>
          <label>
            Payment
            <input name="payment" type="text" value={form.payment} onChange={updateField} />
          </label>
          <label>
            TIN Number
            <input name="tin_number" type="text" value={form.tin_number} onChange={updateField} />
          </label>
          <label>
            Non-VAT
            <select name="non_vat" value={form.non_vat} onChange={updateField}>
              <option value="0">No</option>
              <option value="1">Yes</option>
            </select>
          </label>
        </form>

        <div className="workflow-footer">
          <div className="workflow-footer-right">
            <button type="button" className="btn btn-secondary" onClick={resetForm}>
              Clear
            </button>
            <button
              type="button"
              className={isEditMode ? 'btn btn-secondary' : 'btn active'}
              onClick={handleSave}
              disabled={saving || !hasRequiredFields(form)}
            >
              {isEditMode ? (saving ? 'Updating...' : 'Update') : saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </section>
    </AppLayout>
  );
}
