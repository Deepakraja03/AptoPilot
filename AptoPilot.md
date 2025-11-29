# 🚀 AptoPilot — 24-Hour Hackathon Pitch & Feasible MVP Plan

Here’s a **tight pitch** you can deliver and a **realistic build scope** that fits **Track 1: DeFi Trading** + optional **Photon** + optional **Shelby**.

---

## 🏆 Pitch Title

### **AptoPilot — The AI Autopilot for DeFi on Aptos**

---

## 🎤 Elevator Pitch (30 seconds)

> **AptoPilot is an AI-powered DeFi autopilot built on Aptos.**
> Instead of manually navigating swaps, yield farms, and risk settings, users simply **type a sentence like:**
> **“Park 40% of my USDC in the highest-yield pool and exit if APY drops below 5%.”**
>
> AptoPilot **parses that intent**, builds an **automated strategy** under the hood, and **executes it on-chain**—monitoring APY, triggering rebalances, and exiting on risk signals.
>
> It’s the first **execution-first trading autopilot** on Aptos, powered by **smart strategy vaults**, **automated agents**, and **Photon reward incentives**.
> **DeFi without toggles, sliders, or 12-screen flows — just pure intent → execution.**

---

## 💡 Problem

Current DeFi UX is overwhelming:

- users must manually choose vaults, farms, routes, and risk settings
- need constant monitoring of APY & market conditions
- requires on-chain transaction experience & gas management

Even existing “AI DeFi tools” only generate suggestions or swap once — **they don’t automate multi-step strategies**.

---

## 💡 Solution

**AptoPilot turns plain-English goals into live, self-running strategies.**

| User says                    | AptoPilot does                      |
|-----------------------------|-------------------------------------|
| “DCA 10 USDC daily into APT” | Schedules automated swaps           |
| “Exit if APY falls below 5%” | Agent monitors APY & triggers exit  |
| “Move 30% into best yield”   | Route to highest pool automatically |

---

## ⚙️ How AptoPilot Works

**Intent → Strategy → Execution → Monitoring**

1️⃣ **Parse natural language** into structured strategy JSON  
2️⃣ **Store strategy on-chain** in an Aptos Move Strategy Registry  
3️⃣ **Worker/Agent monitors conditions** (APY / time / price)  
4️⃣ **Executes actions** via DEX/Yield protocol (e.g., Cetus)  
5️⃣ **Photon rewards traders** based on automated volume & success  
6️⃣ *(Optional)* **Shelby** stores strategy & execution logs  

---

## 🧱 Architecture (Simplified for Hackathon MVP)

```
Frontend
  ↓ enter intent
Intent Parser (keywords / GPT mini)
  ↓ JSON strategy
Strategy Registry (Move contract)
  ↓ store strategy params
Execution Agent (cron job)
  ↓ monitors APY/conditions
Cetus / Hippo DEX call
  ↓ execute swap/deposit
Logs + UI updates
```

---

## 🪄 What We Will Actually Build in 24 Hours (Realistic MVP)

### Core functionality we CAN deliver:

| Feature           | Version for Hackathon                      |
|-------------------|--------------------------------------------|
| Intent input      | text box → backend parser                  |
| Parsing           | regex + keyword NLP (no full LLM required) |
| Strategy types    | DCA + APY-exit + % allocation              |
| Move contract     | Strategy store + execute swap via Cetus    |
| Execution engine  | cron worker / loop agent                   |
| UI                | dashboard: strategies + logs               |
| Photon            | reward event: strategy created + executed  |
| Shelby (optional) | store intent + execution logs              |

### Example demo flow:

1. Enter: *“DCA 5 USDC into APT every hour”*  
2. System shows parsed JSON output  
3. Deploy strategy → Write to Move contract  
4. Worker runs every minute, executes swap if ready  
5. Logs visible on dashboard + Photon rewards earned  

---

## 📊 Slide Summary (5-Slide Submission)

### Slide 1 — Problem
DeFi complexity / monitoring requirements / risky UX

### Slide 2 — Solution
AptoPilot autopilot intent → execution

### Slide 3 — Demo
Create strategy → execute → automated result

### Slide 4 — Why Aptos + Photon + (Shelby optional)
- Aptos parallel execution = high-frequency automation
- Photon = reward layer for automated trading
- Shelby = shared verifiable strategy memory

### Slide 5 — Future Vision
Cross-chain execution, advanced strategy graph, fully autonomous agents

---

## 🎯 Why This Can Win Track 1

| Track Requirement   | Our Match                    |
|---------------------|-----------------------------|
| agentic traders     | automated execution agent    |
| smart vaults        | strategy vault contract      |
| execution routers   | route via Cetus best pricing |
| risk engines        | APY/trigger monitoring       |
| analytics dashboard | logs + simple pnl tracking   |
| Photon incentives   | volume-based gamification    |

---

## 🥇 Positioning Statement

> **First intent-driven execution autopilot on Aptos — going beyond basic swaps, delivering real autonomous strategy execution that improves DeFi performance and UX.**

---

## 🚦 Next Step

If you want, I can now deliver:
- **A. Move contract blueprint**
- **B. Strategy JSON schema**
- **C. Backend worker logic**
- **D. UI wireframe in Tailwind**
- **E. Slide deck template**

Reply **A / B / C / D / E / ALL** to proceed.
