Act as an experienced frontend developer. Inspect the attached Rep-Flow ZIP and complete its unfinished repair-management website using only HTML5, CSS3, and vanilla JavaScript, with all records saved in Chrome localStorage.

Preserve the project identity and useful existing structure. Inspect every file before editing, identify missing scripts and incomplete workflows, and implement complete working code for every page. Do not replace functioning features with placeholders.

Complete the dashboard, repair tickets, customer management, technician assignments, inventory, billing, payments, reports, local demo accounts, payment settings, activity log, and backup/restore. Connect the full workflow: customer → ticket → technician → repair/parts → invoice → recorded payment → delivery.

Make every button, form, filter, navigation link, and export work. Include form validation, useful errors, empty states, responsive layouts, and keyboard-friendly controls. Technician views must show assigned work. Clearly label browser-only authentication as a demo.

Use one versioned localStorage database with unique record IDs and safe migration. Preserve existing records across refresh and browser restarts; seed sample data only once. Save related ticket, stock, invoice, and payment changes together. Prevent negative stock, duplicate invoices, overpayments, and delivery before payment. Handle corrupted data and storage-quota failures without silently erasing existing records.

Store only small compressed photos in localStorage and explain its size limits. Add CSV exports, printable invoices, complete JSON backup/restore, and confirmed demo reset. Explain that data is local to the current browser/site and does not synchronize between devices. Payments must be described as manually recorded, not automatically processed.

Make the site deployable on GitHub Pages with index.html at the repository root, relative asset paths, and no backend or build step. Provide the complete final ZIP, folder structure, demo credentials, local running instructions, and exact GitHub Pages deployment steps.

Test the main workflows, persistence, role checks, validation, mobile layouts, and links. Report what was actually tested and any remaining limitations. Deliver working files, not only a plan or sample snippets.
