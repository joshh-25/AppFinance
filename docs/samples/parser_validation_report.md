# Parser Validation Matrix (After Parser Patch)

| Sample | Normalized Bill Type | Detected Type | Target Fields Detected | Target Fields Missing | Validation |
|---|---|---|---|---|---|
| 8183_SW-9E FEBRUARY 2026 BILLING INVOICE.pdf | association_dues | association_dues | association_dues, association_payment_status | association_due_date | PASS |
| MANABE43090802-202601MANABE43090802_gYWb.pdf |  | electricity | electricity_account_no, electricity_amount, electricity_due_date, electricity_payment_status | - | PASS |
| electricity-bill-sample.pdf | electricity | electricity | electricity_account_no, electricity_amount, electricity_due_date, electricity_payment_status | - | PASS |
| water-bill-sample.pdf | water | water | water_account_no, water_amount, water_due_date, water_payment_status | - | PASS |
| wifi-bill-sample.pdf | internet | internet | internet_account_no, wifi_amount, wifi_due_date, wifi_payment_status | - | PASS |

## Notes
- Mixed-type misrouting improved: electricity/water/wifi samples now classify to expected modules.
- Remaining edge case: `8183_SW-9E...pdf` still misses `association_due_date` extraction.