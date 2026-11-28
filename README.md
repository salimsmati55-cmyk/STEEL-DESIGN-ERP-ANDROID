# STEEL DESIGN ERP — Clean Start

A fresh web application implementation. All application source is newly authored in `web/`; no previous app code or database schema is reused.

- Arabic RTL responsive interface
- Standalone IndexedDB database: `steel-design-clean-start`
- Initial modules: dashboard, orders, production, inventory, customers, suppliers, payments, settings
- Create/edit orders and finish production directly from the production list
- JSON backup export
- PWA manifest and offline app-shell cache

Serve `web/` over localhost or HTTPS. This is an initial foundation, not a production-ready release; deeper accounting, inventory movement, archive protections, data validation, and automated testing remain to be implemented.