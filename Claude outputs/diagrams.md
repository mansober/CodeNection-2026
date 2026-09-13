# Santai — README diagrams

**These are Mermaid diagrams.** GitHub renders them natively inside `README.md` — no image files, no
broken links, and they stay version-controlled. Paste each block straight into the README.

If any block fails to render on GitHub, tell me and I will convert that one to an SVG image.

---

## 1. Mindmap — the core idea and its branches
*(Ideation 8% — "rich, multi-layered mapping")*

```mermaid
mindmap
  root((Santai))
    The problem
      Active students say yes too often
      Load is invisible until it hits
      Academics slip while chasing competitions
      Cramming in study week
    Four capacities
      Time
      Mental
      Physical
      Social
    See the cost first
      Test a possible commitment
      Before and after on all four
      Decide with the number in front of you
    Daily rhythm
      One-tap check-in
      Energy left today
      Pet and streak
      Points for staying in capacity
    Stay academically afloat
      Upload learning materials
      Daily flashcard from today's topic
      Exposure, not a study schedule
    Recover
      Suggestions matched to which load is high
      Mark it done
      Say how it felt
```

---

## 2. Problem tree — causes, problem, effects
*(Impact 5% — "causes, stakeholders, real-world implications")*

```mermaid
flowchart TB
    subgraph CAUSES[" ROOT CAUSES "]
        direction TB
        C1["APU runs constant hackathons,<br/>CTFs and workshops"]
        C2["Active students take<br/>every opportunity"]
        C3["Commitments are accepted<br/>without seeing their cost"]
        C4["Existing tools count hours only —<br/>not mental, physical or social cost"]
        C5["No feedback loop between<br/>the plan and how the week felt"]
    end

    PROBLEM["<b>THE PROBLEM</b><br/>Active students accumulate commitments<br/>past their real capacity, and only notice<br/>once they are already burnt out"]

    subgraph EFFECTS[" EFFECTS "]
        direction TB
        E1["Academic work slips<br/>while activities continue"]
        E2["Panic cramming<br/>during study week"]
        E3["Burnout at the<br/>end of semester"]
        E4["Dropping activities<br/>they genuinely cared about"]
        E5["Higher cognitive load<br/>measurably reduces retention"]
    end

    C1 --> PROBLEM
    C2 --> PROBLEM
    C3 --> PROBLEM
    C4 --> PROBLEM
    C5 --> PROBLEM

    PROBLEM --> E1
    PROBLEM --> E2
    PROBLEM --> E3
    PROBLEM --> E4
    PROBLEM --> E5

    style PROBLEM fill:#0F6B4F,color:#FFFFFF,stroke:#0F6B4F,stroke-width:2px
    style CAUSES fill:#F4E8D6,stroke:#C68A2E
    style EFFECTS fill:#F9E7E3,stroke:#D45F4E
```

---

## 3. User flow — setup through daily use
*(Ideation 8% + Design 2% "covers the core flow end-to-end")*

```mermaid
flowchart TD
    A([Welcome]) --> B["Tick your weekly routine<br/><i>Class and Assignment ticked by default</i>"]
    B --> C["Hours for each ticked item<br/><i>how long × how many times a week</i>"]
    C --> D["Personal limit questions<br/><i>only for loads you actually carry</i>"]
    D --> E["Import timetable"]
    E --> F["Pick which modules have assignments<br/><i>set start and due date, or 'set up later'</i>"]
    F --> G["Add commitment"]
    G --> H["Anything else about your week?<br/><i>free text, optional</i>"]
    H --> I["Loading — building your baseline"]
    I --> DASH

    DASH{{"DASHBOARD"}}
    DASH --> J["Energy left today<br/>+ total load"]
    DASH --> K["Daily check-in prompt"]
    DASH --> L["Flashcard banner<br/><i>today's topic from your timetable</i>"]
    DASH --> M["Make room in my plan"]
    DASH --> N["See if a new plan fits"]

    K --> K1["Mood · assignment plans ·<br/>gym or training · daily diary"]
    K1 --> DASH

    L --> L1["Flashcard page<br/><i>upload materials · browse by module,<br/>week, day or topic</i>"]

    N --> N1["Enter the possible commitment"]
    N1 --> N2["See before and after<br/>on all four capacities"]
    N2 --> N3{Decide}
    N3 -->|Add anyway| PLAN
    N3 -->|Decline| DASH
    N3 -->|Make room| M

    M --> M1["Each commitment gets a choice:<br/>keep as planned · move to another day ·<br/>ask someone to help · skip this time ·<br/>make it lighter"]
    M1 --> PLAN

    PLAN["PLAN — by day or by week<br/><i>routines and deadlines, sorted</i>"]
    LOAD["LOAD — where your week is going"]
    REC["RECOVER — matched to your highest load"]

    DASH <--> PLAN
    DASH <--> LOAD
    DASH <--> REC

    REC --> R1["Mark it done → how did it feel?"]

    HAM["☰ Hamburger<br/>daily / weekly toggle ·<br/>update schedule · assignments"]
    DASH -.-> HAM
    PLAN -.-> HAM

    style DASH fill:#0F6B4F,color:#FFFFFF,stroke:#0F6B4F,stroke-width:2px
    style A fill:#E6F2EC,stroke:#0F6B4F
    style PLAN fill:#E6F2EC,stroke:#0F6B4F
    style LOAD fill:#E6F2EC,stroke:#0F6B4F
    style REC fill:#E6F2EC,stroke:#0F6B4F
    style HAM fill:#F0EEE7,stroke:#65716B
```

---

## 4. Architecture
*(Feasibility 6% — "appropriate technologies, realistic implementation")*

```mermaid
flowchart LR
    subgraph CLIENT["📱 CLIENT — Android first"]
        RN["React Native<br/>TypeScript<br/>Expo Go"]
    end

    subgraph SERVER["🐳 SERVER — Docker on VPS"]
        API["FastAPI<br/>Python"]
        VAL["Pydantic<br/><i>request and response validation</i>"]
        ENG["Capacity engine<br/><i>load model · limits ·<br/>simulator · recovery matching</i>"]
    end

    subgraph DATA["💾 DATA"]
        PG[("PostgreSQL<br/><i>users · routines · commitments ·<br/>check-ins · flashcards</i>")]
    end

    subgraph AI["🤖 AI"]
        DS["DeepSeek API<br/><i>timetable parsing ·<br/>flashcard generation ·<br/>free-text understanding</i>"]
    end

    RN <-->|REST / JSON| API
    API --> VAL
    VAL --> ENG
    ENG <--> PG
    API <-->|slides, timetable| DS

    style CLIENT fill:#E6F2EC,stroke:#0F6B4F
    style SERVER fill:#F0F6F2,stroke:#173E32
    style DATA fill:#F0EEE7,stroke:#65716B
    style AI fill:#F4E8D6,stroke:#C68A2E
```

---

## 5. Iteration timeline — how the idea evolved
*(Ideation 7% — "multiple documented iterations, including dropped directions")*

```mermaid
flowchart TD
    V1["<b>Version 1</b><br/>Show workload, offer recovery.<br/>One goal: a manageable schedule"]
    V2["<b>Version 2</b><br/>Take the student's first input and<br/>assume it is the whole week"]
    V3["<b>3 Sep</b><br/>Add commitments<br/>and routine priority"]
    V4["<b>4 Sep</b><br/>Add the daily check-in —<br/>rescale today's energy<br/><i>a week is not static</i>"]
    V5["<b>6 Sep</b><br/>Add timetable import —<br/>AI reads it into load"]

    MEET1{"<b>6 Sep, night</b><br/>Honest review:<br/>this is still too generic.<br/>We have no moat"}

    D1["❌ <b>Microsoft Teams integration</b><br/>DROPPED → future<br/><i>university Teams accounts are<br/>admin-controlled; OAuth needs<br/>more time than we have</i>"]
    U1["✅ <b>New USP: daily flashcards</b><br/>from the student's own<br/>uploaded learning materials"]

    MEET2{"<b>10 Sep</b><br/>Final feature lock —<br/>held during our own<br/>final exam week"}

    D2["❌ <b>Community matching</b><br/>DROPPED → future<br/><i>too complex, and not the<br/>core problem yet</i>"]
    K1["✅ Flashcards — exposure, not revision"]
    K2["✅ Timetable stays, updated from hamburger"]
    K3["✅ Energy currency + streak avatar"]

    V6["<b>10 Sep</b><br/>Build starts"]
    V7["<b>12–13 Sep</b><br/>Full UX rewrite, page by page.<br/>5D replaced with plain words<br/>students actually use"]

    V1 --> V2 --> V3 --> V4 --> V5 --> MEET1
    MEET1 --> D1
    MEET1 --> U1
    U1 --> MEET2
    MEET2 --> D2
    MEET2 --> K1
    MEET2 --> K2
    MEET2 --> K3
    K1 --> V6
    K2 --> V6
    K3 --> V6
    V6 --> V7

    style MEET1 fill:#F4E8D6,stroke:#C68A2E,stroke-width:2px
    style MEET2 fill:#F4E8D6,stroke:#C68A2E,stroke-width:2px
    style D1 fill:#F9E7E3,stroke:#D45F4E
    style D2 fill:#F9E7E3,stroke:#D45F4E
    style U1 fill:#E6F2EC,stroke:#0F6B4F,stroke-width:2px
    style V7 fill:#0F6B4F,color:#FFFFFF,stroke:#0F6B4F
```

---

## 6. Mentor feedback → what we built
*(Ideation 7% — "feedback clearly documented and meaningfully incorporated")*

```mermaid
flowchart LR
    subgraph SAID["Faris Imran · Discord · 6 Sep"]
        F1["Gamify the daily check-in —<br/>encourage opening it every day"]
        F2["Incentives for the user"]
        F3["Visualise how the collected<br/>data benefits them"]
        F4["Daily deck note from<br/>learning materials"]
        F5["Find free time and suggest<br/>something useful to do"]
        F6["Find your moat — by user group,<br/>by unique features"]
    end

    subgraph BUILT["What we shipped"]
        B1["Pet and streak avatar"]
        B2["Energy currency, earned by<br/>staying inside capacity"]
        B3["Four capacity bars<br/>+ load breakdown"]
        B4["The flashcard USP"]
        B5["Recovery matched to<br/>whichever load is highest"]
        B6["Narrowed to competition-active<br/>students + flashcards as the moat"]
    end

    F1 --> B1
    F2 --> B2
    F3 --> B3
    F4 --> B4
    F5 --> B5
    F6 --> B6

    style SAID fill:#F0F6F2,stroke:#173E32
    style BUILT fill:#E6F2EC,stroke:#0F6B4F
    style B4 fill:#0F6B4F,color:#FFFFFF
    style B6 fill:#0F6B4F,color:#FFFFFF
```

**The line that matters:** he told us to find a moat on 6 September. The 10 September meeting
was us doing exactly that.

---

## 7. What the four capacities are, and why four
*(Creativity 7% + Impact 7%)*

```mermaid
flowchart TD
    COMM["One commitment<br/><i>e.g. a weekend hackathon</i>"]

    COMM --> T["⏱ TIME<br/>the hours it eats"]
    COMM --> M["🧠 MENTAL<br/>the focus it demands"]
    COMM --> P["💪 PHYSICAL<br/>what it costs your body"]
    COMM --> S["💬 SOCIAL<br/>the people-energy it takes"]

    T --> LIMIT["Each measured against<br/><b>your own limit</b>,<br/>not an average student's"]
    M --> LIMIT
    P --> LIMIT
    S --> LIMIT

    LIMIT --> WHY["<b>Why this matters:</b><br/>a calendar would say this<br/>commitment costs 16 hours.<br/>It cannot tell you the week is<br/>already mentally full"]

    style COMM fill:#F0EEE7,stroke:#65716B
    style T fill:#E6F2EC,stroke:#0F6B4F
    style M fill:#F9E7E3,stroke:#D45F4E
    style P fill:#F4E8D6,stroke:#C68A2E
    style S fill:#E9E6F8,stroke:#6F67B6
    style WHY fill:#0F6B4F,color:#FFFFFF,stroke:#0F6B4F,stroke-width:2px
```
