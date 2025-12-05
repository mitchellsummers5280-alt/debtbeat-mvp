debtbeat-mvp/
│
├── app/
│   ├── layout.tsx          # Global layout + navbar + AuthProvider
│   ├── page.tsx            # Main UI for entering debts & generating plans
│   ├── api/
│   │   └── auth/[...nextauth]/route.ts  # NextAuth API route
│   └── demo/               # Demo page (optional)
│
├── components/
│   ├── UserMenu.tsx        # Auth-aware user dropdown menu
│   ├── PageTransitions.tsx # Framer Motion wrapper (optional)
│
├── lib/
│   ├── auth.ts             # NextAuth config
│   ├── debtPlan.ts         # Core payoff logic (strategy engine)
│
├── prisma/
│   ├── schema.prisma       # Prisma schema (if expanded later)
│
├── public/
│   └── default-avatar.png
│
├── .env                    # Environment variables (ignored by Git)
├── .gitignore
├── package.json
└── README.md
