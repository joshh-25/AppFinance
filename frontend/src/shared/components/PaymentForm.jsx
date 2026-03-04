// Finance App File: frontend/src/components/payment/PaymentForm.jsx
// Purpose: Presentational payment form and records table UI for bill modules.

const AMOUNT_FIELDS = new Set([
  'wifi_amount',
  'water_amount',
  'electricity_amount',
  'association_dues',
  'real_property_tax',
  'penalty'
]);

export default function PaymentForm({
  fieldsAnimating,
  panelMode,
  formModeLabel,
  isEditMode,
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
  saving,
  uploading,
  prevFlowPath,
  isLastFlowStep,
  nextFlowPath,
  onNavigatePrev,
  onNavigateNext,
  onNavigateBack,
  onOpenUpload,
  onOpenAccountLookupUpload,
  importingAccountLookup,
  nextButtonLabel
}) {
  return (
    <section className={`card bill-form-card ${panelMode === 'table' ? 'property-records-card' : 'payment-form-card'}`}>
      <div className="card-title-row">
        <div className="card-title-left">
          <div className="bill-form-heading">
            <h3 className="card-title">
              Bills Form <span className="mode-badge">{formModeLabel}</span>
            </h3>
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
                    {loadingPropertyRecords && <p className="muted-text combo-item">Loading options...</p>}
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
              Billing Period
              <input
                name="billing_period"
                type="month"
                value={form.billing_period || ''}
                autoComplete="off"
                onChange={onUpdateField}
              />
            </label>
            <p className="muted-text bill-input-hint bill-header-hint">
              Choose an existing Property Record to auto-fill shared details.
            </p>
          </div>
        </div>
        <div className="card-title-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onOpenAccountLookupUpload}
            disabled={saving || uploading || importingAccountLookup}
          >
            {importingAccountLookup ? 'Importing Accounts...' : 'Upload Account Files'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={onOpenUpload} disabled={saving || uploading}>
            Upload Bill
          </button>
          {panelMode === 'form' && (
            <button
              type="submit"
              form="payment-form"
              className={isEditMode ? 'btn btn-secondary' : 'btn active'}
              disabled={saving || uploading}
            >
              {isEditMode ? (saving ? 'Updating...' : 'Update') : saving ? 'Saving...' : 'Save'}
            </button>
          )}
        </div>
      </div>

      {panelMode === 'form' && (
        <div className={`payment-form-content bill-fields-region${fieldsAnimating ? ' bill-fields-animating' : ''}`}>
          <form id="payment-form" className="form-grid" onSubmit={onSubmit} autoComplete="off">
            {allTypeFields.map(([name]) => (
              <input key={`hidden-${name}`} type="hidden" name={name} value={form[name]} readOnly />
            ))}

            {(billTypeFields[activeBillType] || []).map(([name, label]) => (
              <label key={name}>
                {label}
                <input
                  name={name}
                  value={form[name]}
                  autoComplete="off"
                  onChange={onUpdateField}
                  inputMode={AMOUNT_FIELDS.has(name) ? 'decimal' : 'text'}
                />
              </label>
            ))}
          </form>
        </div>
      )}

      {panelMode === 'table' && (
        <div className="filters">
          <input value={tableSearch} onChange={onTableSearchChange} placeholder="Search bill records..." />
          <button type="button" className="btn btn-secondary" onClick={onBackToForm}>
            Back to Form
          </button>
          <button type="button" className="btn btn-secondary" onClick={onRefresh}>
            Refresh
          </button>
        </div>
      )}

      {panelMode === 'table' && loadingBillRows && <p className="muted-text">Loading records...</p>}
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
            onClick={onClearFields}
            disabled={saving || uploading}
            aria-label="Clear all fields"
            title="Clear all fields"
          >
            Clear
          </button>
          {!isLastFlowStep && nextFlowPath && (
            <button type="button" className="btn active" onClick={onNavigateNext} disabled={saving || uploading}>
              Next
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
