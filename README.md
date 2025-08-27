# Payroll Platform

A comprehensive web application that enables companies to instantly pay global gig workers and freelancers in USDC across multiple blockchains using Circle's APIs.

## Hackathon Challenges Addressed

This project addresses the following challenges:

1. **Multichain USDC Payment System** - Using CCTP v2 for cross-chain transfers
2. **Pay Gas Using USDC** - Integration with Circle Paymaster
3. **Gasless Experience** - Powered by Circle Gas Station

## Features

- **Admin Dashboard**: Upload CSV payroll data and manage batch payouts
- **Multichain Payouts**: Send USDC across Ethereum, Arbitrum, Base, Avalanche using CCTP v2
- **Worker Wallets**: Embedded Circle Programmable Wallets with secure key management
- **Gasless Transactions**: Workers transact without needing native tokens
- **USDC Gas Payments**: Pay transaction fees directly with USDC balance
- **Real-time Status**: Live payout tracking with webhook updates

## Architecture

- **Frontend**: Next.js 14 + TypeScript + Tailwind CSS
- **Backend**: Express.js + TypeScript + Prisma ORM
- **Database**: PostgreSQL
- **Circle APIs**: Crypto Payouts, CCTP v2, Gas Station, Paymaster


## Environment Variables

Create `.env` files in both frontend and backend directories with your Circle API credentials.

## Demo

- Admin creates payroll run with worker details
- System processes batch USDC payouts via Circle APIs
- Workers receive funds in embedded wallets
- Workers can withdraw cross-chain using CCTP v2
- All transactions are gasless or use USDC for gas fees

## License

MIT License - Built for Circle Developer Hackathon
