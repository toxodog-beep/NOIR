# NOIR FRAME

NOIR FRAME is a mobile-first commerce prototype for Korean eyewear and silver accessories.

## Current Scope

- Mobile storefront for sunglasses, optical frames, rings, and necklaces
- Product catalog with trend/classic/statement/metal/accessory lines
- Cart, guest checkout, local demo payment, order lookup
- Admin login, product management, order list, status updates, full payment cancel path
- Neon/Postgres-ready schema and Toss Payments provider boundary

## Local Verification

This workspace uses the bundled Codex Node runtime in this environment. If normal Node.js is installed, run:

```powershell
node --test .\tests\*.test.mjs .\tests\mobile-smoke.cjs
```

In the Codex desktop environment used here, the verified command was:

```powershell
$env:NODE_PATH='C:\Users\user\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules;C:\Users\user\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules\.pnpm\playwright-core@1.60.0\node_modules'
& 'C:\Users\user\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' --test .\tests\*.test.mjs .\tests\mobile-smoke.cjs
```

## GitHub Push

This machine currently does not expose `git` or `gh` in PowerShell. Once Git and GitHub CLI are installed and authenticated, create and push the repository with:

```powershell
git init
git add -A
git commit -m "feat: add noir frame mobile commerce prototype"
gh repo create noir-frame-mobile-commerce --private --source=. --remote=origin --push
```

If the repository already exists:

```powershell
git remote add origin https://github.com/<owner>/noir-frame-mobile-commerce.git
git push -u origin main
```

## Production Notes

Before production launch:

- Replace local demo payment with Toss sandbox and production keys
- Configure `DATABASE_URL`, `TOSS_CLIENT_KEY`, `TOSS_SECRET_KEY`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`, and `NEXT_PUBLIC_APP_URL`
- Migrate the prototype to the planned Next.js App Router structure
- Add legal pages for terms, privacy, shipping, exchange, and refunds
