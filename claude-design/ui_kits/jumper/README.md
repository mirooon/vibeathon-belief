# Jumper UI Kit

Recreates the **Jumper Exchange** consumer app (jumper.exchange) — LI.FI's everything-exchange frontend.

Reconstructed from the live site. For pixel-perfect fidelity, import `github.com/lifinance/widget` or `github.com/lifinance/jumper` and resync component internals.

## Components
- `AppShell.jsx` — page shell with top nav + wallet + background halo
- `SwapWidget.jsx` — the centerpiece: from/to token inputs, swap-arrow, route summary, primary CTA
- `TokenRow.jsx` — amount + token selector row
- `RouteSummary.jsx` — best-route readout (gas, time, slippage)
- `WalletMenu.jsx` — connected wallet pill with dropdown
- `ChainPicker.jsx` — chain dropdown modal
- `SideNav.jsx` — left rail (Exchange / Buy / Earn / Bridge)

## Screens shown in index.html
Default **Exchange** view: side nav + centered swap widget with ETH → USDC populated, route summary, primary "Review swap" CTA. Click **Review swap** to open the confirm sheet.
