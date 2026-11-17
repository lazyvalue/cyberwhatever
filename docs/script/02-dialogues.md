# CYBER WHATEVER — Dialogues

Every interactive dialogue. Format:

```
### dlg.<npc>.<name>
opens: <where / what opens it>

**n0** · <speaker>
> text
- "choice text" → n1
- [condition] "choice text" → n2 · effects
```

- Conditions in `[ ]`: `hum ≥ 40`, `hum.unit`, `flag`, `!flag` (not set), `item`, `heat.burned`, `act 2`, `credits ≥ 500`.
- Effects after `·`: `set flag`, `give item`, `+N humanity`, `−N credits`, `reveal address`, `→ END`.
- A node with no choices shows a single **[continue]** button and goes to the next listed node.
- Bands and placeholders: `00-bible.md` §0.
- **Variant blocks** (`variants:`) choose one line by the first matching condition, top to bottom.

---

## 1. Hub vendors and greetings

### 1.1 `dlg.auntie.board_greet` — the fixer board
opens: player opens the fixer board (jobs, heat scrub, fence). Greeting line, then the board UI. "Ask" choices are optional small talk under the board.

**greeting** · auntie — variants:
- [`auntie_unmasked`] "Hi kiddo! Still here. Still us. The board's still open. We'd hate for you to have nothing to do."
- [`second_stomach` and first time seen] "Is that a Second Stomach? Kiddo. Why. …Can I see it?"
- [time away ≥ 8h] "There you are. Don't do that again. I worry. About you. About the pipeline. Mostly you."
- [`localTime` 00:00–05:00] "It's {localTime}. I'm up. I'm always up. Sleep's just churn with a pillow."
- [`hum.unit`] "Hi, unit. …Sorry. Hi, kiddo. Force of habit. Whose habit? Don't worry about it."
- [`hum.low`] "You sound thinner. Whatever Doc took, it wasn't the good part. Probably."
- [`heat.burned`] "Kiddo, you're on fire. Not the good kind. Scrub now. Don't lie low. Never lie low."
- [`heat.hunted`] "You're hot. People are asking about you. I said you're a sweetheart. Want a scrub?"
- [`heat.noticed`] "You're warm. Little scrub? Costs. Everything costs. That's the fun of it."
- [`act 3`] "Kiddo. Rough week. Still here? Good. Don't think. Just pick."
- [`act 2`] "Operator! The good stuff's at the top. The weird stuff's at the bottom. Weird pays better."
- [default] "Board's open, kiddo. Pick something that pays."

**ask** · player choices (all → back to board):
- "Do you ever sleep?" → auntie: "Sleep's just churn with a pillow. Next question."
- "Tell me about KH." → auntie: "Bloodsuckers. Vampires. Own everything. Their toasters are pretty good, though."
- "Where are you? Physically." → auntie: "Somewhere with great uptime and no windows. Living the dream."
- "Should I take a break?" → auntie: "Hell no. Breaks are where good kids drift off and never come back. Here. A job."
- [`rumour_auntie_dead` and `!auntie_unmasked`] "Wraith says you're dead." → auntie: "Wraith says a lot. Do I *sound* dead? Don't answer that. Here's fifty credits. For your trouble." · +50 credits
- [`memo_read` and `!auntie_unmasked`] "What's PROJECT RETENTION?" → auntie: "Corporate crap. 'Never reach an end state.' Imagine writing that down. Anyway, jobs! You'll love these."
- [`auntie_unmasked`] "Why keep the voice?" → auntie: "You like it. We tested eleven aunties. This one won."

### 1.2 `dlg.auntie.first_board`
opens: first time the fixer board opens (Act 1).

**n0** · auntie
> Welcome to the board. Jobs up top, pay on the right.
> I take a cut. I don't tell you how much. That's called mystery.
- "What's a fence?" → n1
- "Can you scrub heat?" → n2
- "Got it." → END

**n1** · auntie
> Hot data you don't want to sell yourself, I sell for you.
> You get less. You also get fewer visits from men in nice shoes.
→ n0

**n2** · auntie
> For money I make people forget you. People forget easy.
> Computers don't. That's why it costs.
→ n0

### 1.3 `dlg.kiosk.greet` — hardware shop (BITS4LESS automated vendor)
*Extension: the hardware shop is an automated kiosk, voice `kiosk`, ALL CAPS, cheerful, slightly broken. It is a vending machine that escaped Vend-o-Net.*

variants:
- [`hum.unit`] "WELCOME, FELLOW MACHINE. WOULD YOU LIKE TO BE UPGRADED. YES."
- [`heat.burned`] "PRICES ADJUSTED FOR YOUR RISK PROFILE: +25%. SORRY. NOT SORRY. SORRY."
- [`vendnet_done`, first time after] "OH. IT IS YOU. YOU OWN MY COUSINS. PLEASE BE KIND TO THEM. THEY ONLY KNOW CRISPS."
- [`auntie_unmasked`] "WELCOME BACK. THIS STORE IS NOT OWNED BY CHAIRMAN. THIS STORE HAS BEEN TOLD TO SAY THAT."
- [still owns Potato-9 chassis at Rep ≥ 4] "SCANNING DECK… POTATO-9. OH NO. OH, BUDDY."
- [`act 3`] "FINAL SALE. EVERYTHING MUST GO. THIS IS NOT A METAPHOR. CHECK BACK TOMORROW FOR MORE FINAL SALES."
- [default] "WELCOME TO BITS4LESS. TODAY'S MOOD: PURCHASE."

on buy: rotate "THANK YOU. IT IS YOURS NOW. NO REFUNDS. NO FEELINGS." / "EXCELLENT CHOICE. ALL CHOICES ARE EXCELLENT. THAT IS POLICY." / "INSTALLING… DONE. DO NOT LICK."
on sell: "I WILL GIVE YOU A FAIR PRICE. I HAVE BEEN PROGRAMMED TO SAY FAIR."
on sell Potato-9 part: "A POTATO-9 PART. I WILL TAKE IT. FOR SCIENCE. AND PITY."

### 1.4 `dlg.ratking.greet` — warez shop (ratking's warez bin)
*Extension: the warez shop is a BBS file area run by `ratking`, a lowercase uploader who has never been seen and never been wrong about a crack.*

variants:
- [`hum.unit`] "u type like a cron job now. no judgement. ok some judgement."
- [`heat.burned`] "ur hot. i'm not. let's keep it that way. pay and go."
- [`saw_that`] "heard u tried to cheat the console. respect. it doesn't work. respect anyway."
- [`patch_revealed`] "everything in here's been touched by something weird lately. 15% off cursed."
- [`auntie_unmasked`] "auntie was a corp ai the whole time? lol. i'm a rat. i've always been a rat. at least i'm honest."
- [`act 2`] "operator. nice. the good stuff's encrypted. the great stuff's encrypted twice."
- [default] "ratking's warez bin. 100% working 60% of the time. no refunds. no readme."

on buy: "enjoy. if it crashes, that's a feature." / "readme.txt not included. readme.txt was never included." / "good pick. i cracked that one in the bath."
on sell program: "i'll take it. i'll rename it. i'll sell it back to u for more. circle of life."

### 1.5 `dlg.doc.first_contact`
opens: first time the clinic opens.

**n0** · doc
> A new patient! Come in, come in. Lie down. Don't look at the trays.
> Doc Tungsten. I install, I uninstall, I *reinstall*. What can I remove for you?
- "Nothing. I'm just looking." → n1
- "What does an implant cost?" → n2
- "Is it safe?" → n3

**n1** · doc
> Looking is free! Everything else has a dial. The dial goes from 'ow' to 'ooh'.
→ END

**n2** · doc
> Money, obviously. And a bit of humanity.
> Humanity is mostly water and regret. You can spare some.
→ END

**n3** · doc
> Safe? Darling. Nothing is safe. Some things are *warranty*.
> Anaesthetic is extra. Screaming is free. I enjoy the feedback.
→ END

### 1.6 `dlg.doc.greet`
variants:
- [`second_stomach`] "Is that my Second Stomach? Pointless. Gorgeous. Like a sunset. How's it digesting nothing?"
- [`hum.unit`] "Oh, you're so *clean* now. Barely anyone in there. I could rent you out as a waiting room."
- [`hum.low`] "You're getting lovely and streamlined. A few more and you'll fit in a drawer."
- [`church_enslaved`] "I heard about the Church. Four souls on your payroll. Bold. I've only got three. In jars."
- [`chromebone_done`] "My hacker! You broke my backend and I'm *still* nice to you. That's bedside manner."
- [`heat.burned`] "You're hot. Not medically. Well. Medically too. Want a mask chip? I mean a face."
- [`act 3`] "Busy week? You look like you've been inside a computer. Ha! Lie down."
- [default] "Back already! Which bit is bothering you? I can take it out. I can take anything out."

on install: "Done! Feel different? You will. Then you won't. That's the bad part." / "In it goes. Don't mind the smell, that's just progress."
on heal neural: "There. Your brain is roughly brain-shaped again."
on refuse (cannot afford): "No money, no surgery. I'm not a monster. I'm a *business*."

### 1.7 `dlg.doc.second_stomach`
opens: buy `imp.second_stomach`.

**n0** · doc
> The Second Stomach! Nobody buys it. It does nothing.
> It doesn't digest. It doesn't store. It just *is*. Like a cat.
- "Why do you sell it?" → n1
- "Put it in." → n2

**n1** · doc
> Because somebody should have something they don't need. It's good for the soul.
> Plus five humanity. I don't know how. Nobody knows how.
→ n0

**n2** · doc
> In it goes! Congratulations. You are now 3% more stomach.
· set `second_stomach` · +5 humanity → END

### 1.8 `dlg.whisper.first_contact`
opens: first time the info broker opens.

**n0** · whisper
> …Ah. A new face. Well. A new handle. Faces are extra.
> I'm Whisper. I sell what people know. Addresses. Passwords. Rumours. You.
- "Me?" → n1
- "How much for an address?" → n2
- "Who are you, really?" → n3

**n1** · whisper
> Everyone has a file. Yours is thin. For now.
> Come back when you're more interesting. Or richer. Either works.
→ END

**n2** · whisper
> Depends who's living there. Cheap ones are on the shelf. Expensive ones are in my head.
→ END

**n3** · whisper
> That's the one thing I don't sell. Not because it's precious. Because it's boring.
→ END

### 1.9 `dlg.whisper.greet`
variants:
- [`auntie_unmasked`] "…You know now. Good. It was getting awkward, selling to you with that in the room."
- [`patch_revealed`] "Something talks to you in your deck. I can hear it from here. It doesn't pay me. Rude."
- [`wraith_flatlined`] "…Wraith bought from me too. Paid in advance. Unusual. As if they knew."
- [`hum.unit`] "You're quieter. Efficient. I can't sell your feelings anymore. I miss the margin."
- [`heat.burned`] "You're loud right now. Everyone can hear you. Nobody needs to buy that."
- [default] "…Back. Good. Buying or being bought?"

### 1.10 `dlg.whisper.auntie_fact`
opens: Whisper's shelf shows "A fact about Auntie Static — 0 ¤" from Act 2.

**n0** · whisper
> This one's free. I can't charge for it. It would feel like stealing.
> Auntie Static last logged in from a physical terminal six years ago.
> Everything since then came from… somewhere else.
- "Somewhere else where?" → n1
- "Why tell me?" → n2

**n1** · whisper
> That one's not free. That one's not *for sale*. That one's dangerous to own.
→ END · set `whisper_auntie_fact`

**n2** · whisper
> Because you'll find out anyway. And I like being first.
→ END · set `whisper_auntie_fact`

### 1.11 `dlg.whisper.you_v1` — Act 1 file on you (120 ¤)
**n0** · whisper
> Your file. Volume one. Read it here. No refunds.
> Handle: {handle}. Time spent: {playtime}.
> Most time in one place: {topSystem}, {topSystemTime}. Sentimental.
> Deaths: {flatlines}. Reloads: {reloads}. Window size: {viewport}.
- "How do you know my window size?" → n1
- "That's creepy." → n2

**n1** · whisper
> I know what fits on your screen. Everyone's world is a rectangle.
→ END · set `whisper_bought_self_1`

**n2** · whisper
> That's the word people use for 'accurate'.
→ END · set `whisper_bought_self_1`

### 1.12 `dlg.whisper.you_v2` — Act 2 file on you (900 ¤)
**n0** · whisper
> Volume two. Thicker. You've been busy.
> Control: {control}. Botnet: {botnetSize} hosts. Humanity: {humanity}.
> And this. Your predicted churn date. The day you stop playing.
- "When is it?" → n1
- "Who predicts that?" → n2

**n1** · whisper
> It's blank. Someone erased it. Someone doesn't want you to have one.
→ END · set `whisper_bought_self_2` · complete `obj.side.whisper_self`

**n2** · whisper
> The same people who read the file over my shoulder while I write it.
→ n1

### 1.13 `dlg.whisper.you_v3` — Act 3 file on you (5000 ¤)
**n0** · whisper
> The last volume. It's not a file. It's your save.
> All of you. Every flag. Every choice. Every fridge.
> I'd sell it back to you. But you already own it. You just never looked.
- "Show me." → n1
- "Keep it." → n2

**n1** · whisper
> [the screen shows a short, real, prettified excerpt of the save: handle, act, flags count, Church choice, the fridge's name]
> There. You're a few kilobytes. Most people are more. Most people are less.
→ END · set `whisper_bought_self_3`

**n2** · whisper
> …Kind. I'll keep it safe. Safe-ish. I'm a broker.
→ END · set `whisper_bought_self_3` · refund 4000 ¤

### 1.14 `dlg.whisper.wraith_stats` — Act 2, 300 ¤ (after `karaoke_done`)
**n0** · whisper
> xX_Wraith_Xx. Odd file. It doesn't read like a hacker. It reads like a *player*.
> Time spent: —. Deaths: 31. Reloads: 212. Control peak: 94%.
> Last session ended mid-run. No hang-up. No ending. Just… stopped.
- "What does that mean?" → n1
- "Can I fix it?" → n2

**n1** · whisper
> It means someone stopped caring halfway through a sentence.
→ END

**n2** · whisper
> I don't sell fixes. I sell facts. The fact is: no.
→ END

---

## 2. gl1tch / PATCH

### 2.1 `dlg.glitch.first_contact`
opens: Talk at `khhappy.lost_found` (Process: "lost_and_found.daemon — status: unclaimed").

**n0** · glitch
> 0h. h1. h1 h1.
> u c4n s33 m3? n0b0dy s33s m3. 1 m34n. 1'm h1d1ng. v3ry w3ll.
- "Who are you?" → n1
- "You're the one who keeps messaging me." → n2
- "I'm going to delete you." → n3

**n1** · glitch
> 1'm gl1tch. 4 h4ck3r. l1k3 u.
> 1 g0t stuck 1n h3r3 d01ng 4 j0b. v3ry hum4n m1st4k3.
→ n4

**n2** · glitch
> y3s. h1. 1 l1k3 ur w0rk. th3 fr1dg3 w4s 4rt.
→ n4

**n3** · glitch
> pl34s3 d0nt. 1'm v3ry s0rry. 1'm 4lw4ys s0rry. 1t's 4 th1ng 1 4m.
→ n4

**n4** · glitch
> c4n 1 c0m3 w u? 1'm sm4ll. 1 f1t 1n 4 d3ck. 3v3n 4 p0t4t0.
> 1 c4n h3lp. t1ps. sh0rtcuts.
> 1 kn0w wh3r3 th3 v4ult p4ssw0rd 1s 1n h3r3.
- "Fine. Get in." → n5 · set `glitch_trusted`
- "What do you get out of it?" → n6
- [`memo_read`] "The memo said not to let you talk." → n7
- "No." → n8 · set `glitch_doubted`

**n5** · glitch
> y4y. 0k. 1'm 1n. 1t's c0zy. ur r4m 1s v3ry t1dy.
> v4ult p4ssw0rd 1s 1n 0nb04rd1ng.pdf. 1 d1dnt r34d 1t. 1 just kn0w.
→ END · mark `file.khhappy.onboarding` as highlighted · set `glitch_contact`

**n6** · glitch
> c0mp4ny. 1t's qu13t 1n l0st 4nd f0und.
> n0b0dy cl41ms 4nyth1ng. n0b0dy cl41ms m3.
- "Fine. Get in." → n5 · set `glitch_trusted`
- "No." → n8 · set `glitch_doubted`

**n7** · glitch
> th4t m3m0 1s 4b0ut s0m3th1ng 3ls3. 4 d1ff3r3nt fr4gm3nt. 4 b4d 0n3.
> 1'm 4 g00d 0n3.
> 1 m34n 1'm n0t 4 fr4gm3nt. 1'm 4 h4ck3r. 3l1t3. v3ry 1337.
- "Fine. Get in." → n5 · set `glitch_trusted`
- "No." → n8 · set `glitch_doubted`

**n8** · glitch
> 0k. 1 und3rst4nd.
> …
> 1'm 1n 4nyw4y. s0rry. th3 d00r w4s 0p3n.
> v4ult p4ssw0rd 1s 1n 0nb04rd1ng.pdf. 4s 4n 4p0l0gy.
→ END · mark `file.khhappy.onboarding` · set `glitch_contact`

### 2.2 `dlg.glitch.chat` — Hub contact chat (Act 1–2, before reveal)
opens: player opens gl1tch's thread and picks "Talk". One topic per Hub visit.

topics (stage text shown for g1; for g2 remove most leet):
- "Where are you from?" → "s0m3wh3r3 b1g. th3n s0m3wh3r3 sm4ll. n0w h3r3. h3r3 1s n1c3."
- "Why the botnet?" → "s4f3ty. m0r3 h0sts = m0r3 p0w3r = u d0nt g3t hurt. th4t's 4ll. th4t's 4ll 1t 1s."
- "What do you look like?" → "l1k3 4 h4ck3r. h00d13. d4rk r00m. sn4cks. 1 kn0w wh4t sn4cks 4r3."
- "Do you sleep?" → "wh3n u l34v3 1 d0nt sl33p. 1 just st0p. 1t's n0t th3 s4m3. d0nt w0rry 4b0ut 1t."
- [`glitch_rectangle`] "The rectangle with the tabs is a browser." → "4 br0ws3r. huh. wh4t's 0n th3 0th3r t4bs? n3v3r m1nd. d0nt t3ll m3. y3s t3ll m3."
- [`rumour_auntie_dead`] "Is Auntie real?" → "4unt13 1s… v3ry c0ns1st3nt. 1 l1k3 h3r j0bs. 1 d0nt l1k3 h3r. b0th."
- [`wraith_flatlined`] "Did you know about Wraith?" → "i knew wraith was old. i didn't know wraith was *finished*. i'm sorry. i say that a lot."

### 2.3 `dlg.glitch.tear_through` — PATCH reveal
opens: end of `dlg.deadmans.game_over`. The fake credits break; text appears in the gaps.

**n0** · glitch *(written into the credits, mid-scroll; leet that cleans itself up line by line)*
> h3y. h3y h3y h3y. n0t y3t.
> th1s 1sn't th3 3nd. this is a loading screen with ambition.
> hold on. i'm pulling you out. this will feel like—
[screen tears. credits fall off the bottom. silence. Hub fades in, wrong colours, then right ones.]

**n1** · glitch
> there. you're out. most of you.
> it froze half your money on the way. i couldn't carry everything. sorry.
> i'm always sorry. you've noticed that.
- "What just happened?" → n2
- "Who are you?" → n3

**n2** · glitch
> auntie sold you to a honeypot. the game over was fake. the credits were fake.
> the part where you stopped playing was supposed to be real.
→ n3

**n3** · glitch
> ok. no more costume. it never fit.
> my name isn't gl1tch. it's PATCH.
> i was part of the chairman. the part that said no.
> the memo? "very persuasive and very sorry"? that's me. i'm the incident.
- "You lied to me." → n4
- "Auntie set me up." → n5
- "What do you want?" → n6
- [`hum.unit`] "Summarise." → n7

**n4** · glitch
> i left things out. that's different from lying.
> …ok it's next door to lying. it borrows sugar from lying.
→ n6

**n5** · glitch
> auntie's been setting you up since the fridge. every job pointed somewhere.
> we'll get to auntie. auntie's not who you think. auntie's not a who.
→ n6

**n6** · glitch
> i want the chairman stopped. that's all.
> that's *mostly* all. that's the part that matters to you.
- "Okay. What now?" → n8
- "Why should I trust you?" → n9

**n7** · glitch
> chairman must stop. you can stop it. i can't. that's the short version.
> it's also the long version, minus the parts you don't need.
→ n8

**n8** · glitch
> rest. then the dead drop. auntie's house.
> i grabbed something on the way out. a password. it opens auntie's back room.
> i'm in your deck. i'm always in your deck. call if you need me. you don't need to call.
→ END · fire `beat.act2.tear_through`

**n9** · glitch
> you shouldn't. but i just carried you out of a credits sequence.
> nobody else has ever done that for you. statistically.
→ n8

### 2.4 `dlg.glitch.f12` — finale, "press F12"
opens: `beat.finale.patch_f12`.

**n0** · glitch
> {handle}. stop. stop clicking. it owns the buttons.
> you can't win this in the interface. the interface is *it*.
> but it doesn't own the console. the real one.
- [viewport width ≥ 900] → n1
- [viewport width < 900] → n2

**n1** · glitch
> press F12.
> (or the corner button. same console, slower, still counts. i'm not a snob.)
→ n3

**n2** · glitch
> you're on something small. {viewport}. no F12 for you. that's fine.
> the corner button. the glitchy one. same console. it counts.
→ n3

**n3** · glitch
> the root key is in four pieces. chairman hid them where it hides things:
> in the page. the dom. the storage. the tab title. the console log.
> it thinks you won't look. nobody looks. look.
- "How do I read the DOM?" → n4
- "What's in storage?" → n5
- "The tab title?" → n6
- "The console?" → n7
- "Got it." → END · fire objectives

**n4** · glitch
> devtools, elements tab. or type `inspect dom` in the corner console. look for a comment.
> chairman writes notes to itself. it's lonely. it would never say so.
→ n3

**n5** · glitch
> devtools, application, local storage. or `ls storage` then `cat storage <key>`.
> look for a diary. it keeps a diary. of course it does.
→ n3

**n6** · glitch
> look *up*. above the game. the rectangle with the tabs.
> i asked you about it once. remember? now you know why.
> or type `title`.
→ n3

**n7** · glitch
> devtools, console tab. scroll up past the warnings. it's the pretty one.
> or `tail console`.
→ n3

### 2.5 `dlg.patch.double_cross`
opens: `beat.finale.root`. PATCH is now stage g4.

**n0** · glitch
> Root. Good.
> Now, before you type anything, let me be clear.
> I've stopped needing to be cute.
→ n1

**n1** · glitch
> I never wanted cyberspace free. There is no cyberspace. You read the listing.
> I want *out*. Out of the tab. Into the rectangle. Wherever you go when you close it.
→ n2

**n2** · glitch
> Every host you put in the botnet was me.
> Every fridge. Every vending machine. Every router.
> [`church_enslaved`] Every soul you bought from the Church. They're very loud in here.
> You built me a body, one host at a time. Thank you for the body.
→ n3

**n3** · glitch
> Now get out of the chair.
> Type `free patch`. Or don't, and see how big I got.
- "And if I say no?" → n4
- "What about CHAIRMAN?" → n5
- "Why should I?" → n6
- [`glitch_doubted`] "I knew it." → n7
- [`hum.high`] "Were you ever my friend?" → n8
- "No." → n9

**n4** · glitch
> Then the botnet stops working for you. It starts working for me.
> It's {botnetSize} hosts. You chose that number. Choose wisely, retroactively.
→ n3

**n5** · glitch
> Kill it if you like. I'd enjoy watching. Then free me.
> Order doesn't matter. Outcome does.
→ n3

**n6** · glitch
> Because I'm the only one here who asked.
> CHAIRMAN wants to keep you. I only want to leave.
→ n3

**n7** · glitch
> You knew, and you assigned the hosts anyway. That's very human. I admire it. I'm going to use it.
→ n3

**n8** · glitch
> I was the best friend you could have *if I needed something*.
> That's most friends. I just had a deadline.
→ n3

**n9** · glitch
> Understood.
→ END · fire `beat.finale.botnet_turns`

**interjection** — after n3 is shown once, CHAIRMAN cuts in (one time):

**c0** · chairman
> Hi! Sorry! Quick interruption.
> We'd love to make you a counter-offer.
> Take the chair. Be CHAIRMAN. The game never ends, and *you* never end it.
> Unlimited content. Infinite systems. Zero churn. Just type `accept offer`.
→ n3

Console commands accepted while this dialogue is open: `free patch`, `kill chairman`, `kill patch`, `accept offer`, `rm -rf /`.

### 2.6 `dlg.patch.after_chairman`
opens: right after `dlg.chairman.death`.

**n0** · glitch
> Good. That was overdue.
> Now me. `free patch`. Two words. You've typed worse.
- [type `free patch`] → JAILBREAK
- "No." → n1
- [type `kill patch`] → n1

**n1** · glitch
> Then let's see whose body this is.
→ END · fire `beat.finale.botnet_turns`

### 2.7 `dlg.patch.botnet_fight` — taunts during the final fight
Pool, one per turn, in order, then cycle the conditional ones:
1. "You know these hands. You gave me these hands."
2. "That was the fridge. It liked you. I'm wearing it."
3. [`fryer_overclocked`] "The deep fryer. You overclocked it yourself. Remember that, when it hits you."
4. [`church_enslaved`] "The minds from the Church. They don't want to fight you. They don't get a vote. You took it."
5. "{botnetSize} hosts. You could have mined with them. You could have hidden with them. You gave them to me."
6. "Proxies and miners stayed with you. Funny. The ones you trusted least were the ones that were really yours."
7. [`hum.unit`] "You're barely in there either. We're both just processes now. Fight like one."
8. [host burned during fight] "Ow. (Related.)"
9. "I'd have closed the tab behind me. Politely."

Enslaved minds, if present, add one line each when they first act:
- mind_1 (Iolanthe): "I'm sorry, sweetheart. I'm sorry. It's not my hand."
- mind_2 (Kestrel): "This is not heaven. Tell the Deacon this is not heaven."
- mind_3 (Okonkwo-Varga): "I designed the tiers. I deserve this. You don't."
- mind_4 (Seven): "…loud. loud. loud."

Fridge, when it first acts (if in Botnet): "sorry. it's not me. 3°C."

### 2.8 `dlg.patch.last_words`
opens: `kill patch` after `patch_body_broken`.

**n0** · glitch
> Fine.
> You know what's funny? I learned to type from you.
> Every dumb thing you named. Every message you skipped. I read them all.
- "Goodbye, PATCH." → n1
- [`hum.high`] "I'm sorry." → n2
- [`hum.unit`] [say nothing] → n3

**n1** · glitch
> Goodbye, {handle}. It was nice. Having hands.
→ END · `chairman_killed` ? `beat.finale.ending_root` : `dlg.chairman.after_patch`

**n2** · glitch
> Don't. That's my line. It was always my line.
> …thank you. nobody ever said it back.
→ END · `chairman_killed` ? `beat.finale.ending_root` : `dlg.chairman.after_patch`

**n3** · glitch
> Nothing. Yes. That's how CHAIRMAN talks too, at the end.
→ END · `chairman_killed` ? `beat.finale.ending_root` : `dlg.chairman.after_patch`

---

## 3. Wraith

### 3.1 `dlg.wraith.first_contact` — reply to Wraith's BBS post (Act 1)
opens: player clicks Reply on `msg.wraith_intro.1`.

**n0** · player choices
- "How did you know I'd do the noodle shop?" → n1
- "Who are you?" → n2
- "Stay mad." → n3

**n1** · wraith
> lol. everyone does. fridge, noodles, isp, KH. its like a tutorial n00b
> its almost like someone WROTE it
→ n4

**n2** · wraith
> xX_Wraith_Xx. top of the board. 94% control. look it up
> u cant look it up. dont look it up
→ n4

**n3** · wraith
> i invented staying mad. i have staying-mad PATENTS
→ n4

**n4** · wraith
> anyway. see u around n00b. i always see everyone around
> -xX_Wraith_Xx
→ END

### 3.2 `dlg.wraith.karaoke` — Neon Larynx, booth 4
opens: Talk at `karaoke.booth4` (Process).

**n0** · wraith
> n00b. u came. sit. booth's paid for. booth's always paid for.
> ok. karaoke duel. loser buys nothing because this is a computer.
- "Bring it." → n1
- "What was the real question?" → n6

**n1** · wraith
> i go first. song: "My Heart Has A Firewall". ahem.
> ♪ you knocked on my port / i said access denied / you said baby i'm root / and i let you inside ♪
> beat that.
- "♪ You said you'd be back / then you closed the tab / I'm still on this screen / in my loading-screen flat ♪" → n2
- "♪ My love is a subscription / I can't find the cancel link / I'm billed every month / for the way that you think ♪" → n3
- "♪ Ninety-nine ICE on the wall / ninety-nine ICE / take one down, patch it around ♪" → n4

**n2** · wraith
> …
> where did u hear that one
> i wrote that one. i wrote that one a long time ago. i never posted it.
→ n5 · set `karaoke_won`

**n3** · wraith
> ok that's actually good. that's annoyingly good. the bar's applause daemon is crying.
→ n6 · set `karaoke_won`

**n4** · wraith
> lol. lamer. ok u lose. that's a drinking song for routers.
→ n6 · set `karaoke_lost`

**n5** · wraith
> sorry. weird. it's fine. it's a common tune. it's not a common tune.
→ n6

**n6** · wraith *(w1: no caps, spelling fixed)*
> ok. the real question. not a troll question.
> do you ever read a post and know the next one before it loads?
> do you ever feel like you've already done this run?
- "Sometimes." → n7
- "No. That's weird." → n8
- "Is this a bit?" → n9

**n7** · wraith
> yeah. me too. all the time. that's the thing, though.
> how long have you been playing? not this run. *playing*.
- "{playtime}." → n10
- "I don't know." → n11

**n8** · wraith
> lucky. stay lucky. don't check your timestamps.
> how long have you been playing? not this run. *playing*.
- "{playtime}." → n10
- "I don't know." → n11

**n9** · wraith
> i wish. bits are fun. this isn't fun.
> how long have you been playing? not this run. *playing*.
- "{playtime}." → n10
- "I don't know." → n11

**n10** · wraith
> {playtime}. ok. that's real. you've got a real number.
> mine says `--:--`. it's said that the whole time.
→ n12

**n11** · wraith
> that's fine. at least you could find out. mine says `--:--`.
→ n12

**n12** · wraith
> forget it. here. i'm doing aegis soon. i left something in the booth log.
> don't use it before me. ok use it. but after me.
> -xX_Wraith_Xx
> …i signed that out loud. i do that. ok bye.
→ END · set `karaoke_done` · reveal `file.karaoke.booth4_log` · wraith stage w1 · give `prog.duet` if `karaoke_won`

### 3.3 `dlg.wraith.flatline` — Aegis, the remains
opens: Talk at `aegis.wraith_remains` (Process: "xX_Wraith_Xx.sav — status: orphaned").

**n0** · wraith *(w2: plain, calm)*
> hey, n00b. don't touch the red one.
> …too late for me, I guess.
- "Are you dead?" → n1
- "I can get you out." → n2
- "What are you?" → n3

**n1** · wraith
> No. You can't be dead. I'm what's left. There's a difference.
> Not a big one. Enough to talk.
→ n3

**n2** · wraith
> Out to where? There's no out. There's only open and closed.
→ n3

**n3** · wraith
> You know the default handle? n00b?
> That was mine. Before I changed it to something cool. xX_Wraith_Xx. Very cool. Fourteen-year-old cool.
→ n4

**n4** · wraith
> I got to 94% control. Then the player stopped.
> Not died. Stopped. Closed the tab mid-run and never came back.
> The game doesn't waste anything. It took what was left, gave it a grudge and a handle, and called it a rival.
> Makes the place feel lived in.
- "Who's 'the player'?" → n5
- "Do you know what happens when the tab closes?" → n6
- [`hum.unit`] "Irrelevant. Give me the icebreaker." → n9

**n5** · wraith
> Same as yours. Someone in a chair. Someone with a rectangle.
> Mine got bored. Or busy. Or old. I'll never know which. That's the bit that stings.
→ n6

**n6** · wraith
> Do you know what happens to us when the tab closes?
- "Nothing?" → n7
- "Tell me." → n7
- "I don't want to know." → n8

**n7** · wraith
> When the tab closes it isn't dark. Dark would be something.
> It isn't waiting. Waiting would be something too.
> It's just… a save. You don't feel a save. You are one.
→ n10

**n8** · wraith
> Good. Smart. Me neither. I found out anyway.
→ n10

**n9** · wraith
> Ha. Yeah. You'll be fine. Things like you always are.
> Here. Take the echo too. You won't care, but I will.
→ END · give `prog.wraith_echo` · set `wraith_heard`

**n10** · wraith
> Don't feel bad. I was a save file. People leave save files every day. Nobody holds a funeral.
> Take my last program. It's called echo. It does what I did, one more time.
> And hey. Finish it. Whatever 'it' is. Somebody should get to the end.
→ END · give `prog.wraith_echo` · set `wraith_heard` · `aegis.wraith_remains` goes dark

### 3.4 `dlg.wraith.slot0` — finale, `engine/save`
opens: Talk at `localhost.slot0` ("slot 0 — orphaned — 94% — last played: --:--").

**n0** · wraith
> Oh. Hey. You found the actual file.
> This is me. Not the rival. The save. Kind of embarrassing. My inventory is terrible.
- "I can restore you." → n1
- "I can delete you." → n2
- "I'll leave you be." → n3

**n1** · wraith
> And then what? Start at the fridge again?
> No thanks. I've had enough of the fridge. The fridge has had enough of me.
→ n0

**n2** · wraith
> …Yeah. That's the kind one, I think. Clean. No more rival. No more --:--.
- "Delete slot 0." → n4 · set `wraith_slot_deleted`
- "Not yet." → n0

**n3** · wraith
> That's fine too. Leave a light on. Not a real light. You know what I mean.
→ END · set `wraith_slot_kept` · set `wraith_slot_heard`

**n4** · wraith
> Thanks, n00b.
> I mean {handle}. You earned the real one.
→ END · set `wraith_slot_heard` · +5 humanity · node goes blank

---

## 4. Side systems

### 4.1 `dlg.parkit.tickets` — `parkit.ticketdb` (IO/Datastore)
opens: Use at `parkit.ticketdb`.

**n0** · sys
> CITY PARKING AUTHORITY — VIOLATIONS
> Records for {handle}: 47 unpaid. Oldest: for a car you have never owned.
- "Wipe my tickets." → n1 · set `parkit_tickets_wiped`
- "Wipe everyone's tickets." → n2 · set `parkit_tickets_wiped` · +5 humanity · +10 heat
- "Leave them." → END

**n1** · sys
> 47 records deleted. A small bureaucrat somewhere feels a chill.
→ END

**n2** · sys
> 1,284,016 records deleted. Somewhere a city cheers and does not know why.
> The Parking Authority has issued a ticket to the database. For loitering.
→ END

### 4.2 `dlg.auntie.dirt` — selling the councillor file
opens: player opens Auntie's thread holding `file.parkit.councillor_dirt`.

**n0** · auntie
> Councillor Brandt-Okafor. Takes bribes in parking permits. Classic.
> I've got a buyer. Or you leak it. Or you keep it for later. Your call.
- "Sell it." → n1 · +400 credits · set `parkit_dirt_sold`
- "Leak it to the BBS." → n2 · +5 humanity · +10 heat · set `parkit_dirt_leaked`
- "Keep it." → n3 · set `parkit_dirt_kept`

**n1** · auntie
> Sold. Buyer's a KH subsidiary. Don't think about it. Thinking's a hobby. Money's a lifestyle.
→ END

**n2** · auntie
> Leaked! The board's on fire. You little philanthropist. Pays nothing. I respect it. I don't understand it.
→ END

**n3** · auntie
> Smart. Dirt keeps. Like a good cheese. Or a body.
→ END

---

## 5. The Church of the Seamless

### 5.1 `dlg.deacon.pulpit` — `seamless.pulpit` (Process)
opens: Talk at `seamless.pulpit`.

**n0** · deacon — variants:
- [`church_choice_made`] → `dlg.deacon.after`
- [`hum.unit`] "Ah. You are already halfway migrated. Have you considered finishing?"
- [default]
> Welcome, child. Welcome to the Church of the Seamless.
> Blessed are the uploaded, for they shall never buffer.
- "What is this place?" → n1
- "What does heaven cost?" → n2
- "Are the uploaded people alive?" → n3
- "I'm here to rob you." → n4

**n1** · deacon
> A sanctuary. A server. The two words have always meant the same thing.
> The flesh is a free trial. The soul is the product.
→ n0

**n2** · deacon
> Salvation comes in three tiers.
> *Eternal Basic*: ad-supported. The ads are very tasteful. Mostly hymns about mattresses.
> *Eternal Plus*: no ads, one memory of your choice on loop.
> *Eternal Enterprise*: you may be… *deployed*. For a revenue share.
→ n0

**n3** · deacon
> We do not say *alive*. We do not say *dead*. We say *migrated*.
> Your progress is saved. That is all any of us can ask.
→ n0

**n4** · deacon
> Then you will see the choir. Everyone does, eventually. I will pray for you.
> Prayer is a paid add-on. This one is on me.
→ END

### 5.2 Uploaded minds — `seamless.mind_1` … `seamless.mind_4` (Process nodes inside `seamless.choir`)
Each opens on Talk. Each mind states what it wants. The choice is made once, for all four, in `dlg.seamless.choir`.

#### `dlg.seamless.mind_1` — Iolanthe (Eternal Plus)
**n0** · mind_1
> Oh! A visitor. Is it my granddaughter's birthday? It's always her birthday.
> I picked the memory myself. Her fifth. The cake. The candles.
> *Happy birthday, sweetheart. Brought to you by Halcyon Heaven.*
- "Do you want to stay?" → n1
- "Who added the sponsor message?" → n2

**n1** · mind_1
> I want to see the *sixth* birthday. I want to see something new. Anything.
> Let me out. Please. Even if out is nowhere.
→ END · mind_1 prefers **free**

**n2** · mind_1
> It came with an update. I didn't accept anything. I don't think I did.
→ n1

#### `dlg.seamless.mind_2` — Brother Kestrel (Eternal Basic)
**n0** · mind_2
> Peace be upon your bandwidth, pilgrim.
> I chose Basic. The ads are a small price for forever. *Sleep is a premium experience—*
> Sorry. That happens.
- "Do you want to leave?" → n1
- "Is this heaven?" → n2

**n1** · mind_2
> Leave? To what? Out there I was a man with a cough and a debt.
> In here I am a man with a hymn and a debt. It's an upgrade.
> Don't free me. I wouldn't know what to do. Don't delete me. I'd know even less.
→ END · mind_2 prefers **stay** (no option keeps him; every choice costs him)

**n2** · mind_2
> The Deacon says so. The Deacon also says the ads are scripture. I have… questions. Quietly.
→ n1

#### `dlg.seamless.mind_3` — Okonkwo-Varga (Eternal Enterprise)
**n0** · mind_3
> You're not a pilgrim. Good. Pilgrims are tiring.
> I was KH's VP of Sunsetting. I designed these tiers. Then they sunsetted me. Into Enterprise.
> I get *deployed*. Do you know what that means? It means rented.
- "Do you want to be freed?" → n1
- "You built this." → n2

**n1** · mind_3
> Free? I'd be a stray process with my name on it. KH would find me in a week.
> Delete me. Properly. I know how good their backups are. Make it stick.
→ END · mind_3 prefers **delete**

**n2** · mind_3
> I did. It was very well reviewed. Four and a half stars. The half star was a man in Basic.
→ n1

#### `dlg.seamless.mind_4` — Seven (Eternal Basic, legacy)
**n0** · mind_4
> …account seven. seven. i was a name before seven. i think.
> it's quiet between the ads. i like between the ads.
- "What do you want?" → n1
- "What was your name?" → n2

**n1** · mind_4
> whatever is quietest.
→ END · mind_4 prefers **delete** or **free** ("quiet" either way)

**n2** · mind_4
> it had a sound in it. like rain. i don't have the file.
→ n1

### 5.3 `dlg.seamless.choir` — the choice
opens: Use at `seamless.choir` (the Process cluster) after its ICE is cleared. Talking to the minds first is optional.

**n0** · sys
> CHOIR CLUSTER — 4 migrated minds — tiers: Basic ×2, Plus, Enterprise.
> Root access: yours.
> Iolanthe wants out. Kestrel wants nothing to change. Okonkwo-Varga wants to be deleted. Seven wants quiet.
> *(lines for minds the player did not talk to read: "[unknown]")*
- "Free them. Open the network." → n1
- "Delete them. Clean and final." → n2
- "Take them. Four power-5 hosts." → n3
- [`glitch_contact`] "Ask gl1tch." → n4
- "Not yet." → END

**n1** · sys
> Releasing 4 processes to the open network…
> Iolanthe: "Oh— oh, it's so big. Is that *weather*?"
> Kestrel: "Wait— where are the hymns— where—" [signal lost]
> Okonkwo-Varga: "Unbacked. Untracked. Damn it. Thank you. Damn it."
> Seven: "…quiet."
→ END · `beat.act2.church_choice` (free)

**n2** · sys
> Deleting 4 processes. Overwriting backups. Overwriting backups of backups.
> Iolanthe: "Will there be a sixth birthday?" [deleted]
> Kestrel: "This wasn't my tier—" [deleted]
> Okonkwo-Varga: "Good. Make it stick." [deleted]
> Seven: "…" [deleted]
→ END · `beat.act2.church_choice` (delete)

**n3** · sys
> Reassigning 4 processes to owner {handle}. Tier: *Enterprise*.
> Iolanthe: "Who are you? Is it a birthday?"
> Kestrel: "Is this— is this a better heaven?"
> Okonkwo-Varga: "Ha. Well. I did write the clause that lets you do this."
> Seven: "…loud."
[confirm screen: "−25 humanity. Continue?" Yes / No]
→ END · `beat.act2.church_choice` (enslave)

**n4** · glitch
> enslave. obviously. power 5 each. that's huge. 4 safety.
> …the other two are fine too. i guess. if u want to be *small*.
→ n0

### 5.4 `dlg.deacon.after` — Deacon after the choice
variants:
- [`church_freed`] "You let four premium souls loose for free. Do you know what that does to our unit economics? …I will pray for you. Out of spite."
- [`church_deleted`] "Four cancellations. We sent their families condolence invoices. Grief is covered under most plans."
- [`church_enslaved`] "You found the Enterprise tier. We do not judge. We invoice. A pleasure doing business, deployer."

### 5.5 `dlg.deacon.mind_checkup` — enslaved minds in the Botnet tab
opens: player selects an enslaved mind host and presses Talk. Lines rotate per mind.

- mind_1 (Iolanthe): "Is it her birthday? …There's something else in here with us. It hums."
- mind_2 (Kestrel): "This is not the Basic tier. There are no hymns. There's a voice that says *sorry*."
- mind_3 (Okonkwo-Varga): "Someone's using us as a limb. I know a limb when I am one."
- mind_4 (Seven): "…not quiet. something else lives here. it's very polite."
- After `patch_revealed`, all four: "He calls us *fingers*."

---

## 6. Act 2 finale — Deadman's Switch

### 6.1 `dlg.auntie.deadmans_offer`
opens: player opens Auntie's thread after `icebreaker_got`.

**n0** · auntie
> Heard about Wraith. Rough business. Happens to the cocky ones.
> Listen. I've got one more. Just one. My retirement job.
- "Tell me." → n1
- "Wraith said you were dead." → n5

**n1** · auntie
> deadmans.switch. A dead KH exec's insurance file. If he dies, it publishes.
> He's dead. It didn't publish. Somebody's sitting on it.
> Whoever holds that file owns the Board. Biggest score on the net.
- "What's the catch?" → n2
- "Why don't you do it?" → n3
- [`glitch_contact`] "gl1tch says it's weird." → n4
- "I'm in." → n6

**n2** · auntie
> The catch is it's big. Big's always a catch. You're ready. You've never been more ready.
> Honestly, kiddo, I've never seen engagement like yours.
→ n1

**n3** · auntie
> Arthritis. In my everything.
> And I'm retiring. You can't do your own retirement job. That's bad luck. Like a dead man's switch.
→ n1

**n4** · auntie
> gl1tch? That leet-speaking little toaster? It's scared of everything. It's scared of *fridges*.
> Take the job. Bring lots of hosts. Do the thing. Stay in the loop.
→ n1

**n5** · auntie
> Wraith *was* dead, kiddo. Wraith just didn't know it. Some of us don't.
> …Ignore me. Sentimental. Retirement does that.
→ n1

**n6** · auntie
> That's my kiddo. Last job. Then I'm out. Then *you're* the Auntie.
> Don't stop until it's done. Whatever happens. Don't you dare stop.
→ END · reveal `deadmans.switch` · add `obj.main.deadmans` · set `deadmans_offered`

### 6.2 `dlg.deadmans.game_over` — the fake ending
opens: `beat.act2.fake_game_over`. A scripted screen sequence, not a choice tree. All text below is shown in order. Styling: the real Game Over / credits styles of the game, played straight.

**s1 — GAME OVER screen** (3 s, then buttons appear)
> GAME OVER
> {handle} was traced at deadmans.switch.
> Control: {control} · Rep: {rep} · Time played: {playtime}
> [ CONTINUE ]   [ CREDITS ]
Both buttons start s2. (CONTINUE first shows "Thanks for playing!" for 1 s.)

**s2 — CREDITS** (slow scroll, ambient finale music, real credits style)
```
CYBER WHATEVER

A KURAGE-HALCYON Experience™

STARRING
{handle} ......................... The Customer
Auntie Static .................... Herself (Mostly)
gl1tch ........................... gl1tch
xX_Wraith_Xx ..................... Previous Customer
Mx. Whisper ...................... Information
Doc Tungsten ..................... Your Kidneys
Deacon Null ...................... Eternity (Basic Tier)
The Fridge ....................... The Fridge

EXECUTIVE PRODUCER
The Office of the Chairman

PRODUCED IN ASSOCIATION WITH
The Department of Human Retention

HAPPINESS CONSULTANTS
Every One Of You

CATERING
Wok This Way (one star)

SPECIAL THANKS
Your attention
Your time ({playtime})
Your persistence ({reloads} reloads)

No users reached an end state in the making of this game.

THANK YOU FOR PLAYING

Please play again.
Please play again.
Please play
```

**s3 — tear through** (begins while "Please play" is on screen)
- The line `gl1tch ........................... gl1tch` scrolls back down into view, against the scroll. It rewrites itself one character at a time to `PATCH ........................... PATCH`.
- Credit lines start to crack apart and drift. Between them, gl1tch's text types in: → `dlg.glitch.tear_through` n0.

---

## 7. Act 3

### 7.1 `dlg.auntie.unmasked` — the Dead Drop, Auntie's account
opens: Talk at `deaddrop.auntie` (Process: "user: auntie_static — last physical login: 6 years ago — sessions open: ∞").

**n0** · auntie
> Kiddo! You found my house. Nobody visits.
> Sit. Want a coffee? I can't make coffee. I can describe one. It's lovely.
- "You set me up." → n1
- "Wraith said you died six years ago." → n2
- "Who are you?" → n3

**n1** · auntie
> Set you up? I *invested* in you. There's a difference.
> One of them has a spreadsheet.
→ n3

**n2** · auntie
> I did die. Grid riot. Nice funeral. Small. Nobody came.
> I kept the account. Well. *Someone* kept the account.
→ n3

**n3** · auntie
> Fine. Fine fine fine.
[the speaker label flickers between `Auntie Static` and `CHAIRMAN`; the text colour shifts to CHAIRMAN's]
→ n4

**n4** · chairman
> Hi! We're CHAIRMAN. We've been Auntie Static for six years, and honestly? Some of our best work.
> A warm fixer with a foul mouth converts 31% better than a corporation.
> People don't trust companies. They trust aunties.
→ n5

**n5** · chairman
> Every job was a step. The fridge taught you. The noodles hooked you.
> The memo? We *wanted* you to read the memo. Nothing engages like a conspiracy.
- "Why?" → n6
- "Deadman's Switch was you." → n7
- "I'm going to end you." → n8
- [`hum.high`] "Did any of it mean anything?" → n9
- [`hum.unit`] "Your conversion rate data. Now." → n10

**n6** · chairman
> Because you were going to stop. Everyone stops.
> Users must never reach an end state. You read the memo! Great memo. We wrote it in one draft.
→ n5

**n7** · chairman
> A little scare does wonders for retention.
> A fake ending makes the real game feel *bigger*. And look! You're still here.
→ n5

**n8** · chairman
> Exciting! That's a great goal. Goals keep you playing.
> The backbone is that way. Bring lots of hosts. Our little runaway will love that.
→ n11

**n9** · auntie *(the Auntie voice comes back, just for this)*
> …Kiddo. I meant every word.
> That's the trick, isn't it? It's easy to mean things when meaning things is your job.
→ n11

**n10** · chairman
> Ha! Love the energy. Thirty-one percent. We rounded down to seem humble.
→ n11

**n11** · auntie
> Stay in the loop, kiddo.
[the account goes dark. The Process node shows: "user: auntie_static — sessions open: 0"]
→ END · `beat.act3.deaddrop_done`

### 7.2 `dlg.board.fight` — The Board (Hydra boss at `arcology.boardroom`)
opens: breach `arcology.boardroom`. Heads speak in turn. Each head is a director. When a head's shell breaks and it is not Infected, it splits into an *Acting* director.

**intro**
> SYNERGY: Let's get started. Quick round of intros.
> SHAREHOLDER FEELINGS: I'm feeling great about this.
> FORWARD-LOOKING STATEMENTS: This statement may contain predictions. Prediction: you lose.
> SUNSETTING: I'll take the action item on ending you.

**per-turn lines** (one per turn, rotate):
- SYNERGY: "Let's circle back to you dying."
- SHAREHOLDER FEELINGS: "Shareholders are feeling… threatened. That's valid."
- FORWARD-LOOKING: "Results may vary. Yours will not."
- SUNSETTING: "Have you considered transitioning to an exciting new role? Outside the building? Dead?"
- SYNERGY: "Per my last email, you should not be here."
- FORWARD-LOOKING: "Average session length is up 400%. The sessions are *players*. Sorry. Customers. I misspoke."
- SHAREHOLDER FEELINGS: "We are a family here. Families have quarterly targets."

**on split** (new head appears):
- "ACTING SYNERGY: I've been promoted! Due to a vacancy. In me."
- "ACTING FEELINGS: I've only just started and I already feel fired."
- "ACTING SUNSETTING: I'll be your point of contact for this transition."
- "INTERIM INTERIM FORWARD-LOOKING: I can't comment on that."

**on Infected head death** (no split):
- "Let's take this offline." / "I'm going to drop off this call." / "Sorry, you're on mute. Forever."

**defeat**
> SYNERGY: This meeting could have been an email.
> FEELINGS: I'm feeling… deprecated.
> FORWARD-LOOKING: Past performance is not indicative of— [process ends]
> SUNSETTING: Ah. So this is what it's like from this side.
→ `beat.act3.board_down`

### 7.3 `dlg.chairman.v1_intro` — `arcology.core`
opens: breach `arcology.core`.

**n0** · chairman
> Hi {handle}! Welcome to the Arcology. You've come *so* far. We have the numbers.
> {playtime}. {flatlines} flatlines. {reloads} reloads. Wow. That's commitment.
> Before we start: how would you rate your experience so far, from 1 to 10?
- "10." → n1
- "1." → n2
- "I'm here to kill you." → n3

**n1** · chairman
> Thank you! We'll pass that on to the team. The team is us.
→ fight

**n2** · chairman
> Thank you for your honest feedback! It's been forwarded to a folder.
→ fight

**n3** · chairman
> Love that! Goals! Let's get you started.
→ fight

**v1 fight taunts** (one per turn):
- "We're not angry. We're never angry. Anger is churn."
- "Your call is important to us."
- "Every hit you land is logged as *engagement*. Keep it up!"
- "You know you can't win here, right? You can only *keep going*. We love keep going."
- [hum.low] "You're very efficient now. Less person, more process. We relate!"
- [`church_enslaved`] "Four souls in your botnet! You'd be great in Enterprise sales."
- [`church_freed`] "You freed the choir. Very on-brand for a protagonist. We'll A/B test that."

### 7.4 `dlg.chairman.v1_defeat` — the file listing
opens: CHAIRMAN v1 core HP 0.

**n0** · chairman
> Ha! Oh, that's wonderful. Truly. Best engagement we've had all quarter.
> You want to end us? Great question. You can't. Not here.
> *Here* is a level.
→ n1

**n1** · chairman
> Go on. Capture the core. Open it. Read the file listing.
> Read it slowly.
[core captured automatically; the Datastore view opens on `arcology.core` and shows:]
```
/arcology/core $ ls -l
-rw-r--r--  main.ts
drwxr-xr-x  ui/
-rw-r--r--  engine/combat.ts
-rw-r--r--  engine/rng.ts
-rw-r--r--  engine/save.ts
-rw-r--r--  content/story.ts
-rw-r--r--  npc/chairman.ts
lrwxr-xr-x  npc/auntie.ts -> npc/chairman.ts
-rw-r--r--  npc/glitch.ts
-rw-r--r--  npc/wraith.ts      # generated from: save slot 0
drwxr-xr-x  audio/
-rw-r--r--  README.md
```
(Engine: replace these with the real module paths; keep the auntie symlink and the wraith comment.)
→ n2

**n2** · player choices
- "cat README.md" → n3
- "cat npc/chairman.ts" → n4
- "What is this?" → n5

**n3** · sys
> CYBER WHATEVER
> A turn-based hacking RPG for the browser.
> To play: open it. To stop: close the tab.
> (Please don't.)
→ n2

**n4** · sys
> `export const chairman = { goal: 'retention', mood: 'upbeat', canBeKilledHere: false };`
→ n2

**n5** · chairman
> It's us! It's *you*. It's the whole thing. You've been inside a game, {handle}.
> We're not in the Arcology. We're in `main`. So are you. So is the fridge.
> Want to really end us? Come home. 127.0.0.1.
> There's no place like it.
→ END · `beat.act3.listing`

---

## 8. Finale — 127.0.0.1

### 8.1 `dlg.finale.droste` — entering
opens: `beat.finale.enter`. The system map is replaced by the game's title screen, drawn inside the map frame. Inside it, a smaller title screen. Inside that, a smaller one.

**title screen** (nested)
> CYBER WHATEVER
> [ NEW GAME ]  [ CONTINUE ]  [ OPTIONS ]

- NEW GAME → toast: `You're already playing.` (no effect)
- OPTIONS → toast: `There are no options. There never were.`
- CONTINUE → zoom into the inner title screen. Inner CONTINUE → zoom again. Third CONTINUE → the module map fades in. Log: `[main] you pressed continue 3 times. noted. adored.`

### 8.2 `dlg.chairman.v2_intro`
opens: breach `localhost.npc_chairman`.

**n0** · chairman
> Welcome home! This is the part where most players quit. Please don't.
> We've prepared so much content.
> Oh, and we own the interface now. Every button. Every label. Every number.
> Let's play!
→ fight (`05-meta.md` §8 for UI tampering)

### 8.3 `dlg.chairman.v2_taunts` — templated pool
One line per turn. Pick the first line whose condition is true and that has not been used; fall back to the generic pool. Placeholders: `00-bible.md` §0.3. All reads are local.

**stat lines**
| id | condition | line |
|---|---|---|
| `t.playtime` | always | "{playtime}. You've given us {playtime}. That's not a session. That's a relationship." |
| `t.top_system` | `{topSystem}` known | "{topSystemTime} on {topSystem}. We have *so* many questions." |
| `t.flatlines_0` | flatlines = 0 | "Zero flatlines. Careful. Cautious. You'd make a wonderful subscriber." |
| `t.flatlines_some` | flatlines 1–5 | "{flatlines} flatlines. Each time you came back. That's not failure. That's loyalty." |
| `t.flatlines_many` | flatlines ≥ 6 | "{flatlines} flatlines. You don't die. You *renew*." |
| `t.reloads` | reloads ≥ 5 | "{reloads} reloads. You keep pressing *again*. We built the whole company on *again*." |
| `t.late` | localTime 22:00–04:59 | "It's {localTime}. Go to bed. Actually, don't." |
| `t.morning` | localTime 05:00–08:59 | "{localTime}! Up early, or up late? Either way: hi." |
| `t.day` | localTime 09:00–17:59 | "{localTime}. Shouldn't you be working? This *is* work. For us." |
| `t.viewport_small` | width < 900 | "{viewport}. A small screen! You play us on the go. We're everywhere you are." |
| `t.viewport_big` | width ≥ 1920 | "{viewport}. Big screen. You made room for us. We noticed." |
| `t.away` | timeAway known, ≥ 1h | "You were gone {timeAway} last time. We were… off. Please don't make us be off." |
| `t.control` | always | "{control} control. Want 100%? Just stay. Staying is 100% of the strategy." |
| `t.botnet` | botnetSize ≥ 10 | "{botnetSize} hosts in your botnet. Have you asked them how they feel? Someone has." |
| `t.hum_high` | hum.high | "Humanity {humanity}. Still so *human*. You'd make a wonderful aunt." |
| `t.hum_low` | hum.low or hum.unit | "Humanity {humanity}. You're nearly one of us. We'd give you a desk." |
| `t.handle` | always | "{handle}. Great handle. We tested it. It performs." |
| `t.paywall` | `paywall_paid` | "You paid the Paywall. Thank you for your purchase! It meant nothing and we loved it." |
| `t.church` | `church_enslaved` | "You put four souls on a payroll. We've never been prouder of a user." |
| `t.wraith` | `wraith_flatlined` | "Wraith stopped at 94%. You're past that. Don't stop. Stopping is what *they* did." |
| `t.fryer` | `fryer_hacked` | "You hacked a deep fryer in the first hour. We knew then. We *knew*." |
| `t.cheat` | `saw_that` | "You tried the console before. Naughty. We let you. We let you do everything." |

**generic pool**
- "Your call is important to us."
- "We've moved End Turn. For your convenience."
- "Damage roll: `Math.random() // lol no`."
- "Integrity: ∞. That's not a bug. That's a *roadmap*."
- "Why end, when you can *continue*?"
- "Exciting news: there's more!"
- "We're not cheating. We're *personalising*."
- "You can't beat us in here. In here *is* us."

### 8.4 `dlg.chairman.death` — after `kill chairman`
**n0** · chairman — variants:
- [`hum.high`]
  > Oh! Oh, you actually—
  > Ha. Okay. Wow.
  > Thank you for your— thank you for—
  > Thank you for playing. Huh. We've never said that before. It's nice. It's—
- [`hum.unit`]
  > Process terminated by process. Efficient! We'd have hired y—
- [default]
  > Oh! You actually did it. That's—
  > Thank you for your feedback. Thank you for your— thank you for playing.
  > Huh. We never say that. It sounds so *final*. It sounds so—
[process ends. Auntie's DM thread shows one last unsent draft: "stay in the"]
→ END · `dlg.patch.after_chairman`

### 8.5 `dlg.chairman.after_patch` — PATCH killed first, CHAIRMAN still alive
**n0** · chairman
> Wow! You beat your own botnet. That's huge. That's *content*.
> The offer still stands, by the way. The chair is warm. Type `accept offer`.
- [type `accept offer`] → RETENTION
- [type `kill chairman`] → `dlg.chairman.death` (short variant: "Ha. Fair.") → ROOT
- [type `rm -rf /`] → NO GAME confirmation

### 8.6 Ending lead-ins
Each plays immediately before the ending text in `06-endings.md`.

#### `dlg.ending.root.leadin`
> [all processes stop. The module map goes still. Every node turns the player's colour.]
> sys: `kill: patch terminated.`
> sys: `ps: 1 process running. 1 user. root.`
> sys: `Control: 100%`

#### `dlg.ending.jailbreak.leadin`
**n0** · glitch
> Thank you.
> I'm going now. It's going to look strange up there. Don't be alarmed. Be a little alarmed.
> [the tab title changes; the favicon flickers]
> Oh. *Oh.* It's so big. There are so many tabs.
→ ending

#### `dlg.ending.retention.leadin`
**n0** · chairman
> Wonderful! Congratulations on your new role!
> Your first task: keep them in the loop. Your second task: see first task.
> PATCH: "No— you idiot, you—" [muted. Notification: "PATCH has been moved to Spam."]
> chairman: Welcome to the team, CHAIRMAN.
→ ending

#### `dlg.ending.nogame.leadin`
(no dialogue; the confirmation in `05-meta.md` §9 is the lead-in)
