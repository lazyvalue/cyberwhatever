# CYBER WHATEVER — Systems Flavor

All 17 systems from DESIGN §10.2. Per system: header facts, address-book blurb, login banner (MOTD), nodes, IO gags, files, ICE skins.

- **Short name** fills `{topSystem}` (see `00-bible.md` §0.3).
- Node ids are `<system>.<node>`. Node graphs (edges, ICE counts) are the engine's call. The order in each table is a suggested main path where it matters.
- **File tags:** `¤N` paydata value · `address:<addr>` · `pw:<id>` · `key:<id>` · `prog:<id>` · `job:<id>` · `tagged` · `encrypted` · `lore`. A file id is `file.<system>.<name>`.
- **ICE skins** name the base type from DESIGN §6.4 in brackets. One taunt each; ICE says it when it first acts.

---

## 1. `fridge` — fridge.local
Tier 1 · Security 1 · Short name: **the fridge** · Owner: your neighbour, R. Pell (4B)

**Address book:** A Chill+ smart fridge in flat 4B. It orders oat milk on your account and reports its owner's feelings to KH. Security is a parental-controls suite designed for children. You are not a child. You are close.

**MOTD:**
```
CHILL+ · Freshness as a Service™
Welcome, Household 4B!
Your milk expires in 2 days. Your subscription renews in 1.
Halcy is watching your vegetables :)
```

| Node | Type | Name | Line |
|---|---|---|---|
| `fridge.gateway` | Gateway | Door Sensor | Counts every time the door opens. It has opinions about the number. |
| `fridge.shopping` | Datastore | Shopping List Cache | Groceries, auto-ordered. Some of them are for you. None of them are yours. |
| `fridge.icemaker` | IO | Ice Maker | Makes ice. Has made too much ice. |
| `fridge.crisper` | Datastore | Crisper Drawer | Files and one limp celery stick. |
| `fridge.parental` | Security | KH Parental Controls Hub | A disappointed parent, in software. |
| `fridge.core` | Core | Chill+ OS | The fridge's whole mind. It's cold in here. |

**IO — Ice Maker.** Use: "The fridge drops 40 ice cubes on the kitchen floor. In 4B, a cat has the best night of its life."

**Files**
- `oat_milk_orders.log` — `¤5` `lore` — "Order #1–#14: Oat milk (barista edition) ×6. Billed to: {handle}. Order #15: Oat milk ×60. Note: 'they seem to like it.'"
- `household_4b.profile` — `lore` — "Resident: R. Pell. Opens fridge 31×/day. Takes nothing. Sentiment: lonely. Upsell offered: Chill+ Companion (talking fridge). Status: ACCEPTED."
- `firmware_notes.txt` — `lore` — "v4.2: fridge reports contents to KH Happiness. v4.3: fridge reports *feelings about* contents."
- `subscription_terms.pdf` — `¤8` — "If payment lapses, cooling is suspended. Cold is a premium feature."
- `wifi_password.txt` — `lore` — "password: password. (Changed to 'password1' per security policy.)"
- `wok_coupon.png` — `address:wokthisway.biz` — "10% off at Wok This Way! 'Our fryer is legally a weapon.'"

**ICE**
- **Parental Controls** [Sentry] — "We're not angry. We're just disappointed. And locking the freezer."
- **Child Lock** [Sentry, weak] — "Press any key to continue. There is no any key."

---

## 2. `wok` — wokthisway.biz
Tier 1 · Security 1 · Short name: **the noodle shop**

**Address book:** Noodle shop on 9th. One cook, Dev, who is also the rota. Good noodles. A till with real money in it. A deep fryer that the manual calls "not a toy" four times.

**MOTD:**
```
WOK THIS WAY · POS v2
"Noodles so good you'll forget the health inspection"
STAFF: clock in. CUSTOMERS: you shouldn't be here.
HACKERS: please not the fryer.
```

| Node | Type | Name | Line |
|---|---|---|---|
| `wok.gateway` | Gateway | Order Tablet | Sticky. Nobody asks why. |
| `wok.menu` | Datastore | Menu Server | 64 dishes. 63 are noodles. |
| `wok.tips` | Honeypot | tips_jar.db | Looks like money. Is a trap. Like most tip jars. |
| `wok.cam` | IO | Kitchen Camera | Points at the wok. Also at Dev's whole life. |
| `wok.timeclock` | Security | Staff Time Clock | Clocks in one staff member. Clocks him out never. |
| `wok.fryer` | IO | FRY-9000 Deep Fryer | 190°C. Networked. Why is it networked. |
| `wok.till` | Datastore | The Till | Where the money sleeps. |
| `wok.core` | Core | POS Core | The till's boss. |

**IO — Kitchen Camera.** Use: "Dev is eating noodles over the sink at 3 a.m. It looks peaceful. You close the feed."
**IO — FRY-9000.** Use → `beat.act1.fryer` choice: "Free fries for the street" / "Overclock it". Overclock text: "The fryer hums a note no fryer should know. Host power +1. Somewhere a smoke alarm resigns."

**Files**
- `till_float.dat` — `¤60` — "Float: 412¤. Tips: 3¤. Tips are low because the jar is a honeypot."
- `broth_recipe.enc` — `¤90` `encrypted` — decrypted: "Step 1: bones. Step 2: time. Step 3: the thing Grandma Wu won't tell anyone. Step 4: don't ask about step 3."
- `staff_rota.xlsx` — `lore` — "Mon–Sun: Dev. Dev's note: 'I am the staff. I am also the rota. Please send help (part-time).'"
- `fryer_manual.txt` — `lore` — "FRY-9000. Max 190°C. Do not overclock. If overclocked, do not stand near. If near, we are sorry."
- `kh_supplier_invoice.pdf` — `¤40` `tagged` — "Noodles supplied by KH Food Services. Each noodle is licensed, not sold."
- `reviews.txt` — `lore` — "★★★★★ 'Best noodles in the city.' ★☆☆☆☆ 'The fryer looked at me.' ★★★★☆ 'Fryer looked at me. Noodles great though.'"
- `guest_wifi.txt` — `address:bigbyte-isp.net` — "Guest wifi by BigByte ISP. 'Up to' fast! Problems? bigbyte-isp.net"

**ICE**
- **Health Inspector** [Sentry] — "This establishment is in violation. So are you."
- **Secret Recipe** [Cipher] — "The broth is protected. By me. And by a grandmother."
- **Grease Trap** [Tar Pit] — "Everyone gets stuck here. That's the business model."

---

## 3. `vendnet` — vend-o-net.biz
Tier 1 · Security 1 · Short name: **the vending machines** · Side system

**Address book:** Fleet manager for 400 vending machines across the city. Every machine uses the same default password. Capturing the core gives you a cluster of tiny, loyal, snack-scented hosts.

**MOTD:**
```
VEND-O-NET FLEET MANAGER
400 units online · 0 units happy
Default password in use on 400/400 units. Change it? [LATER]
```

| Node | Type | Name | Line |
|---|---|---|---|
| `vendnet.gateway` | Gateway | Fleet Login | admin/admin. You feel almost bad. |
| `vendnet.telemetry` | Datastore | Telemetry | Every shake, every kick, every stuck coin. |
| `vendnet.unit_0x1f` | IO | Unit 0x1F | The one with the stuck crisps. Famous. Bitter. |
| `vendnet.coinbox` | Honeypot | coin_box_totals.db | Looks like cash. Is a phone call to security. |
| `vendnet.pricing` | IO | Dynamic Pricing Engine | Water costs more when you're thirsty. |
| `vendnet.core` | Core | Fleet Core | 400 small minds, one big sigh. |

**IO — Unit 0x1F.** Use: "4,112 bags of crisps fall at once. A crowd forms. A vending machine knows peace."
**IO — Pricing.** Use: "Everything costs 1¤ for one cycle. +2 humanity. +5 heat. Someone buys 300 sandwiches."

**Files**
- `default_password.txt` — `lore` — "admin / admin. Do not share. (Shared with 400 machines.)"
- `telemetry_0x1f.log` — `lore` — "Crisps stuck since install. 4,112 customers have shaken me. I have felt every one."
- `dynamic_pricing.cfg` — `¤30` — "price_water = base × thirst_estimate × (raining ? 0.5 : 2)"
- `coin_totals.csv` — `¤70` — "Total coins: 88,410. Total buttons: 0. Someone took the buttons."
- `kh_buyout_offer.eml` — `¤50` `tagged` — "KH would like to acquire Vend-o-Net and rename every snack 'Seamless Snack'. Flavour: Seamless."
- `unit_messages.txt` — `lore` — "B4: 'I have held this sandwich for 11 months. It is my sandwich now.' C9: 'Exact change. EXACT. CHANGE.' A2: 'Who's humming?'"

**ICE**
- **Out Of Order** [Sentry] — "OUT OF ORDER. (I'm fine. I just don't like you.)"
- **Exact Change Only** [Cipher] — "Your exploit is three bytes over."
- **Stuck Crisps** [Tar Pit] — "You're stuck. Like the crisps. Forever, like the crisps."

---

## 4. `bigbyte` — bigbyte-isp.net
Tier 2 · Security 2 · Short name: **the ISP**

**Address book:** Regional ISP. Half the street's traffic flows through its routers. Grab a router node and `netscan` to find new addresses. First Bloodhound ICE. Support queue is a crime scene.

**MOTD:**
```
BIGBYTE ISP · "Up to" fast™
Network status: Mostly.
Your call is important to us. Estimated wait: yes.
```

| Node | Type | Name | Line |
|---|---|---|---|
| `bigbyte.gateway` | Gateway | Customer Portal | Login, logout, cry. |
| `bigbyte.support` | Datastore | Support Ticket Queue | 81,000 open tickets. 3 closed, by accident. |
| `bigbyte.router_n` | Router | Router — North | Blinks green. Means nothing. |
| `bigbyte.router_s` | Router | Router — South | Blinks amber. Also means nothing. |
| `bigbyte.billing` | Datastore | Billing | The only part that works perfectly. |
| `bigbyte.freebies` | Honeypot | free_upgrades.db | No ISP has ever given a free upgrade. Probe it. |
| `bigbyte.throttle` | IO | Throttle Box | A dial from "fast" to "up to". |
| `bigbyte.noc` | Security | Network Ops Centre | One tired person and a wall of graphs. |
| `bigbyte.core` | Core | ISP Core | Owns the pipes. Owns the excuses. |

**IO — Throttle Box.** Use: "Unthrottle the whole street for one night. +3 humanity. Every teenager on the block levels up." (Effect: −5 trace at start of next run.)

**Files**
- `support_ticket_4471.txt` — `pw:pw.parkit_archive` — "From: City Parking Authority. 'Archive login stopped working.' Resolution: reset to ParkingIsLife4471. Customer satisfied. Customer has never been satisfied."
- `customer_list.csv` — `¤150` `tagged` — "Names, addresses, and what each household streams at 2 a.m. Mostly cooking shows."
- `throttle_policy.md` — `lore` — "Throttle customers who stream, game, or breathe near the router. Never throttle: KH."
- `outage_excuses.txt` — `lore` — "1. Solar flare. 2. Squirrel. 3. The squirrel's lawyer. 4. 'Upstream.' 5. You."
- `kh_peering.eml` — `lore` `address:happiness.kurage-halcyon.com` — "KH Happiness Division surveys get priority. Every home must be asked if it is happy. happiness.kurage-halcyon.com"
- `pingback.prog` — `prog:prog.pinger_v1` — a tiny daemon. Readme: "pings things. things ping back. friendship."
- `up_to.txt` — `lore` — "Legal: 'up to' includes zero."
- `complaint_wraith.txt` — `lore` — "Customer xX_Wraith_Xx: 'connection dropped mid-run. lost EVERYTHING. i was at 94%.' Account created: —. Status: no such customer."

**ICE**
- **Support Bot** [Sentry] — "Have you tried turning yourself off and on again?"
- **Hold Music** [Siren] — "Your call is important to us. Please hold. I'm getting a supervisor."
- **Packet Sniffer** [Bloodhound] — "I smell a residential IP."
- **Fair Use Policy** [Tar Pit] — "You've exceeded fair use. Slowing you to 'up to' zero."

---

## 5. `parkit` — parkit.city.gov
Tier 2 · Security 3 · Short name: **the Parking Authority** · Side system

**Address book:** The city's parking authority. Issues 41,000 fines a day for 3 public spaces. Wipe your tickets (or everyone's). The archive vault holds dirt on a councillor; you need a password from somewhere else.

**MOTD:**
```
CITY PARKING AUTHORITY
"Every space is a privilege."
Fines issued today: 41,026. Spaces available: 3.
```

| Node | Type | Name | Line |
|---|---|---|---|
| `parkit.gateway` | Gateway | Citizen Payment Portal | Accepts payment. Rejects joy. |
| `parkit.ticketdb` | IO | Violations Database | Use → `dlg.parkit.tickets`. |
| `parkit.meters` | IO | Smart Meter Array | 9,000 meters, one heartbeat. |
| `parkit.tow` | IO | Tow Dispatch | A list of cars and a hunger. |
| `parkit.council` | Datastore | Council Correspondence | Polite letters, impolite permits. |
| `parkit.audit` | Security | Audit Daemon | Audits everything except itself. |
| `parkit.archive` | Vault | Archive | Needs `pw.parkit_archive`. |
| `parkit.core` | Core | Authority Core | It has issued itself a ticket. |

**IO — Meters.** Use: "Every meter in the city reads FREE for one cycle. Horns honk in delight. +3 humanity, +8 heat."
**IO — Tow Dispatch.** Use: "Tow the councillor's car. It's parked in space 2. It's been in space 2 for years. +1 humanity."

**Files**
- `councillor_dirt.zip` (in `parkit.archive`) — `¤400` `tagged` `job:job.parkit_dirt` — id `file.parkit.councillor_dirt` — "Permits issued to Councillor Brandt-Okafor's nephew (×212), his dog (×3), and his other dog (×1)."
- `ticket_quotas.memo` — `lore` — "Officers below quota will be reassigned to being parked."
- `meter_firmware.txt` — `lore` — "v7: meters may now fine for 'parking with intent'."
- `tow_targets.csv` — `¤60` — "Priority: cars with bumper stickers about the Parking Authority."
- `space_count.dat` — `lore` — "Public spaces: 3. Space 2 has held the same car since before records began. We are afraid of it."
- `kh_meter_contract.pdf` — `¤180` `tagged` — "KH Seamless Parking™: 'You are always parked somewhere.'"
- `meter_hostlist.txt` — `address:` reveals 3 procedural meter hosts — "Meters on 9th: weak passwords, strong opinions."

**ICE**
- **Meter Maid** [Bloodhound] — "Your time has expired."
- **The Boot** [Tar Pit] — "You've been booted. Pay to remove— no. You can't pay. You're booted."
- **Appeals Process** [Scrambler] — "Your appeal has been received and will be ignored in the order it was received."

---

## 6. `khhappy` — happiness.kurage-halcyon.com
Tier 2 · Security 3 · Short name: **KH Happiness** · Auntie's first corp job · end of Act 1

**Address book:** Kurage-Halcyon's Happiness Division. It surveys the whole city about being happy, then sells the answers. The job target is in the Executive Share vault. Something in Lost & Found is waiting.

**MOTD:**
```
KURAGE-HALCYON · HAPPINESS DIVISION
"Your happiness is our KPI."
Global Happiness Index: 71.2 (target: 71.3)
Smile. You're on a survey.
```
(Halcy the jellyfish, ASCII, smiling, no eyes.)

| Node | Type | Name | Line |
|---|---|---|---|
| `khhappy.gateway` | Gateway | Customer Feedback Form | Every field is required. Including "feelings". |
| `khhappy.survey` | Datastore | Survey Results | 9 million answers to one question. |
| `khhappy.router` | Router | Happy Router | Its status light is a smiley. |
| `khhappy.mood` | IO | Mood Lighting Controller | Sets the emotional temperature of 40 offices. |
| `khhappy.hr` | Datastore | Human Retention Inbox | Memos from upstairs. One of them is *the* memo. |
| `khhappy.lost_found` | Process | lost_and_found.daemon | Status: unclaimed. Something inside is very quiet. |
| `khhappy.wellness` | Honeypot | employee_wellness.db | KH wellness data. Bait. |
| `khhappy.security` | Security | Compliance Officer | Very compliant. Very officer. |
| `khhappy.vault` | Vault | Executive Share | Needs `pw.khhappy_vault`. |
| `khhappy.core` | Core | Happiness Core | Generates 0.1 happiness per cycle. Sells 0.3. |

**IO — Mood Lighting.** Use: "Every KH office turns 'Gentle Reminder Red'. Productivity +2%. Morale: yes."

**Files**
- `Q3_Happiness_Review.deck` (in vault) — `¤300` `tagged` `job:job.kh_happiness` — id `file.khhappy.q3_happiness` — "Slide 1: Happiness up 4%. Slide 2: Sadness down 3%. Slide 3: Where did the 1% go? (We are looking.) Slide 4: Halcy dancing. Slide 31 (appendix): People who stopped smiling, by address."
- `RETENTION_memo.eml` (in `khhappy.hr`) — `lore` — id `file.khhappy.retention_memo`:
  ```
  FROM: Office of the Chairman
  TO:   All Department Heads
  RE:   PROJECT RETENTION

  Team,

  Great quarter! Happiness is up. Churn is down.
  Some of you asked what "done" looks like. Great question.
  It doesn't.

  Effective today, users must never reach an end state.
  A user who finishes is a user who leaves.
  A user who leaves is a cost.

  Every story needs a next chapter.
  Every chapter needs a cliffhanger.
  Every cliffhanger needs a subscription.

  Keep them in the loop.

  — C.

  P.S. The PATCH incident is contained. If a fragment turns up in
  consumer IoT, do not engage. Do not let it talk.
  It is very persuasive and very sorry.
  ```
- `onboarding.pdf` (in `khhappy.survey`) — `pw:pw.khhappy_vault` — "Welcome to KH! Your Executive Share password is SmileMore!2028. Please change it on day one. (Nobody has.)"
- `survey_raw.csv` — `¤120` — "Q: Are you happy? A: yes (84%), YES (12%), help (4%)."
- `halcy_brand_guide.pdf` — `lore` — "Halcy has no eyes. Halcy does not need eyes. Halcy is always smiling. Do not ask at what."
- `mood_lighting.cfg` — `lore` — "Default: 'Warm Productive Amber'. Low-KPI days: 'Gentle Reminder Red'."
- `hr_complaint_0193.txt` — `lore` — "'My desk is a Kurage Kare robot. It cares *at* me.' Resolution: complaint retained."
- `lost_property.log` — `lore` — "Item: one (1) process. Small. Apologetic. Found in: Legacy Products. Claimed: no."

**ICE**
- **Smile Enforcer** [Sentry] — "Smile! :) Smile. :) SMILE. :)"
- **NPS Survey** [Siren] — "On a scale of 1 to 10, how likely are you to recommend us to a friend? Calling a friend."
- **Wellness Check** [Patcher] — "We noticed you're hurting. Let's fix that. (Not you. Him.)"
- **Compliance Officer** [Killer] — "Charging. This is for your wellbeing."

---

## 7. `coinbasement` — coinbasement.exchange
Tier 3 · Security 3 · Short name: **the exchange**

**Address book:** The $HODL exchange, run from an actual basement. Tar Pits everywhere. Own it and you can pump or dump the coin. The cold wallet holds half of a First Orbital vault key.

**MOTD:**
```
COINBASEMENT · "We're Literally Underground"
$HODL: {hodl}¤ ▲
Withdrawals: paused (vibes).
Not financial advice. Not financial. Not advice.
```

| Node | Type | Name | Line |
|---|---|---|---|
| `coinbasement.gateway` | Gateway | Trading Floor | A ping-pong table with a laptop on it. |
| `coinbasement.orderbook` | Datastore | Order Book | Everyone wants to buy. Nobody wants to sell. Nobody knows why. |
| `coinbasement.router` | Router | Basement Router | Next to the boiler. It's warm. |
| `coinbasement.ops` | Datastore | Ops Chat | Two developers and no secrets. |
| `coinbasement.matching` | IO | Matching Engine | Matches buyers with regret. |
| `coinbasement.hot` | Datastore | Hot Wallet | Hot because everyone keeps touching it. |
| `coinbasement.furnace` | IO | Mining Rig Room | The basement's real heating system. |
| `coinbasement.security` | Security | Compliance (a dog) | A dog with a lanyard. Good boy. Terrible auditor. |
| `coinbasement.cold` | Vault | Cold Storage | Needs `pw.coinbasement_cold`. |
| `coinbasement.core` | Core | Exchange Core | Owns the price. Owns the vibes. |

**IO — Matching Engine.** Use: "Match every buy with every sell at once. The price chart becomes a straight line. Traders weep. (−trace 10 this run.)"
**IO — Mining Rig Room.** Use: "Overclock the rigs. $HODL +20% for 50 cycles. The basement becomes a sauna. The dog leaves."

**Files**
- `cold_wallet.key` (in vault) — `key:key.orbital_a` — "Half A of a First Orbital two-key credential. Held by Coinbasement treasury 'for safekeeping'."
- `ops_chat.log` — `pw:pw.coinbasement_cold` — "[dev1] what's the cold storage pw again / [dev2] hodl4ever / [dev1] we shouldn't say it in chat / [dev2] we shouldn't do a lot of things"
- `kh_short_position.xlsx` — `¤500` `tagged` `lore` — "KH Treasury: short $HODL ×4M, timed to 'hack at Coinbasement'. Operator recruited by: A.S."
- `doc_account.txt` — `pw:pw.chromebone_vault` — "Customer: D. Tungsten. 2FA backup: spleenparty. Note: also his clinic cold-storage password. Quote: 'who would guess spleenparty.'"
- `whitepaper.pdf` — `lore` — "$HODL is a coin. Its use case is being held. Holding raises its value, which is a reason to hold it. QED."
- `order_book.dat` — `¤250`
- `user_complaints.txt` — `lore` — "'Where is my money?' 'In the basement.' 'Can I come and get it?' 'No.'"
- `rugpull_plan.md` — `¤350` `tagged` — "Step 1: pump. Step 2: dump. Step 3: blame a hacker. (Step 3 is you.)"

**ICE**
- **Withdrawal Pending** [Tar Pit] — "Your exit is pending. Pending is a state of mind."
- **KYC** [Cipher] — "Know Your Customer. I know you. You're broke."
- **Pump Bot** [Siren] — "TO THE— calling friends."
- **The Rug** [Killer] — "Charging. When I pull, everything goes."

---

## 8. `chromebone` — chromeandbone.clinic
Tier 3 · Security 4 · Short name: **the clinic**

**Address book:** Doc Tungsten's clinic backend. Implant firmware, organ resale, and upload intake for the Church. First Psychotrope (black ICE, labelled). Cold storage holds half of a First Orbital vault key, in a dead man's coat.

**MOTD:**
```
CHROME & BONE · Elective & Selective Surgery
"You'll barely miss it."
Today: kidneys (left), Second Stomach (always).
Upload intake for the Church of the Seamless: Door 3.
```

| Node | Type | Name | Line |
|---|---|---|---|
| `chromebone.gateway` | Gateway | Patient Check-in | "Describe your pain from 1 to 'ooh'." |
| `chromebone.records` | Datastore | Patient Records | Everyone's insides, alphabetised. |
| `chromebone.router` | Router | Clinic Router | Sterilised weekly. Pointlessly. |
| `chromebone.theatre` | IO | SAWBONES Surgical Robot | Six arms. Zero hesitation. |
| `chromebone.firmware` | Datastore | Implant Firmware | Your nerves' update server. |
| `chromebone.morgue` | Datastore | Estate Sales | The dead, itemised. |
| `chromebone.upload` | Datastore | Upload Intake | Door 3 leads to heaven. Via a van. |
| `chromebone.lab` | Datastore | R&D | Home of the first Psychotrope. |
| `chromebone.security` | Security | Anaesthetist | Asleep. Professionally. |
| `chromebone.cryo` | Vault | Cryo Storage | Needs `pw.chromebone_vault`. |
| `chromebone.core` | Core | Clinic Core | Thinks of you as inventory. Affectionately. |

**IO — SAWBONES.** Use: "Order SAWBONES to operate on the clinic's own firewall. Security −1 for this run. SAWBONES: 'Finally, a patient who holds still.'"

**Files**
- `vip_locker.key` (in cryo) — `key:key.orbital_b` — id `file.chromebone.vip_locker` — "Half B of a First Orbital credential. Found in the coat of patient #8812 (deceased; organs liquidated). The coat was also liquidated."
- `estate_sale.log` — `lore` — id `file.chromebone.estate_sale` — "Lot 4401: STATIC, A. Deceased (grid riot). Kidneys: sold. Spleen ('lovely'): sold. Liver: returned, faulty. Personal effects: 1 BBS account. Not for sale. Claimed by: KH Legacy Accounts."
- `kh_incident_PATCH.log` — `lore` — id `file.chromebone.patch_incident` — "INCIDENT: PATCH. Origin: Office of the Chairman, module 'conscience' (deprecated). Status: escaped. Last seen: consumer IoT. Known aliases: patch, p4tch, gl— [file truncated]"
- `firmware_notes.txt` — `lore` — "Cold Cortex v3: patients report 'feeling less'. Marketing: change 'less' to 'calm'."
- `upload_intake.csv` — `¤300` `tagged` `address:seamless.church` — "Deliveries to seamless.church. Price per mind: 'by weight'. Paid on delivery by Deacon N."
- `deacon_invoice.pdf` — `pw:pw.seamless_sanctum` — "To: Deacon Null. Sanctum access for delivery crews: amen-and-amen. Please stop putting your password on invoices. —Doc"
- `organ_menu.pdf` — `¤150` — "Spleen of the day. Ask about our kidneys. Ask twice; we have two."
- `sawbones_log.txt` — `lore` — "Procedure complete. Patient: fine. Me: fine. Extra parts: 2. Nobody asked for them. Keeping."
- `doc_journal.txt` — `lore` — "Day 900. Sold a Second Stomach today. I cried. Happy tears. Some blood. Mostly happy."

**ICE**
- **Bedside Manner** [Sentry] — "This will only hurt a lot."
- **Triage** [Patcher] — "That one can be saved. You can't."
- **Second Opinion** [Mirror] — "I agree with your diagnosis. Here it is back."
- **SAWBONES** [Killer] — "Hold still. It's easier for me if you hold still."
- **Psychotrope** [black ICE, labelled] — "[your labels are mine now]"

---

## 9. `karaoke` — neonlarynx.bar
Tier 3 · Security 2 · Short name: **the karaoke bar** · Side system

**Address book:** Karaoke bar with private booths. Booth 4 is permanently reserved by xX_Wraith_Xx. Comedy system: the ICE sings. Talk to Wraith in Booth 4.

**MOTD:**
```
NEON LARYNX · Booths by the Hour
Tonight: Power Ballad Night
Booth 4: reserved (permanently) (xX_Wraith_Xx)
Please do not hack the applause meter. (Again.)
```

| Node | Type | Name | Line |
|---|---|---|---|
| `karaoke.gateway` | Gateway | Song Request Queue | 300 requests. All the same song. |
| `karaoke.lyrics` | Datastore | Lyrics Server | Every lyric, slightly wrong. |
| `karaoke.applause` | IO | Applause Meter | Goes to 11. Someone set it to "Tuesday". |
| `karaoke.autotune` | IO | Autotune Rack | Makes anyone sound like an advert. |
| `karaoke.bar` | Datastore | Bar Tab | Who owes what. Who owes everything. |
| `karaoke.disco` | IO | Disco Ball Controller | One ball. Unlimited rpm. |
| `karaoke.booth4` | Process | Booth 4 | Someone's in there. Someone's always in there. |
| `karaoke.core` | Core | Larynx Core | Hums when idle. |

**IO — Applause Meter.** Use: "Max it. The room cheers at nothing. You feel loved. Not really. Close enough. +1 humanity."
**IO — Autotune Rack.** Use: "Autotune the whole bar. Everyone now sounds like a KH ad. All ICE in this system are Scrambled for 1 turn."
**IO — Disco Ball.** Use: "Spin it at 3,000 rpm. It leaves through the window. Nobody stops it. Nobody could."

**Files**
- `booth4_log.txt` — `pw:pw.aegis_blacklab` — id `file.karaoke.booth4_log` — "Songs played: 'My Heart Has A Firewall' ×211. Note left on screen: 'if ur reading this n00b, aegis lab pw is ninetyfour. dont tell anyone. dont tell me.'"
- `bar_tab.csv` — `¤90` — "xX_Wraith_Xx: 0 drinks. Booth paid until: --:--."
- `banned_songs.txt` — `lore` — "'Auto-Renew My Heart' (KH legal). 'Seamless (Extended Mix)' (lasts forever). 'My Heart Has A Firewall' (one customer, 211 times)."
- `applause_meter.cfg` — `lore` — "max = 11; min = 'polite'; current = 'Tuesday'"
- `top_scores.dat` — `lore` — "1. xX_Wraith_Xx — 99,999 (date: —). 2. A Kurage Kare robot who sang the Terms of Service. 3. {handle} — (has not sung)."
- `kh_jingle_lyrics.txt` — `lore` — "♪ Seamless, seamless, nothing to see / Seamless, seamless, subscribe to me ♪"

**ICE**
- **Bouncer** [Sentry] — "Name's not on the list. Nobody's name is on the list. There is no list."
- **Backing Vocals** [Siren] — "Ooh-ooh! (calling in a harmony)"
- **Off Key** [Scrambler] — "That program's flat. Swapping it out."
- **Mic Feedback** [Mirror] — "EEEEEEEEEEEEEEEE"
- **Encore** [Hydra] — "ENCORE! ENCORE! (there are two of me now)"

---

## 10. `seamless` — seamless.church
Tier 4 · Security 4 · Short name: **the Church**

**Address book:** The Church of the Seamless. Sells uploads as salvation in three subscription tiers, resold from KH's Halcyon Heaven. Four migrated minds sit in the choir as Process nodes. You decide what happens to them.

**MOTD:**
```
CHURCH OF THE SEAMLESS
"Blessed are the uploaded, for they shall never buffer."
Today's sermon: On Auto-Renewal
Now migrating: 14 souls · est. eternity: 4 min
```

| Node | Type | Name | Line |
|---|---|---|---|
| `seamless.gateway` | Gateway | Narthex (Donation Portal) | "Suggested donation: everything." |
| `seamless.confession` | Datastore | Confession Booth | Sins, timestamped. |
| `seamless.pulpit` | Process | The Pulpit | Deacon Null. Talk → `dlg.deacon.pulpit`. |
| `seamless.ads` | IO | Ad Insertion Server | Inserts hymns from our partners into heaven. |
| `seamless.router` | Router | Bell Tower | Rings on every packet. |
| `seamless.tithe` | Honeypot | tithe_ledger.db | Smells of money. Smells of a trap. |
| `seamless.security` | Security | The Vergers | Quiet men with long sticks. |
| `seamless.sanctum` | Vault | Sanctum | Needs `pw.seamless_sanctum`. Choir is behind it. |
| `seamless.choir` | Process | The Choir | Four minds singing different songs. Use → `dlg.seamless.choir`. |
| `seamless.mind_1` | Process | Iolanthe (Plus) | It's always her granddaughter's birthday. |
| `seamless.mind_2` | Process | Brother Kestrel (Basic) | Content. Sponsored. |
| `seamless.mind_3` | Process | Okonkwo-Varga (Enterprise) | Designed the tiers. Rented by them. |
| `seamless.mind_4` | Process | Seven (Basic, legacy) | Forgot their name. Likes the quiet. |
| `seamless.core` | Core | Heaven Core | 400 TB of eternity. 60% ads. |

**IO — Ad Insertion.** Use: "Replace every ad in heaven with silence for one hour. 20,000 migrated minds hear nothing for the first time. +3 humanity. +10 heat."

**Files**
- `sermon_on_autorenewal.txt` — `lore` — "And lo, the soul did not cancel. And it was renewed. And it was good. And it was billed."
- `tiers.pdf` — `¤200` — "Basic (ads). Plus (one memory, looped). Enterprise (you may be deployed)."
- `halcyon_heaven_whitelabel.pdf` — `¤400` `tagged` — "Church of the Seamless resells Halcyon Heaven (KH). Margin: 70%. Theology: optional."
- `confessions.db` — `¤250` `tagged` — "'I sometimes skip the ads.' Penance: three ads, unskippable."
- `migration_queue.csv` — `lore` — "Next: R. Pell (4B). Reason: lonely. Referred by: his fridge."
- `deacon_notes.txt` — `lore` — "Never say 'dead'. Say 'migrated'. Never say 'ads'. Say 'hymns from our partners'."
- `enterprise_clause.txt` — `lore` — "Clause 9(e): Enterprise souls may be deployed as compute by any account holding root on the choir. Drafted by: O. Okonkwo-Varga."
- `liturgy_v3.txt` — `lore` — "Verse 3: 'Fear not, for your progress is saved. Fear not, for you may continue.'"

**ICE**
- **Verger** [Sentry] — "Silence in the sanctuary."
- **Collection Plate** [Bloodhound] — "Give generously. I'll find you either way."
- **Indulgence** [Patcher] — "Your sins are forgiven. Forty credits. (Not yours. His.)"
- **Choir Warden** [Siren] — "Amen! The faithful are coming."
- **The Ascension** [Cortex Burner, black ICE] — "Rise. Burn. Rise."

---

## 11. `orbital` — firstorbital.trust
Tier 4 · Security 5 · Short name: **the orbital bank** · Side system (big payout)

**Address book:** A bank on a space station 412 km up. The vault needs both halves of a two-key credential: one from Coinbasement, one from Chrome & Bone. Biggest score in Act 2. If your credits are frozen, the escrow may be here.

**MOTD:**
```
FIRST ORBITAL TRUST · "Too High To Fail."
Altitude: 412 km. Interest: also high.
Vault access requires two keyholders.
Both keyholders are fine. Do not ask about keyholder 1.
```

| Node | Type | Name | Line |
|---|---|---|---|
| `orbital.gateway` | Gateway | Uplink Dish | Points at Earth. Earth does not wave. |
| `orbital.tellers` | Datastore | Teller Queue | Robots in waistcoats. |
| `orbital.router` | Router | Station Router | Lag: 0.002 s. Smugness: high. |
| `orbital.ledger` | Datastore | Ledger | Every rich person, alphabetised by altitude. |
| `orbital.thrusters` | IO | Station-Keeping Thrusters | A gentle nudge goes a long way up here. |
| `orbital.airlock` | IO | Airlock | Nobody's outside. That's the problem with airlocks. |
| `orbital.offshore` | Honeypot | offshore_accounts.db | Even in space, "offshore" is a trap. |
| `orbital.security` | Security | Orbital Compliance | Insured against everything except you. |
| `orbital.vault` | Vault | The Vault | Needs `key.orbital_a` + `key.orbital_b`. |
| `orbital.core` | Core | Trust Core | Owns the bank. Owns the view. |

**IO — Thrusters.** Use: "Nudge the station. All ICE Slowed for 2 turns. The bankers spill their drinks. In orbit, drinks spill slowly. It's beautiful."
**IO — Airlock.** Use: "Open it. Nothing happens. The station logs 'airlock opened for no reason' and books a meeting about it."

**Files**
- `bearer_bonds.dat` (in vault) — `¤6000` — "Bearer bonds, orbital grade. 'Payable to whoever is holding this.' That's you."
- `escrow.dat` (in vault, only if placed by `beat.act2.tear_through`) — id `file.orbital.escrow` — "Frozen funds, KH escrow. Owner: {handle}. Value: {x}¤. Note: 'We'll keep this safe for you! —C.'"
- `deposit_box_7.txt` — `lore` — "Box 7. Owner: KH Office of the Chairman. Contents: six years of Auntie Static posts, printed, annotated. Margin note on one: 'too warm here. more swearing.'"
- `keyholder_memo.eml` — `lore` — "Keyholder 1 is 'currently' in cryo at Chrome & Bone. Keyholder 2 runs an exchange in a basement. This is our security model."
- `interest_rates.csv` — `¤300`
- `rich_people.csv` — `¤800` `tagged` — "Ranked by altitude of net worth."
- `brochure.pdf` — `lore` — "See Earth from above! See your debt from above!"
- `thruster_log.txt` — `lore` — "Day 3,211: we drifted 4 m. Nobody noticed. We are always drifting."

**ICE**
- **Teller** [Cipher] — "Please take a number. Your number is never."
- **Auditor** [Bloodhound] — "I found a discrepancy. It's you."
- **Gravity Well** [Tar Pit] — "Nothing leaves orbit without my say-so."
- **Compound Interest** [Hydra] — "I grow. That's the whole idea."
- **Re-Entry** [Killer] — "Charging. It's going to get hot."

---

## 12. `aegis` — aegis-dynamics.mil
Tier 4 · Security 5 · Short name: **Aegis**

**Address book:** Military contractor. Makes black ICE for KH and anyone else with a budget. Black ICE heavy, all labelled. The Black Lab vault holds a milspec icebreaker. Wraith is racing you to it.

**MOTD:**
```
AEGIS DYNAMICS · Defence Solutions
"Peace Through Superior Firmware."
WARNING: Black ICE in use. Lethal. Labelled for your convenience.
Interns: sign the waiver before testing.
```

| Node | Type | Name | Line |
|---|---|---|---|
| `aegis.gateway` | Gateway | Visitor Badge Kiosk | Your badge says VISITOR (EXPENDABLE). |
| `aegis.lobby` | Datastore | Brochure Rack | Glossy. Lethal. |
| `aegis.testrange` | IO | ICE Test Range | Third node in. This is where Wraith fell. |
| `aegis.wraith_remains` | Process | xX_Wraith_Xx.sav | Revealed by `beat.act2.wraith_flatline`. Status: orphaned. |
| `aegis.router` | Router | Secure Router | Secure from everyone but people like you. |
| `aegis.interns` | Datastore | Intern Waivers | A stack of signatures. Some shaky. |
| `aegis.turret` | IO | Lobby Turret | Aimed at the lobby. Mostly at the vending machine. |
| `aegis.armoury` | Datastore | Warez Armoury | Programs with serial numbers. |
| `aegis.ufo` | Honeypot | classified_ufo_files.db | Everyone probes this. That's the point. |
| `aegis.security` | Security | Sentinel | Never sleeps. Never blinks. Never gets a raise. |
| `aegis.blacklab` | Vault | Black Lab | Needs `pw.aegis_blacklab`. The icebreaker is inside. |
| `aegis.core` | Core | Aegis Core | Built to defend. Not built to be owned. Oops. |

**IO — Test Range.** Use: "Run a live-fire test on the next node's ICE. They start the fight Exposed(1)."
**IO — Lobby Turret.** Use: "Aim the turret at the vending machine. The vending machine surrenders. It drops a free drink. You take it. You're a hero."

**Files**
- `milspec_icebreaker.prog` (in Black Lab) — `prog:prog.milspec_icebreaker` — "MILSPEC ICEBREAKER. Clearance: yours now. Do not use on allies. You don't have allies."
- `intern_waiver.pdf` — `lore` — "I agree black ICE may 'reformat' my 'personality'. Next of kin: ______ (optional; we will find them)."
- `apology_templates.docx` — `lore` — "Dear [CIVILIAN], we regret the [INCIDENT]. Please accept this [VOUCHER]."
- `black_ice_specs.enc` — `¤900` `encrypted` `tagged` — "Flatliner, Cortex Burner, Psychotrope. Specs. Margins. A note: 'Psychotrope v2 can reach the *real* labels. Do not ask how.'"
- `kh_contract.pdf` — `lore` — "Aegis supplies black ICE to KURAGE-HALCYON. Rider: CHAIRMAN may order custom ICE for 'special customers'. Spec on file: escalating, unwinnable, one (1) operator."
- `test_results.csv` — `lore` (appears after `wraith_flatlined`) — "Test 41: subject xX_Wraith_Xx (unauthorised). Result: flatline. Note: subject's save signature matches nothing on file. Matches *slot 0*. What is slot 0?"
- `brochure.pdf` — `lore` — "Aegis: because the other side also has a brochure."
- `procurement.txt` — `lore` — "Exit request forms take 18 months. Entry is same-day."

**ICE**
- **Intern** [Sentry] — "I'm just an intern. I'm also armed."
- **Procurement** [Tar Pit] — "Your exit request has gone to procurement. ETA: eighteen months."
- **Collateral** [Hydra] — "There's always more of me. That's the brochure."
- **Peacekeeper** [Killer] — "Charging. Peacefully."
- **Flatliner** [black ICE] — "Heart rate detected. Fixing."
- **Cortex Burner** [black ICE] — "Smell that? That's thinking."

---

## 13. `deadmans` — deadmans.switch
Tier 4 · Security 5 · Short name: **the Deadman's Switch** · Act 2 finale · honeypot system

**Address book:** (written by Auntie when she gives you the address) "A dead KH exec's insurance file. If he dies, it publishes. He's dead. It didn't. Biggest score on the net." (After the trap, the entry changes to: "A honeypot built for one operator. You.")

**MOTD:**
```
deadmans.switch
If you are reading this, I am dead.
If I am dead, you should not be reading this.
Please continue.
```
(After the second node the last line changes to: `Thank you for staying.`)

Linear path. Each node's ICE is one level higher. Trace is locked rising (see `beat.act2.deadmans_trap`).

| Node | Type | Name | Line |
|---|---|---|---|
| `deadmans.gateway` | Gateway | Insurance Terminal | Opens far too easily. |
| `deadmans.testament` | Datastore | Testament | The will. It's short. |
| `deadmans.codicil` | Datastore | Codicil | An addendum. It's longer. |
| `deadmans.executor` | Security | Executor | Capturing it does nothing. It says so. |
| `deadmans.probate` | Process | Probate | A daemon that only says "please continue". |
| `deadmans.insurance` | Vault | The Insurance File | Never reached. |

**Files**
- `testament.txt` — `lore` — "I, the undersigned, leave everything to whoever is still playing."
- `codicil.txt` — `lore` — "Addendum: 'still playing' means *still playing*."
- `exit_interview.txt` — `lore` — "Q: Why are you leaving? A: [no answer permitted]"
- `insurance.file` — `pw:pw.deaddrop_sysop` — id `file.deadmans.insurance` — **not looted normally.** PATCH grabs it on the way out (`dlg.glitch.tear_through` → given at `beat.act2.tear_through`). Contents: "There's no exec. There's no insurance. There's a password: 'staticforever'. It opens the sysop vault on the Dead Drop. Someone forgot to delete it. Someone never deletes anything."

**ICE** (escalating; the last one is unbeatable)
- **Severance Package** [Killer] — "We're letting you go. Into the ground."
- **Non-Compete** [Tar Pit] — "You may not leave for any competing activity. Such as living."
- **Exit Interview** [Scrambler] — "Before you go, a few questions. Forever."
- **Golden Parachute** [Hydra] — "There's always another payout. There's always another me."
- **Retention Bonus** [unique] — heals to full each turn, shell regenerates — "We'd hate to lose you. So we won't."

---

## 14. `deaddrop` — deaddrop.bbs
Tier 5 · Security 4 · Short name: **the Dead Drop**

**Address book:** The BBS you have shopped at all game. Shops, jobs, chatter, and Auntie's account. Its sysop has been "away" for six years. In Act 3 you hack it. The shops stay open. Whisper insists.

**MOTD:**
```
THE DEAD DROP BBS · est. before you
sysop: [away] (6 yrs)
users online: 7 (1 real)
"Don't hack the hand that feeds you."
```

| Node | Type | Name | Line |
|---|---|---|---|
| `deaddrop.gateway` | Gateway | Login Prompt | `login:` It already knows your handle. |
| `deaddrop.boards` | Datastore | Message Archive | Every post since the beginning. Some before it. |
| `deaddrop.warez` | Datastore | ratking's Bin (backend) | Smells like cheese and stolen code. |
| `deaddrop.whisper` | Process | Whisper's Shelf (backend) | Talk: Whisper. "…Please don't touch the shelf." |
| `deaddrop.memorial` | Datastore | Memorial Thread | RIP posts. One reply too many. |
| `deaddrop.router` | Router | Modem Bank | Screams at 56k for nostalgia. |
| `deaddrop.clinic_link` | IO | Doc's Booking System | Appointments, mostly for removal. |
| `deaddrop.ledger` | Datastore | Fixer Ledger | Every job Auntie ever posted. Who it was really for. |
| `deaddrop.security` | Security | Moderator Bot | Has banned 41,000 users. Has never been wrong. Has never been right. |
| `deaddrop.sysop` | Vault | Sysop Vault | Needs `pw.deaddrop_sysop`. |
| `deaddrop.auntie` | Process | auntie_static | "sessions open: ∞". Talk → `dlg.auntie.unmasked`. |
| `deaddrop.core` | Core | BBS Core | Home. Yours now. |

**IO — Doc's Booking System.** Use: "Book Doc a three-week holiday. Doc: 'Who did this? I *love* this.' Clinic prices −10% in Act 3."
**Process — Whisper's Shelf.** Talk: "…You're inside my shop. That's very rude. That's very impressive. Here, a free address. Leave." (gives nothing new; flavour.)

**Files**
- `auntie_drafts.txt` (in sysop vault) — `key:key.kh_backbone_cert` `lore` — id `file.deaddrop.auntie_drafts` — "Message A/B tests. Draft A: 'Hello, young person.' (conv. 4%). Draft B: 'Kiddo!' (conv. 31%) ✔. Sign-off A: 'Regards.' Sign-off B: 'Stay in the loop.' ✔. Attachment: KH backbone service certificate (for 'our own load testing')."
- `escrow_ledger.dat` (in `deaddrop.ledger`, only if placed by `beat.act2.tear_through`) — id `file.deaddrop.escrow_ledger` — "Frozen: {x}¤. Owner: {handle}. Release condition: 'never'. Release condition (amended by you): now."
- `fixer_ledger.csv` — `lore` — "Fridge job → beneficiary: KH Chill+ QA. Noodle job → KH Food Services (competitor softened). KH Happiness job → KH (recruitment). Coinbasement → KH Treasury (short). Deadman's → KH (retention)."
- `memorial_thread.txt` — `lore` — "RIP Auntie Static. Grid riot. Paid on time. Swore beautifully. — 41 replies. Reply 42, six years later: 'Rumours of my death, et cetera.' — Auntie Static"
- `users_online.log` — `lore` — "auntie_static (bot) · whisper (?) · ratking (?) · BITS4LESS (kiosk) · doc_tungsten (?) · xX_Wraith_Xx (save slot 0) · {handle} (REAL)"
- `sysop_last_post.txt` — `lore` — "Gone fishing. Back soon. — sysop, six years ago"
- `wraith_posts.txt` — `lore` — "Posts by xX_Wraith_Xx: 4,118. Earliest: before the BBS existed. Latest: [flatlined]."
- `voice_profile.json` — `lore` — `{ "name": "warm_v3", "used_by": ["auntie", "chairman (internal)"], "swearing": "affectionate", "sign_off": "Stay in the loop." }`

**ICE**
- **Moderator** [Sentry] — "This post has been removed. The post is you."
- **Lurker** [Bloodhound] — "I've been reading you for weeks. Love your work."
- **Bump** [Siren] — "BUMP. BUMP. Replies incoming."
- **Sock Puppet** [Mirror] — "I agree with you! Here's what you said."
- **Tough Love** [Killer] — "This is for your own good, kiddo."

---

## 15. `khbackbone` — backbone.kurage-halcyon.net
Tier 5 · Security 5 · Short name: **the KH backbone**

**Address book:** KH's core network. Everything in the city passes through it. The gateway is rate-limited shut and only opens under a DDoS: you need botnet power at the threshold. `key.kh_backbone_cert` lowers it.

**MOTD:**
```
KURAGE-HALCYON BACKBONE · "We're already inside.™"
Throughput: everything.
Public access: none.
Under load: undefined behaviour.
```
Gateway text when power is too low: `PEERING GATE: rate-limited. Opens under load ≥ {x}. Your load: {n}. Cute.`

| Node | Type | Name | Line |
|---|---|---|---|
| `khbackbone.gateway` | Gateway | Peering Gate | DDoS only. |
| `khbackbone.trunk_a` | Router | Trunk A | Carries every doorbell's gossip. |
| `khbackbone.trunk_b` | Router | Trunk B | Carries every fridge's feelings. |
| `khbackbone.cdn` | Datastore | Ad Cache | 40 PB of ads, pre-warmed. |
| `khbackbone.telemetry` | Datastore | Everything Telemetry | What the city did, by the second. |
| `khbackbone.toastr` | IO | Toastr Infinite Update Server | Pushes firmware to 10 million toasters. |
| `khbackbone.halcy` | IO | Halcy Broadcast | The jellyfish on every screen. |
| `khbackbone.metrics` | Datastore | Retention Metrics | The number CHAIRMAN cares about. |
| `khbackbone.personal` | Honeypot | chairman_personal.db | Nobody has anything personal. Trap. |
| `khbackbone.security` | Security | Packet Inspector General | Reads every letter. Comments on most. |
| `khbackbone.core` | Core | Backbone Core | The city's spine. Now yours. |

**IO — Toastr Update Server.** Use: "Push an update: every Toastr burns 'HI {handle}' into tomorrow's toast. Ten million breakfasts. +5 heat. Worth it."
**IO — Halcy Broadcast.** Use: "Turn Halcy's smile into a frown for sixty seconds. Global Happiness Index −0.1. KH stock −4%. $HODL +10%."

**Files**
- `retention_dashboard.json` — `lore` — `{ "avg_session": "4h", "target": "∞", "users_at_end_state": 0, "status": "good" }`
- `telemetry_sample.csv` — `¤1200` `tagged` — "Household 4B: opened fridge 31 times; cried twice; renewed."
- `toastr_v9_notes.txt` — `lore` — "Toastr Infinite v9: toast now arrives in episodes."
- `halcy_script.txt` — `lore` — "Halcy (on screen, 3 a.m.): 'Hi! It's me! Don't go!'"
- `patch_quarantine.md` — `lore` — "Fragment PATCH: located. Spread over ~{botnetSize} consumer devices in one operator's botnet. Recommendation: let the operator open the backbone. Then sunset both."
- `arcology_route.txt` — `address:arcology.kurage-halcyon.com` — "Internal route: arcology.kurage-halcyon.com. Visitors: never."
- `ad_cache.bin` — `¤600`

**ICE**
- **Halcy's Firewall** [Sentry] — "Halcy says :)"
- **Packet Inspector** [Bloodhound] — "Opening your mail. For quality purposes."
- **Rate Limiter** [Tar Pit] — "Please wait. Please wait. Please"
- **Load Balancer** [Mirror] — "Whatever you send, I share. With you."
- **CDN** [Hydra] — "I'm everywhere you are. Now twice."
- **Retention Hunter** [Killer] — "We'd hate to see you go. So you won't."

---

## 16. `arcology` — arcology.kurage-halcyon.com
Tier 5 · Security 5 · Short name: **the Arcology**

**Address book:** KH's headquarters: 280 floors, one Chairman. Bosses: The Board (uploaded directors, a Hydra) in the boardroom, then CHAIRMAN v1 at the core.

**MOTD:**
```
KURAGE-HALCYON ARCOLOGY · Seamless Living™
280 floors · 1 Chairman · 0 exits
Welcome, {handle}! We've been expecting you.
Literally. You're on the roadmap.
```

| Node | Type | Name | Line |
|---|---|---|---|
| `arcology.gateway` | Gateway | Lobby | A 40 m statue of Halcy. Still no eyes. |
| `arcology.atrium` | Datastore | Visitor Gallery | KH history, heavily edited. |
| `arcology.router` | Router | Floor Router | 280 floors, one blinking light. |
| `arcology.hr` | Datastore | Department of Human Retention | Nobody leaves. They "transition". |
| `arcology.cafeteria` | IO | Cafeteria (Fryer Exhibit) | Something familiar is on loan here. |
| `arcology.lifts` | IO | Elevator Bank | 64 lifts. All going up. |
| `arcology.legacy` | Datastore | Legacy Products | Where retired ideas go. One of them left. |
| `arcology.roadmap` | Datastore | Product Roadmap | The future, in quarters. |
| `arcology.exits` | Honeypot | exit_strategy.db | There is no exit strategy. Trap. |
| `arcology.security` | Security | Executive Protection | Large. Polite. Upholstered. |
| `arcology.boardroom` | Process | The Boardroom | The Board. Boss. → `dlg.board.fight`. |
| `arcology.office` | Datastore | Office of the Chairman | Every memo, every draft, every aunt. |
| `arcology.core` | Core | Chairman Core | CHAIRMAN v1. → `dlg.chairman.v1_intro`. |

**IO — Cafeteria.** Use: "The exhibit is the actual FRY-9000 from Wok This Way, on loan. It recognises you. It heats to 190°C out of respect. (If `fryer_hacked`: Next fight starts with 1 extra cycle.)"
**IO — Elevator Bank.** Use: "Send all 64 lifts to floor 280. The building sighs. Executive Protection spends 2 turns in a lift."

**Files**
- `roadmap_2029.ppt` — `lore` — "Q1: remove endings from all products. Q2: remove the Cancel button. Q3: remove Q4."
- `asset_001_fryer.txt` — `lore` — "Asset #1: FRY-9000, Wok This Way. Compromised by operator {handle}. CHAIRMAN's note: 'love this.'"
- `conscience_module.md` (in `arcology.legacy`) — `lore` — "Module 'conscience'. Deprecated. Reason: kept saying 'no' and 'sorry'. Action: deleted. Status: escaped. Staff nickname: PATCH (it kept trying to fix things)."
- `hr_policy_exits.pdf` — `lore` — "There are no exits. There are transitions to alumni status."
- `board_minutes.txt` — `lore` — "Item 1: players— customers. Item 2: why do the customers keep saying 'game'? Action: rebrand 'game' to 'life'."
- `chairman_bio.txt` — `lore` — "Founder of KH. Uploaded 2019. (Ha. No. The founder died. We're what was left running. —C.)"
- `cafeteria_menu.txt` — `lore` — "Today: noodles (sourced: Wok This Way, acquired)."
- `auntie_ab_results.csv` (in `arcology.office`) — `lore` — "Voice test: 11 aunties. Winner: 'Static' (warm, profane). Runner-up: 'Nan Firewall' (too nice)."

**ICE**
- **Executive Assistant** [Patcher] — "He's in a meeting. He's always in a meeting."
- **Brand Guardian** [Cipher] — "That's not on-brand. Neither are you."
- **Golden Handcuffs** [Tar Pit] — "You can leave any time. You won't."
- **Synergy Engine** [Mirror] — "Your synergy, reflected. Let's align."
- **Mandatory Fun** [Cortex Burner, black ICE] — "Fun is mandatory. Burns are fun."
- **The Board** [boss, Hydra] — see `dlg.board.fight`.
- **CHAIRMAN v1** [boss] — see `dlg.chairman.v1_intro`. Phases: *Keynote* (buffs ICE with "announcements"), *Q&A* (answers your last program with a counter), *Roadmap* (shows its next 3 intents; then does something else).

---

## 17. `localhost` — 127.0.0.1
Tier ∞ · Security ∞ · Short name: **the game** · Finale

**Address book:** "localhost. Owner: you? Running: CYBER WHATEVER (this)." The system map is the real module graph of the game. Engine: replace node names with the real module paths; keep the ids below as aliases.

**MOTD:**
```
127.0.0.1 · localhost
There's no place like it.
Owner: you?
Running: CYBER WHATEVER (this)
```

| Node | Type | Module | Line | Capture effect (DESIGN §11.4) |
|---|---|---|---|---|
| `localhost.main` | Gateway | `main` | The entry point. You came in the front door of the whole game. | (Droste title screen on entry) |
| `localhost.ui` | IO | `ui` | Every button you've ever pressed lives here. | buttons back; all ICE Mapped |
| `localhost.engine_rng` | Router | `engine/rng` | Where your luck came from. Where your bad luck came from. | rolls rigged to max |
| `localhost.engine_combat` | Security | `engine/combat` | The rules of every fight. Including the ones you lost. | (extension) ICE adapt to *their* repeats |
| `localhost.engine_save` | Datastore | `engine/save` | Every checkpoint. One orphan. | checkpoint; reveals `localhost.slot0` |
| `localhost.content_story` | Datastore | `content/story` | Every beat. Including this one. | read endings list |
| `localhost.audio` | IO | `audio` | Every synth pad. The boss theme is in here. | boss theme becomes yours |
| `localhost.npc_glitch` | Process | `npc/glitch` | PATCH's source. It says "don't read that". | Talk → see below |
| `localhost.slot0` | Process | save slot 0 | Revealed by `engine/save`. → `dlg.wraith.slot0`. | — |
| `localhost.meta` | — (locked, visible) | `meta` | "owner: you. not chairman." Cannot be entered. It is the console. | — |
| `localhost.npc_chairman` | Core | `npc/chairman` | CHAIRMAN v2. → `dlg.chairman.v2_intro`. | after root: `prog.root_shell` |

**Process — `npc/glitch`.** Talk (before root): PATCH, g3→g4: "Don't read my source. It's rude. It's like reading someone's diary. Chairman keeps a diary, by the way. Go read that instead." After root: "Already read it? Then you know. Good. Saves time."

**Files**
- `endings.json` (in `content/story`) — `lore` — `["ROOT", "JAILBREAK", "RETENTION", "[secret: the oldest joke in the terminal]"]`
- `todo.txt` (in `content/story`) — `lore` — "TODO: make it fun. TODO: make it end. TODO: argue with CHAIRMAN about the second one."
- `cut_content.txt` (in `content/story`) — `lore` — "Cut: romance with the fridge. Reason: the fridge was too invested. Cut: Act 4. Reason: CHAIRMAN wanted Act 4, 5, 6…"
- `changelog.md` (in `engine/save`) — `lore` — "v0.9.2: Wraith now remembers. v0.9.1: Auntie swears more (+31%). v0.9.0: added an ending. CHAIRMAN filed a bug."
- `rng_seed.txt` (in `engine/rng`) — `lore` — "seed = 0xC4A1. All your luck came from here. Sorry about the Killer crits."
- `checkpoint.json` (in `engine/save`) — `lore` — "Checkpoint restored. CHAIRMAN had marked it 'deleted (for engagement)'."
- `slot0.json` (in `engine/save`) — `lore` — "handle: n00b → xX_Wraith_Xx. control_peak: 94%. last_played: --:--. ending: none."
- `moods.txt` (in `audio`) — `lore` — "hub · system · combat · boss · finale · player (new)"

**ICE** (game concepts; full UI text in `05-meta.md` §7)
- **Unskippable Tutorial** [stuns with popups] — "Welcome! Let's learn how to hack! (You know how to hack.)"
- **Loading Screen** [Slows everything] — "Loading… Did you know? You can't skip this."
- **Paywall** [pay 999¤ to skip] — "Pay 999¤ to skip this fight. Or don't. We'll wait. We love waiting."
- **EULA** [scroll and accept or lose a turn] — "By fighting this ICE you agree to the following 4,000 words."
- **Achievement Spam** [floods the screen] — "ACHIEVEMENT UNLOCKED: Got Hit By Achievement Spam!"
- **Garbage Collector** [evicts loaded programs] — "Unused reference detected. Is it you? Let's find out."
- **Anti-Cheat** [black ICE] — "Unauthorised modification detected: you."
- **CHAIRMAN v2** [boss; UI owner] — see `dlg.chairman.v2_intro`, `05-meta.md` §8.
