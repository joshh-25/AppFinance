// Finance App File: frontend/src/components/payment/PaymentForm.jsx
// Purpose: Presentational payment form and records table UI for bill modules.

import { SkeletonButton, SkeletonLine } from './Skeleton.jsx';
import StatusBanner from './StatusBanner.jsx';

const AMOUNT_FIELDS = new Set([
  'wifi_amount',
  'water_amount',
  'electricity_amount',
  'association_dues',
  'real_property_tax',
  'penalty'
]);
const PAYMENT_STATUS_FIELDS = new Set([
  'wifi_payment_status',
  'water_payment_status',
  'electricity_payment_status',
  'association_payment_status'
]);
const PAYMENT_STATUS_OPTIONS = ['Paid', 'Unpaid'];

export default function PaymentForm({
  fieldsAnimating,
  panelMode,
  formModeLabel,
  isEditMode,
  isUpdateMode = false,
  comboSearch,
  onComboChange,
  onComboFocus,
  onComboBlur,
  loadingPropertyRecords,
  filteredPropertyOptions,
  isComboDropdownOpen,
  getPropertyRecordLabel,
  onOptionSelect,
  form,
  onUpdateField,
  activeBillType,
  allTypeFields,
  billTypeFields,
  onSubmit,
  tableSearch,
  onTableSearchChange,
  onBackToForm,
  onRefresh,
  loadingBillRows,
  isBillRowsError,
  billRowsError,
  filteredBillRows,
  billTableColumns,
  pageRows,
  onEditBill,
  pageStart,
  pageEnd,
  onPrevPage,
  onNextPage,
  safePage,
  totalPages,
  onClearFields,
  onCancelEdit,
  saving,
  uploading,
  ocrUploadHealthy = true,
  ocrUploadMessage = '',
  prevFlowPath,
  isLastFlowStep,
  nextFlowPath,
  onNavigatePrev,
  onNavigateNext,
  onNavigateBack,
  onOpenUpload,
  nextButtonLabel,
  formFeedback = null
}) {
  const legacyModeLabel = isEditMode ? 'Edit Mode' : 'Create Mode';

  return (
    <section className={`card bill-form-card ${panelMode === 'table' ? 'property-records-card' : 'payment-form-card'}`}>
      <div className="card-title-row">
        <div className="card-title-left">
          <div className="bill-form-heading">
            <h3 className="card-title">
              Bill Entry <span className="mode-badge">{formModeLabel}</span>
            </h3>
            <span className="sr-only">{legacyModeLabel}</span>
          </div>
          <div className="bill-header-fields">
            <label className="bill-header-field">
              Property / DD
              <div className="combo-wrap">
                <input
                  value={comboSearch}
                  autoComplete="off"
                  onChange={onComboChange}
                  onFocus={onComboFocus}
                  onBlur={onComboBlur}
                  disabled={loadingPropertyRecords}
                  className="combo-input"
                />
                <span className="combo-search-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="7" />
                    <path strokeLinecap="round" d="M20 20l-3.5-3.5" />
                  </svg>
                </span>
                {isComboDropdownOpen && (
                  <div className="combo-list">
                    {loadingPropertyRecords && (
                      <div className="records-loading-inline" aria-hidden="true">
                        <SkeletonLine width="100%" height={12} radius={7} />
                        <SkeletonLine width="92%" height={12} radius={7} />
                        <SkeletonLine width="84%" height={12} radius={7} />
                      </div>
                    )}
                    {!loadingPropertyRecords && filteredPropertyOptions.length === 0 && (
                      <p className="muted-text combo-item">No matching property record.</p>
                    )}
                    {!loadingPropertyRecords &&
                      filteredPropertyOptions.map((record) => (
                        <button
                          key={record.id}
                          type="button"
                          className="combo-item-btn"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => onOptionSelect(record)}
                        >
                          <span>{getPropertyRecordLabel(record)}</span>
                        </button>
                      ))}
                  </div>
                )}
              </div>
            </label>
            <label className="bill-header-field bill-header-field-period">
              Due Period
              <input
                name="due_period"
                type="month"
                value={form.due_period || ''}
                autoComplete="off"
                onChange={onUpdateField}
              />
            </label>
          </div>
        </div>
        <div className="card-title-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onOpenUpload}
            disabled={saving || uploading || !ocrUploadHealthy}
            title={!ocrUploadHealthy && ocrUploadMessage ? ocrUploadMessage : ''}
            aria-label="Upload Bill"
          >
            {uploading ? 'Uploading Bill...' : 'Upload Bill'}
          </button>
          {panelMode === 'form' && (
            <button
              type="submit"
              form="payment-form"
              className={isUpdateMode ? 'btn btn-secondary' : 'btn active'}
              disabled={saving || uploading}
              aria-label={isUpdateMode ? 'Update' : 'Save'}
            >
              {isUpdateMode ? (saving ? 'Saving Changes...' : 'Save Changes') : saving ? 'Saving...' : 'Save Bill'}
            </button>
          )}
        </div>
      </div>

      {!ocrUploadHealthy && ocrUploadMessage && (
        <p className="muted-text" role="note">
          OCR upload unavailable: {ocrUploadMessage}
        </p>
      )}

      <StatusBanner feedback={formFeedback} />

      {panelMode === 'form' && (
        <div className={`payment-form-content bill-fields-region${fieldsAnimating ? ' bill-fields-animating' : ''}`}>
          <div className="form-section-card">
            <div className="form-section-header">
              <h4>Bill Details</h4>
              <p>Fill in or confirm the fields below before saving.</p>
            </div>
            <form id="payment-form" className="form-grid" onSubmit={onSubmit} autoComplete="off">
              {allTypeFields.map(([name]) => (
                <input key={`hidden-${name}`} type="hidden" name={name} value={form[name]} readOnly />
              ))}

              {(billTypeFields[activeBillType] || []).map(([name, label]) => (
                <label key={name}>
                  {label}
                  {PAYMENT_STATUS_FIELDS.has(name) ? (
                    <select
                      name={name}
                      value={PAYMENT_STATUS_OPTIONS.includes(form[name]) ? form[name] : ''}
                      onChange={onUpdateField}
                    >
                      <option value="" disabled>
                        Select status
                      </option>
                      {PAYMENT_STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      name={name}
                      value={form[name]}
                      autoComplete="off"
                      onChange={onUpdateField}
                      inputMode={AMOUNT_FIELDS.has(name) ? 'decimal' : 'text'}
                    />
                  )}
                </label>
              ))}
            </form>
          </div>
        </div>
      )}

      {panelMode === 'table' && (
        <div className="filters records-toolbar-filters">
          <label className="toolbar-field">
            <span>Find saved bills</span>
            <input value={tableSearch} onChange={onTableSearchChange} placeholder="Search bill records..." />
          </label>
          {loadingBillRows ? (
            <>
              <SkeletonButton width={140} height={44} />
              <SkeletonButton width={140} height={44} />
            </>
          ) : (
            <>
              <button type="button" className="btn btn-secondary" onClick={onBackToForm}>
                Back to Entry
              </button>
              <button type="button" className="btn btn-secondary" onClick={onRefresh}>
                Refresh
              </button>
            </>
          )}
        </div>
      )}

      {panelMode === 'table' && loadingBillRows && (
        <div className="records-loading-shell" role="status" aria-live="polite" aria-label="Loading bill records">
          <div className="records-loading-table">
            {Array.from({ length: 8 }).map((_, index) => (
              <SkeletonLine key={`bill-form-loading-${index}`} width="100%" height={15} radius={8} />
            ))}
          </div>
        </div>
      )}
      {panelMode === 'table' && isBillRowsError && (
        <p className="error">{billRowsError?.message || 'Failed to load records.'}</p>
      )}

      {panelMode === 'table' && !loadingBillRows && !isBillRowsError && filteredBillRows.length === 0 && (
        <div className="empty-state">
          <p>No records found for this bill form yet.</p>
          <button type="button" className="btn btn-secondary" onClick={onBackToForm}>
            Create Bill Record
          </button>
        </div>
      )}

      {panelMode === 'table' && !loadingBillRows && !isBillRowsError && filteredBillRows.length > 0 && (
        <div
          className={`property-records-content bill-fields-region${fieldsAnimating ? ' bill-fields-animating' : ''}`}
        >
          <div className="table-wrap property-records-table-wrap">
            <table>
              <thead>
                <tr>
                  {billTableColumns.map(([, label]) => (
                    <th key={label}>{label}</th>
                  ))}
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row) => (
                  <tr key={row.id}>
                    {billTableColumns.map(([key]) => (
                      <td key={`${row.id}-${key}`}>
                        {key === 'display_property_dd'
                          ? row.property && String(row.property).trim() !== ''
                            ? row.property
                            : row.dd || '-'
                          : row[key] || '-'}
                      </td>
                    ))}
                    <td>
                      <div className="action-buttons">
                        <button type="button" className="btn btn-secondary" onClick={() => onEditBill(row)}>
                          Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pagination records-pagination">
            <span>
              Showing {pageStart}-{pageEnd} of {filteredBillRows.length}
            </span>
            <div className="actions">
              <button type="button" className="btn" onClick={onPrevPage} disabled={safePage === 1}>
                Previous
              </button>
              <button type="button" className="btn" onClick={onNextPage} disabled={safePage === totalPages}>
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {panelMode === 'form' && (
        <div className="payment-corner-actions">
          {prevFlowPath && (
            <button type="button" className="btn btn-secondary" onClick={onNavigatePrev} disabled={saving || uploading}>
              Back
            </button>
          )}
          <button
            type="button"
            className="payment-clear-corner-btn"
            onClick={isEditMode ? onCancelEdit || onClearFields : onClearFields}
            disabled={saving || uploading}
            aria-label={isEditMode ? 'Cancel editing' : 'Clear'}
            title={isEditMode ? 'Cancel editing' : 'Clear all fields'}
          >
            {isEditMode ? 'Stop Editing' : 'Clear'}
          </button>
          {!isLastFlowStep && nextFlowPath && (
            <button type="button" className="btn active" onClick={onNavigateNext} disabled={saving || uploading} aria-label="Next">
              Next Step
            </button>
          )}
          {isLastFlowStep && (
            <button type="button" className="btn active" onClick={onNavigateBack} disabled={saving || uploading}>
              {nextButtonLabel || 'Back to Property Records'}
            </button>
          )}
        </div>
      )}
    </section>
  );
}

