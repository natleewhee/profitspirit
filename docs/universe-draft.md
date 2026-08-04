# Scan Universe — Draft v0

Curated universe for the weekly agent scan. Three themes, ~200 names total.
This is a **draft for cutting down**, not a final list. Expect to delete 30-40%.

**Status:** unverified except where noted. See "Verification" at the bottom
before this becomes seed data.

**How to use this:** go bucket by bucket. If a whole bucket doesn't match how
you think about the market, delete the bucket — that's faster than picking at
individual names, and the bucket rationale is there so you can judge it.

---

## Theme 1 — AI Infrastructure / Semis (~66)

Your existing area of focus. This list is deliberately broad along the *supply
chain* rather than deep in any one layer, so a trigger anywhere in the chain
(fab equipment, power, interconnect) surfaces before it shows up in the
obvious mega-caps.

### Compute / logic
NVDA, AMD, AVGO, MRVL, QCOM, INTC, ARM

### Memory & storage
MU, WDC, STX

### Foundry
TSM, GFS, UMC

### Semicap equipment
ASML, AMAT, LRCX, KLAC, TER, ONTO, ACLS, CAMT, NVMI, AEIS

### Materials & subsystems
ENTG, MKSI, IPGP

### EDA / IP
SNPS, CDNS

### Interconnect, optical, networking
ALAB ✓, CRDO, ANET, CIEN, COHR, LITE, AAOI, APH, TEL

### Analog & power delivery
MPWR, ADI, TXN, POWI, VICR

### Servers & systems
SMCI, DELL, HPE, PSTG, NTAP

### Neoclouds / GPU compute
CRWV ✓, NBIS ✓, APLD, IREN, CIFR, WULF, CORZ

### Datacenter REITs
EQIX, DLR

### Electrical & thermal infrastructure
VRT, ETN, NVT, GEV ✓

### Power generation with datacenter exposure
CEG, VST, TLN

### Nuclear / SMR
BWXT, SMR, OKLO ✓

> **Note on the last two buckets:** power is where AI-infra and "non-tech
> asymmetric" genuinely overlap — the datacenter-demand angle sits here,
> the uranium/fuel-cycle angle sits in Theme 2. No ticker overlap left after
> your cuts, but worth remembering these two buckets are reading the same
> trade from different angles.

---

## Theme 2 — Non-Tech Asymmetric (~72)

This is the bucket that needed the most deliberate construction, because
"asymmetric" is a strategy descriptor, not a sector. I've organised it by
*why* each bucket is asymmetric — that's the part to argue with. The names
inside are replaceable; the reasoning shouldn't be.

### Uranium & fuel cycle
*Supply deficit against inelastic demand; small sector, large moves.*
CCJ, UEC, UUUU, DNN

### Energy E&P
*High operating leverage to commodity price; bounded downside at strip.*
DVN, FANG, APA, MUR, CHRD, RRC, AR, EQT

### Oil services
*Capital cycle — underinvestment period, pricing power on recovery.*
SLB, HAL, BKR, WFRD, RIG, VAL, NOV

### Shipping & tankers
*Extreme cyclicality; rate spikes are non-linear vs. asset value.*
FRO, STNG, DHT, SBLK, ZIM, MATX

### Industrial metals & mining
*Electrification demand vs. multi-year supply lead times.*
FCX, CLF, X, MP, ALB

### Precious metals
*Tail hedge; convex to real rates and currency stress.*
NEM, AEM, KGC, RGLD

### Fertiliser & agriculture
*Food security + input cost cycles; episodic, violent re-ratings.*
MOS, CF, NTR

### Defence & aerospace
*Structural multi-year demand shift; long backlogs.*
LMT, RTX, NOC, GD, HII, LDOS, KTOS, AVAV, LHX, TDG

### Insurance
*Underwriting cycle; hard market = durable pricing power.*
AIG, CB, TRV, RNR, EG, AXS, KNSL

### Homebuilders & building products
*Rate-sensitive with structural undersupply underneath.*
DHI, LEN, PHM, TOL

### Airlines
*Operating leverage; small load-factor moves swing earnings hard.*
DAL, UAL, LUV, ALK

### Pharma & biotech
*Patent cliffs and pipeline events — genuinely binary, size accordingly.*
PFE, BMY, MRK, ABBV, GILD

### LatAm / EM
*Currency and political discount vs. hard assets.*
VALE, PBR, BAP, GGB, SID

---

## Theme 3 — SGX (~35)

Closes the gap you flagged. Small enough to hand-list, which is the point —
this is exactly the sort of coverage Finviz never gave you.

### Banks
D05 ✓ (DBS), O39 (OCBC), U11 (UOB)

### Exchange
S68 (SGX)

### Telco
Z74 (Singtel), CC3 (StarHub), CJLU (NetLink NBN Trust)

### Industrial / marine / offshore
BN4 (Keppel), U96 (Sembcorp Industries), S63 (ST Engineering)

### Transport & aviation
C6L (SIA), S58 (SATS), S59 (SIA Engineering), C52 (ComfortDelGro)

### Property & developers
C09 (City Developments), U14 (UOL), H78 (Hongkong Land),
9CI (CapitaLand Investment)

### REITs
A17U (CapitaLand Ascendas), C38U (CapitaLand Integrated Commercial),
M44U (Mapletree Logistics), ME8U (Mapletree Industrial),
N2IU (Mapletree Pan Asia Commercial), AJBU ✓ (Keppel DC REIT),
K71U (Keppel REIT), C2PU (ParkwayLife), BUOU (Frasers Logistics),
J69U (Frasers Centrepoint)

### Consumer & commodities
F34 (Wilmar), C07 (Jardine Cycle & Carriage), D01 (DFI Retail),
Y92 (Thai Beverage), G13 (Genting Singapore), OV8 (Sheng Siong)

### Healthcare
BSL (Raffles Medical)

> **AJBU is worth flagging** — Keppel DC REIT is a Singapore-listed datacenter
> play, so it's simultaneously an SGX name and an AI-infra name. Good example
> of why the theme split shouldn't be treated as rigid.

---

## Verification

**Status: fully verified.** Every ticker in this document (all 173) has been
checked against IBKR's contract search — symbol, exchange, and company
description all confirmed to match — in this session.

**One exception: PSTG (Pure Storage).** Returned no match on either symbol
or name search, despite being a real, actively-traded NYSE company as far as
I know. This is either a gap in IBKR's search index or something has changed
since my knowledge cutoff — I can't tell which from here. Worth checking
directly before relying on it; consider it unverified until you do.

Two names resolve under updated descriptions but the same ticker (not
action items, just noting the change): **N2IU** now shows as "Mapletree Pan
Asia Commercial Trust" (was Mapletree Commercial Trust), and **D01** as "DFI
Retail Grp Hld-Sing Reg" (same entity).

For reference, IBKR's **name search is unreliable** (returned empty for
several real companies during verification), and symbol search returns noisy
results — leveraged ETFs tracking the name, bonds, and unrelated instruments
come back alongside the real listing. All verification here was done by
matching exact symbol + exchange, not description text.
