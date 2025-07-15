This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

# Steps to test

1. **Register, verify your email, and log in.**  
   After your first login, please wait a few seconds while your account is activated and configured with PortalHQ.

2. **Go to the Deposits section.**  
   In this section, you can deposit via blockchain or via CLABE (testnet).  
   You can trigger an automatic payment from mock deposits. This will generate a CLABE transfer on the testnet, mint the tokens on Juno, and then credit them to your PortalHQ account.

3. **Make a remittance.**  
   You can send a remittance to `mariano@anclap.com` or `juan@anclap.com`, and we will collect it on your behalf. 🤪  
   You can also send remittances to unregistered users — we will send them an email so they can register and receive the remittance.

4. **Claim the remittance.**  
   Due to the nature of this project, this manual step is required from the recipient.  
   The receiving user must enter their details to claim their remittance.
