# Wireframes and Real Process (Current Project)

## 1. Actual End-to-End Flow
1. User logs in.
2. User lands on Dashboard.
3. User creates/maintains master properties in `Property Records` (this is the `property_list` master).
4. User opens a bill module (`WiFi`, `Water`, `Electricity`, `Association`).
5. User selects Property from dropdown (source: `property_list`).
6. System auto-fills `DD`, `Unit Owner`, `Classification`, `Deposit`, `Rent`.
7. User encodes bill-specific fields and saves.
8. User reviews all entries in `Records`, selects row, and edits from Records back to the correct bill module.
9. User exports/report or logs out.

## 2. Login Screen
```text
+---------------------------------------------------+
| FINANCE APP                                       |
|                                                   |
| Username [__________________________]             |
| Password [__________________________]             |
| [ Login ]                                         |
|                                                   |
| (Error message area)                              |
+---------------------------------------------------+
```

## 3. App Shell
```text
+----------------------+----------------------------------------------+
| Sidebar              | Header                                       |
| - Dashboard          | Page Title + Subtitle                        |
| - Records            | [Theme Toggle]                               |
| - Property Records   +----------------------------------------------+
| - WiFi Bills         | Main Panel                                   |
| - Water Bills        | Form/Table view                              |
| - Electricity Bills  |                                              |
| - Association Bills  |                                              |
|                      |                                              |
| [username] [Log Out] |                                              |
+----------------------+----------------------------------------------+
```

## 4. Property Records (Property List Master)
```text
+---------------------------------------------------------------------+
| Property Records Form                                [Save/Update]  |
+---------------------------------------------------------------------+
| DD              [____________________]                              |
| Property        [____________________]                              |
| Unit Owner      [____________________]                              |
| Classification  [____________________]                              |
| Deposit         [____________________]                              |
| Rent            [____________________]                              |
+---------------------------------------------------------------------+
| [View Records] [Clear] [Next -> Bills]                             |
+---------------------------------------------------------------------+
```

### Real behavior
1. Save creates/updates master row in `property_list`.
2. Edit/Delete operates on Property List.
3. Updates sync linked bill rows by `property_list_id`.

## 5. Bills Module (WiFi/Water/Electricity/Association)
```text
+---------------------------------------------------------------------+
| Bills Form (per module)                          [Upload] [Save/Upd]|
+---------------------------------------------------------------------+
| Property / DD  [ type or select from dropdown ]                     |
| (dropdown source: property_list)                                    |
+---------------------------------------------------------------------+
| Auto-filled from selected property:                                 |
| DD | Unit Owner | Classification | Deposit | Rent                   |
+---------------------------------------------------------------------+
| Module fields (example Water):                                      |
| Water Account No [_________]  Water Amount [_________]              |
| Due Date         [_________]  Payment Status [_________]            |
+---------------------------------------------------------------------+
| [Clear] [Next module]                                               |
+---------------------------------------------------------------------+
```

### Real behavior
1. Dropdown selection stores `property_list_id`.
2. Save/Update sends `property_list_id` to API.
3. Backend resolves canonical property values from `property_list`.
4. Bill row saved in `property_billing_records` with foreign key.

## 6. Records Screen (Operational Review + Edit Entry)
```text
+---------------------------------------------------------------------+
| Search [__________________________]      [Edit Selected] [Export]   |
+---------------------------------------------------------------------+
| DD | Property | Unit Owner | module fields...                       |
|---------------------------------------------------------------       |
| row 1                                                               |
| row 2                                                               |
+---------------------------------------------------------------------+
| Pagination: [Previous] [Next]                                       |
+---------------------------------------------------------------------+
```

### Real behavior
1. User selects row.
2. `Edit` routes user to the correct bill module.
3. Form opens in update mode using selected row identity.

## 7. Data Process (Real Backend Logic)
```text
Property Records UI
    -> property_list (master)
           id = property_list_id

Bills UI save/update
    -> sends property_list_id
    -> API resolves master data from property_list
    -> writes property_billing_records (FK: property_list_id)
    -> duplicate control by property identity + bill_type (active rows)

List endpoints
    -> join property_billing_records + property_list
    -> always display canonical property metadata
```

## 8. Logout
```text
+-------------------------------------------+
| Confirm Logout                            |
| Are you sure you want to log out?         |
| [Cancel]                      [Log Out]   |
+-------------------------------------------+
```
