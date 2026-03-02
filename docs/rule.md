# Documentation & Workflow Rules

Mandatory File Updates: Every time a new feature is requested, the agent must update the following files before writing any application code:

- **Plan.md**: Record the high-level strategy, goals, and logic flow.
- **Implementation.md**: Detail the specific file changes, folder structures, and technical steps.

**Approval Process (STRICT — Do NOT skip steps):**
1. **Plan First** → Update `Plan.md` and `Implementation.md` with proposed changes.
2. **Wait for Approval** → Show both files to the user. **Do NOT write any code until the user confirms.**
3. **Code After Approval** → Only after the user says "approved" or "succeed", proceed to edit the actual code files.
4. **Mark as Done** → After the code is implemented and verified, mark items as `[x]` in both `Plan.md` and `Implementation.md`.

**Synchronization**: Ensure these files remain the "source of truth" for the project's current state.

---
# Translator
- Act as a prompt optimizer. Convert the following sentence into a clear, detailed, and precise instruction suitable for an AI coding assistant. Preserve the original meaning. Do not solve the problem. Only rewrite it clearly.

# Technical & Design Rules

## 1. Technology Stack
- **Backend**: PHP (Vanilla, no framework).
- **Frontend**: HTML5, Vanilla JavaScript.
- **Styling**: Tailwind CSS (via CDN) + Custom CSS for specific effects.
- **Database**: MySQL (via `db.php`).

## 2. Design System & UI/UX
- **Theme**: Minimalist / Corporate.
  - **Sidebar**: Dark (Slate-900).
  - **Main Content**: Light (Slate-50/Gray-100).
- **Visual Style**: **Clean & Flat**.
  - No Glassmorphism. Use solid backgrounds.
  - Cards: White (`bg-white`) with subtle shadows (`shadow-sm` or `shadow`).
  - Borders: Very subtle gray (`border-slate-200`).
- **Color Palette**:
  - Primary Accent: Teal/Emerald (`teal-500`, `emerald-500`) - as seen in the "Create proposal" button.
  - Text: Dark Slate (`slate-800`) for headings, Muted (`slate-500`) for secondary.
  - Sidebar Text: White/Gray.
- **Typography**: `Inter` (Google Fonts) or stick with `IBM Plex Sans` if preferred. (Will switch to Inter for cleanliness).

## 3. Project Structure
- **Entry Point**: `index.php` (Contains the main UI shell and Sidebar).
- **Logic**: `script.js` handles DOM manipulation and API calls.
- **API**: `api.php` handles backend requests (JSON responses).
- **Database Config**: `db.php`.

## 4. Coding Conventions
### HTML/CSS
- Use semantic HTML tags (`<nav>`, `<main>`, `<section>`, `<header>`).
- Prioritize **Tailwind CSS** utility classes over custom CSS where possible.
- Use `id` attributes for JavaScript hooks (e.g., `id="content-new-entry"`).

### JavaScript
- Use `async/await` for `fetch` operations.
- Handle errors gracefully and display user-friendly messages using the `showMessage` function.
- Keep the global namespace clean; encapsulate logic where possible (though `script.js` currently uses top-level event listeners).

### PHP
- Return JSON responses for API endpoints.
- Ensure proper error handling and status codes.

## 5. Navigation
- The application uses a **Sidebar** layout.
- Content sections are toggled via JavaScript (SPA-like feel) rather than full page reloads.
- Active states should be visually distinct (e.g., gradients, text color changes).

---

## 6. N8N Workflow Integration
- **Webhook URL**: `http://localhost:5678/webhook-test/67f1d653-8157-43b2-9961-5faf455bd88e`
- **PHP Proxy**: All N8N calls go through `api.php` (`action=upload_bill`) — never expose the webhook URL in frontend code.
- **Response Format**: N8N must return `{ success: true, data: { ...fields } }` via the Respond to Webhook node.
- **OCR**: Image files use [OCR.space](https://ocr.space) free API. PDFs use n8n's built-in "Extract from File" node.
- **Error Log**: See `Error&Fix.md` for all known issues and their solutions.

