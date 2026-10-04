# Verification record

## Completed

- 68 automated assertions passed with `node tests/workflows.cjs`.
- Tested all three demo roles and incorrect credentials/role selection.
- Tested customer creation/editing and linked-history deletion guard.
- Tested intake, technician assignment, diagnosis, repair, testing, ready status, invoicing, partial/full payment, and final delivery.
- Tested stock consumption/return, negative-stock prevention, and stock return on cancellation.
- Tested role checks, technician ticket visibility, and blocked unauthorized mutations.
- Tested duplicate invoices, locked invoiced parts, overpayments, payment references, paid-invoice deletion guard, and handover requirements.
- Tested account duplication/deactivation and protection of the current administrator.
- Tested immutable invoice business details after settings changes.
- Tested a simulated storage quota failure without losing the previously saved database.
- Tested localStorage photo put/get/remove, backup validation and restoration, session clearing after restore, and persistent records after reseeding.
- Generated page HTML for all 11 app pages and the administrator navigation without JavaScript exceptions.
- Checked every shipped JavaScript file for syntax errors and all root HTML script/style/icon references for missing local files.

The workflow tests use an in-memory localStorage adapter, Node's real Web Crypto implementation, and a small document stub. They verify application rules and generated markup, not actual browser interaction or visual layout.

## Manual Chrome checklist

These items remain for browser verification; they are not claimed as completed:

1. Open the site through localhost or GitHub Pages and sign in with each role.
2. Click through every visible page; verify no console errors or failed file requests.
3. Add a customer, create a ticket, assign a technician, and reopen it after refresh.
4. As Technician, add a note and a small before/after image to an assigned ticket.
5. Consume and return a part; compare ticket details, stock, and stock history.
6. Complete the repair, create an invoice, record a partial payment and final payment, then deliver using all handover checkboxes.
7. Print the invoice; check A4 layout and Chrome's Save as PDF output, including any uploaded QR image.
8. Download CSV exports and a JSON backup. Restore the backup and log in using an account from that backup.
9. Close and reopen Chrome at the same address; check saved data and the session.
10. Check narrow/mobile layouts, navigation drawer, table scrolling, dialogs, and keyboard navigation.
11. Deploy under a GitHub Pages repository subpath and verify links and refresh behavior.

Browser preview access was blocked by the environment. No live GitHub repository was created or published.
