import { HifzQuestion } from "../types";
import { aya } from "@/src/features/quran/database/quranAssetSchema";
import { eq, sql, and, ne, like, desc, asc } from "drizzle-orm";

const shuffle = (array: any[]) => array.sort(() => Math.random() - 0.5);

export const generateHifzTest = async (
  db: any, 
  completedPages: number[],
  pagePerformance?: Record<number, { score: number; attempts: number; lastTested: string }>
) => {
  if (!db) throw new Error("Database connection not provided");
  if (!completedPages || completedPages.length === 0) return [];

  try {
    const pageCount = completedPages.length;
    // Scale question count: e.g. min 3, max 15. More pages = more questions.
    const totalQuestions = Math.min(Math.max(Math.floor(pageCount * 1.5), 3), 15);
    const questionsPerType = Math.ceil(totalQuestions / 3); 
    const queue: HifzQuestion[] = [];

    // Smart Page Selection
    const selectPage = () => {
      if (!pagePerformance || Object.keys(pagePerformance).length === 0) {
        return completedPages[Math.floor(Math.random() * completedPages.length)];
      }

      // Calculate weights based on score and staleness
      const weights = completedPages.map(page => {
        const perf = pagePerformance[page];
        if (!perf) return 10; // Neutral baseline weight

        const daysSinceLastTest = (Date.now() - new Date(perf.lastTested).getTime()) / (1000 * 60 * 60 * 24);
        const stalenessMultiplier = Math.min(daysSinceLastTest / 7, 3); // Max 3x weight for old pages
        const scoreInvert = Math.max(0, 100 - perf.score) / 10; // Max +10 weight for low scores

        return Math.max(1, (10 + scoreInvert) * stalenessMultiplier);
      });

      const totalWeight = weights.reduce((a, b) => a + b, 0);
      let randomVal = Math.random() * totalWeight;

      for (let i = 0; i < weights.length; i++) {
        randomVal -= weights[i];
        if (randomVal <= 0) return completedPages[i];
      }
      return completedPages[Math.floor(Math.random() * completedPages.length)];
    };

    // 1. SEQUENCE Questions
    const sequenceQuery = db.select({
      soraid: aya.soraid,
      ayaid: aya.ayaid,
      page: aya.page,
      text: aya.text,
      prev_text: sql<string>`LAG(${aya.text}) OVER (ORDER BY ${aya.soraid}, ${aya.ayaid})`.as('prev_text'),
      next_text: sql<string>`LEAD(${aya.text}) OVER (ORDER BY ${aya.soraid}, ${aya.ayaid})`.as('next_text'),
      prev_soraid: sql<number>`LAG(${aya.soraid}) OVER (ORDER BY ${aya.soraid}, ${aya.ayaid})`.as('prev_soraid'),
      next_soraid: sql<number>`LEAD(${aya.soraid}) OVER (ORDER BY ${aya.soraid}, ${aya.ayaid})`.as('next_soraid'),
    }).from(aya).as('a');

    for (let i = 0; i < questionsPerType; i++) {
      try {
        const page = selectPage();
        const [data] = await db.select()
          .from(sequenceQuery)
          .where(eq(sequenceQuery.page, page))
          .orderBy(sql`RANDOM()`)
          .limit(1);

        if (data) {
          queue.push({
            type: 'SEQUENCE',
            question: data.text,
            page: data.page,
            currentSoraid: data.soraid,
            answer: {
              previous: data.prev_text || "Beginning of Quran",
              next: data.next_text || "End of Quran",
              prevSoraid: data.prev_soraid,
              nextSoraid: data.next_soraid
            },
            hint: `Surah ${data.soraid}:${data.ayaid}` 
          });
        }
      } catch (innerError) {
        console.warn("Failed Sequence question:", innerError);
      }
    }     

    // 2. BOUNDARY Questions
    for (let i = 0; i < questionsPerType; i++) {
      try {
        const page = selectPage();
        const [boundaryData] = await db.select({
          current_text: aya.text,
          soraid: aya.soraid,
          ayaid: aya.ayaid,
          page: aya.page,
          page_start: sql<string>`(SELECT text FROM aya WHERE page = ${page} ORDER BY soraid ASC, ayaid ASC LIMIT 1)`,
          page_start_soraid: sql<number>`(SELECT soraid FROM aya WHERE page = ${page} ORDER BY soraid ASC, ayaid ASC LIMIT 1)`,
          page_end: sql<string>`(SELECT text FROM aya WHERE page = ${page} ORDER BY soraid DESC, ayaid DESC LIMIT 1)`,
          page_end_soraid: sql<number>`(SELECT soraid FROM aya WHERE page = ${page} ORDER BY soraid DESC, ayaid DESC LIMIT 1)`,
        })
        .from(aya)
        .where(eq(aya.page, page))
        .orderBy(sql`RANDOM()`)
        .limit(1);

        if (boundaryData) {
          const crossesSurah = boundaryData.page_start_soraid !== boundaryData.page_end_soraid;
          let startAyah = boundaryData.page_start;
          let endAyah = boundaryData.page_end;

          if (crossesSurah) {
             const [lastAyahLowerSora] = await db.select({text: aya.text}).from(aya)
               .where(and(eq(aya.page, page), eq(aya.soraid, boundaryData.page_start_soraid)))
               .orderBy(desc(aya.ayaid)).limit(1);
             const [firstAyahHigherSora] = await db.select({text: aya.text}).from(aya)
               .where(and(eq(aya.page, page), eq(aya.soraid, boundaryData.page_end_soraid)))
               .orderBy(asc(aya.ayaid)).limit(1);
               
             startAyah = lastAyahLowerSora?.text || startAyah;
             endAyah = firstAyahHigherSora?.text || endAyah;
          }

          queue.push({
            type: 'BOUNDARY',
            question: boundaryData.current_text,
            page: boundaryData.page,
            crossesSurah,
            answer: {
              start: startAyah,
              end: endAyah
            },
            hint: `This Ayah is on page ${boundaryData.page}`
          });
        }
      } catch (innerError) {
        console.warn("Failed Boundary question:", innerError);
      }
    }

    // 3. CHOICE Questions (Mutashabihat Engine)
    for (let i = 0; i < questionsPerType; i++) {
      try {
        const page = selectPage();
        const [data] = await db.select({
          text: aya.text,
          soraid: aya.soraid,
          ayaid: aya.ayaid,
          page: aya.page,
          next_text: sql<string>`(SELECT text FROM aya WHERE soraid = ${aya.soraid} AND ayaid = ${aya.ayaid} + 1 LIMIT 1)`,
        })
        .from(aya)
        .where(eq(aya.page, page))
        .orderBy(sql`RANDOM()`)
        .limit(1);

        if (data && data.next_text) {
          let distractors: any[] = [];
          
          // Fallback 1: Mutashabihat (first 3 words match)
          const first3Words = data.next_text.split(' ').slice(0, 3).join(' ');
          if (first3Words) {
            distractors = await db.select({ text: aya.text })
              .from(aya)
              .where(and(like(aya.text, `${first3Words}%`), ne(aya.page, page)))
              .orderBy(sql`RANDOM()`)
              .limit(3);
          }

          // Fallback 2: Same surah, different page
          if (distractors.length < 3) {
            const sameSurah = await db.select({ text: aya.text })
              .from(aya)
              .where(and(eq(aya.soraid, data.soraid), ne(aya.page, page)))
              .orderBy(sql`RANDOM()`)
              .limit(3 - distractors.length);
            distractors = [...distractors, ...sameSurah];
          }

          // Fallback 3: Last 3 words match
          if (distractors.length < 3) {
             const words = data.next_text.split(' ');
             const last3Words = words.slice(-3).join(' ');
             if (last3Words) {
               const sameEnd = await db.select({ text: aya.text })
                 .from(aya)
                 .where(and(like(aya.text, `%${last3Words}`), ne(aya.page, page)))
                 .orderBy(sql`RANDOM()`)
                 .limit(3 - distractors.length);
               distractors = [...distractors, ...sameEnd];
             }
          }

          // Fallback 4: Random
          if (distractors.length < 3) {
             const randomFallback = await db.select({ text: aya.text })
               .from(aya)
               .where(ne(aya.page, page))
               .orderBy(sql`RANDOM()`)
               .limit(3 - distractors.length);
             distractors = [...distractors, ...randomFallback];
          }

          // Ensure exactly 3 unique distractors if available, else standard fallback
          const uniqueDistractors = Array.from(new Set(distractors.map(d => d.text))).slice(0, 3);
          
          queue.push({
            type: 'CHOICE',
            question: data.text,
            page: data.page,
            answer: {
              correct: data.next_text,
              options: shuffle([data.next_text, ...uniqueDistractors])
            },
            hint: "Pick the next Ayah"
          });
        }
      } catch (innerError) {
        console.warn("Failed Choice question:", innerError);
      }
    }

    return shuffle(queue).slice(0, totalQuestions);

  } catch (error) {
    console.error("Critical Error in generateHifzTest:", error);
    throw error; 
  }
};