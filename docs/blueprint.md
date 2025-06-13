# **App Name**: CryptoPilot

## Core Features:

- Intelligent Dip Detector: AI-powered dip detection using the past week's price movements and Robinhood's historical market data. Uses a tool to compare the current price with historical data, identifies potential dip, and determines the allocation (if any) between BTC and ETH. Includes 3% profit target.
- Robinhood API Interface: Robinhood API Integration for live market data and automated trading execution of BTC and ETH. Automatically gets all Market Data using https://docs.robinhood.com/crypto/trading/#tag/Market-Data. 
- Risk Management Module: Portfolio management that stays within the $2000 limit.
- Automated Scheduler: Scheduled algorithm execution every 5 minutes to check and execute order when necessary.
- Dip Visualization: A chart of BTC/ETH prices over the past week to visually highlight detected dips.
- Portfolio Dashboard: Real-time tracking of your total holdings in BTC and ETH.

## Style Guidelines:

- Primary color: Saturated blue (#3498DB) to evoke trust and stability in financial contexts.
- Background color: Light blue (#EBF5FB), offering a clean and calm backdrop.
- Accent color: Analogous, more vibrant blue (#2980B9) for call to actions.
- Body and headline font: 'Inter', a grotesque-style sans-serif providing a modern, machined, objective look, suitable for both headlines and body text.
- Code font: 'Source Code Pro' for displaying API responses or code snippets.
- Simple, outline-style icons representing market trends (up/down arrows), crypto assets (BTC/ETH symbols), and risk management elements (shield, warning signs).
- Subtle transitions when the algorithm detects a dip or executes a trade.