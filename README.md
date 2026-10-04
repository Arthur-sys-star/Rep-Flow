# Rep-Flow — Complete Browser Client

A repair-workshop website built with **HTML, CSS, and vanilla JavaScript**. All application records, demo sessions, settings, and compressed images are saved in **Chrome localStorage**. No backend, external API, build step, npm dependency, or IndexedDB is needed to run the website.

## Deploy with GitHub Pages

1. Extract the ZIP on your computer. Do not upload the ZIP itself as the website.
2. Create a GitHub repository, such as `repflow`. A public repository is the simplest option for GitHub Pages on GitHub Free.
3. Upload the extracted **contents** into the repository root: `index.html`, the other HTML files, `css`, `js`, and `assets`. `index.html` must be directly in the repository root, not inside a second project folder. Include the supplied `.nojekyll` file when uploading with Git; the app also contains no Jekyll-dependent content.
4. Commit the files to the `main` branch.
5. Open **Settings → Pages → Build and deployment**.
6. Set **Source → Deploy from a branch**, then choose **main** and **/(root)**. Click **Save**.
7. When deployment completes, open the published address shown in Pages, typically `https://YOUR-USERNAME.github.io/repflow/`.

The project uses relative file paths, so repository subpaths work. There are no environment variables to configure. The project has been prepared for deployment; it has not been published to your GitHub account.

Official instructions:
- https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
- https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site

## Run locally in Chrome

Use VS Code's Live Server extension, or open a terminal in the extracted project folder and run a static file server:

```sh
python -m http.server 8000
```

On Windows, `py -m http.server 8000` may be the correct command. Open **http://localhost:8000/** in Chrome. Python only serves the files; the website's application logic is entirely JavaScript in Chrome. Stop the server with Ctrl+C.

Keep using the same hostname and port to retain the same storage origin. For example, `localhost:8000`, `127.0.0.1:8000`, and a GitHub Pages address have separate storage. Use Backup & restore to transfer records.

Do not double-click the HTML file. Storage sharing across `file://` pages is not reliable. Use localhost for development and HTTPS for deployment. Demo password verification also uses the browser's Web Crypto API.

## Demo accounts

Select the matching role tab before signing in. The **Use these demo credentials** link fills the form.

| Role | Email | Password |
| --- | --- | --- |
| Admin | admin@repflow.com | Admin@123 |
| Staff | staff@repflow.com | Staff@123 |
| Technician | technician@repflow.com | Tech@123 |

These are public demo credentials, not production secrets. Admins can create local accounts and change demo passwords through User accounts. Creating a technician profile and creating a login are separate operations: link the technician account to its profile in Technicians.

## Completed features

- **Overview:** live repair counts, payment totals, repair pipeline, technician workload, recent repairs, overdue and low-stock alerts.
- **Repair tickets:** intake and edits, customer/device details, priority, due dates, assignments, table and board views, search and status filters, CSV export.
- **Repair workflow:** permitted status changes, timestamped history, notes, before/after photos, inventory parts and returns, delivery checklist.
- **Customers:** create, edit, delete unused customers, search, and repair history.
- **Technicians:** profiles, specializations, experience, active status, linked login account, calculated workload.
- **Inventory:** part catalog, SKU uniqueness, prices, opening stock, adjustments with reasons, low-stock filters, movement history. Stock cannot become negative.
- **Billing:** one invoice per repair, parts and labor, discount and tax calculations, immutable issued totals, customer/business snapshots, print or Save as PDF, CSV export.
- **Payments:** partial and full payments, Cash/UPI/Bank transfer/Card records, transaction references, duplicate-reference checks, no overpayment.
- **Reports:** date filters, repair activity, invoiced amount, recorded payments, remaining balances, payment-method breakdown, CSV export.
- **Accounts:** local demo accounts, role changes, activate/deactivate, demo password changes. The current administrator cannot remove their own administrator access.
- **Settings:** business details, payment instructions, bank/UPI information, and uploaded QR image. New settings apply to new invoices; existing invoices keep their snapshot.
- **Activity log:** logins, record changes, stock operations, repair updates, and payments, with search and CSV export.
- **Backup & restore:** JSON export with all records and compressed images, validated replacement import, confirmation before reset, original demo dataset restoration.
- **Shared UI:** responsive navigation, search, workshop alerts, labeled forms, keyboard focus support, status messages, and printable invoices.

## Example workflow

1. Sign in as Admin or Staff and create a customer.
2. Create a repair ticket and assign it to a technician.
3. Move the ticket from **New → Diagnosing → In Progress → Testing → Ready**. Waiting for Approval and Waiting for Parts are available when appropriate.
4. Add repair notes and optionally photos. Use parts through the ticket's Parts tab; stock is reduced automatically. Returning a part restores stock.
5. Create an invoice with labor, tax, and discount. Its parts are now locked.
6. Independently verify receipt of money, then use Record payment. Record partial payments if necessary.
7. After the invoice is fully paid, Admin or Staff can choose Delivered and complete all three handover checks.
8. Export a JSON backup regularly.

A cancelled repair returns its used parts to stock. Delete an unpaid invoice first if cancellation is required. Invoices with payments cannot be deleted. Customers, technicians, and parts referenced by repair history cannot be deleted. Closed tickets cannot be edited. Refund processing is not implemented; payments are append-only records.

## Roles

| Feature | Admin | Staff | Technician |
| --- | --- | --- | --- |
| Overview and tickets | All | All | Assigned tickets |
| Create/edit intake and assign technicians | Yes | Yes | No |
| Repair status, notes, parts, photos | Yes | Yes | Assigned open tickets |
| Deliver/cancel a repair | Yes | Yes | No |
| Customers | Manage | Manage | No |
| Technician profiles | Manage | View | No |
| Inventory | Manage | Manage | View; consume via assigned ticket |
| Billing and reports | Yes | Yes | No |
| User accounts, payment settings, audit, backup/reset | Yes | No | No |

These are interface controls only. Anyone with access to this browser's developer tools can inspect or change the code and localStorage.

## How persistence works

- `repflow_db_v2` is the JSON database. Related stock/ticket/payment/activity changes are saved in a single localStorage write.
- `repflow_session` holds the demo session. Logout removes the session while preserving business data.
- Chrome Web Locks serialize database writes between tabs where available.
- Existing record collections from the original archive's `repflow_*` keys are migrated on the first launch of this edition; legacy keys are not automatically erased.
- Sample data is seeded once and does not overwrite a populated database on refresh.
- Data is saved for the current browser profile and origin. It does **not** synchronize between separate computers, users, Chrome profiles, or GitHub Pages addresses. Signing in as different roles on the same profile accesses that profile's local workshop dataset.
- Clearing site data removes records. Incognito/private-session data is temporary. Export backups before changing browsers or site addresses.
- Photos are compressed JPEG data URLs in localStorage. Accepted upload types: JPEG, PNG, WebP, up to 5 MB before compression. Repair tickets allow up to 20 images, subject to the browser's much smaller overall storage quota. Quota errors are shown to the user; unneeded photos can be removed after exporting a backup.
- No requests to external services are made by the application.

LocalStorage behavior: https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage

## Files

| Path | Purpose |
| --- | --- |
| `index.html`, `js/login.js` | Role-based demo login |
| Other root HTML files | Application page entry points |
| `css/style.css` | Layout, forms, responsive rules, and invoice printing |
| `js/storage.js` | Atomic localStorage database operations and migration |
| `js/auth.js` | Demo login, session, and role checks |
| `js/api.js` | Local business rules; no HTTP API |
| `js/seed.js` | First-run sample dataset |
| `js/photos.js` | Compression and localStorage photo storage |
| `js/utils.js`, `js/nav.js` | Shared formatting, navigation, dialogs, exports |
| `js/app.js` | Dashboard, directories, reports, activity, page controller |
| `js/tickets.js` | Ticket views, forms, repair workflow |
| `js/billing.js` | Billing, payment records, invoice printing, settings |
| `js/data.js` | Backup validation, import/export, reset |
| `assets/favicon.svg` | Local application icon |
| `tests/workflows.cjs` | Dependency-free automated logic tests |
| `tests/RESULTS.md` | Verification scope and limitations |
| `REBUILD_PROMPT.md` | Reusable prompt for this project |

## Verification

If Node.js is installed, run:

```sh
node tests/workflows.cjs
```

68 assertions passed during preparation, covering core workflows, local persistence, quota failures, role checks, backup restoration, HTML generation for all app pages, and navigation generation. JavaScript syntax and local HTML asset references were also checked.

Interactive Chrome testing, screenshots, actual print/PDF output, file-upload interaction, and real GitHub Pages deployment were **not verified in this environment** because the available browser could not access the local preview and a Chromium test binary could not be obtained. See `tests/RESULTS.md` for the manual checklist.

## Scope

This is a functional **browser-local demonstration**, suitable for a project presentation and static hosting. It is not a secure multi-user workshop system. Do not store real passwords, confidential customer information, or sensitive payment credentials. Payments are recorded manually: no money is transferred and no UPI/bank transaction is automatically verified. Passwords use salted browser hashing for the demonstration, which does not make browser-only authentication secure.
