# Uthyrarens svarstid

SCRUM-153 använder faktisk meddelandehistorik i Supabase och inget hårdkodat standardvärde.

- Mätperiod: senaste 90 dagarna.
- Underlag: bokningskonversationer där användaren är uthyrare.
- Start: första manuella meddelandet från motparten efter att ingen obesvarad motpartssekvens redan pågår.
- Svar: uthyrarens nästa manuella meddelande i samma bokningskonversation.
- Flera motpartsmeddelanden före svaret räknas som en och samma väntetid.
- Systemnotiser räknas inte eftersom de inte lagras som `booking_messages` från uthyraren.
- Svar senare än 72 timmar exkluderas som extrema/icke-representativa värden.
- Minst tre kvalificerade svar krävs. Annars visas neutralt läge: `Inte tillräckligt med data`.
- Värdet är aritmetiskt medel av kvalificerade svarstider och avrundas till hela minuter.
- Samma formatteringsfunktion används på annonsens uthyrarkort och den publika profilsidan.

Intervall: några minuter, 15 min, 30 min, 1 h, 3 h, 12 h, 1 dag, några dagar. Svenska och engelska använder samma gränser.
