import { HifzQuestion } from "../types";
import { aya } from "@/src/features/quran/database/quranAssetSchema";
import { eq, sql, and, ne } from "drizzle-orm";

const shuffle = (array: any[]) => array.sort(() => Math.random() - 0.5);

export const generateHifzTest = async (db: any, completedPages: number[]) => {
  if (!db) throw new Error("Database connection not provided");
  if (!completedPages || completedPages.length === 0) return [];

  try {
      const pageCount = completedPages.length;
    const totalQuestions = Math.min(Math.max(pageCount * 2, 3), 15);
    const questionsPerType = Math.floor(totalQuestions / 3); 
    const queue: HifzQuestion[] = [];

    const getRandomPage = () => completedPages[Math.floor(Math.random() * completedPages.length)];

    const ayaSubquery = db.select({
        soraid: aya.soraid,
        ayaid: aya.ayaid,
        page: aya.page,
        text: aya.text,
        prev_text: sql<string>`LAG(${aya.text}) OVER (ORDER BY ${aya.soraid}, ${aya.ayaid})`.as('prev_text'),
        next_text: sql<string>`LEAD(${aya.text}) OVER (ORDER BY ${aya.soraid}, ${aya.ayaid})`.as('next_text'),
    }).from(aya).as('a');

    for (let i = 0; i < questionsPerType; i++) {
        try {
            const page = getRandomPage();
            const [data] = await db.select()
                .from(ayaSubquery)
                .where(eq(ayaSubquery.page, page))
                .orderBy(sql`RANDOM()`)
                .limit(1);

            if (data) {
                queue.push({
                    type: 'SEQUENCE',
                    question: data.text,
                    answer: {
                        previous: data.prev_text || "Beginning of Quran",
                        next: data.next_text || "End of Quran"
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
            const page = getRandomPage();
            const [boundaryData] = await db.select({
                current_text: aya.text,
                soraid: aya.soraid,
                ayaid: aya.ayaid,
                page: aya.page,
                page_start: sql<string>`(SELECT text FROM aya WHERE page = ${page} ORDER BY soraid ASC, ayaid ASC LIMIT 1)`,
                page_end: sql<string>`(SELECT text FROM aya WHERE page = ${page} ORDER BY soraid DESC, ayaid DESC LIMIT 1)`,
            })
            .from(aya)
            .where(eq(aya.page, page))
            .orderBy(sql`RANDOM()`)
            .limit(1);

            if (boundaryData) {
                queue.push({
                    type: 'BOUNDARY',
                    question: boundaryData.current_text,
                    answer: {
                        start: boundaryData.page_start,
                        end: boundaryData.page_end
                    },
                    hint: `This Ayah is on page ${boundaryData.page}`
                });
            }
        } catch (innerError) {
            console.warn("Failed Boundary question:", innerError);
        }
    }

    // 3. CHOICE Questions (Multiple Choice)
    for (let i = 0; i < questionsPerType; i++) {
        try {
            const page = getRandomPage();
            const [data] = await db.select({
                text: aya.text,
                soraid: aya.soraid,
                ayaid: aya.ayaid,
                next_text: sql<string>`(SELECT text FROM aya WHERE soraid = ${aya.soraid} AND ayaid = ${aya.ayaid} + 1)`,
            })
            .from(aya)
            .where(eq(aya.page, page))
            .orderBy(sql`RANDOM()`)
            .limit(1);

            if (data && data.next_text) {
                const distractors = await db.select({ text: aya.text })
                    .from(aya)
                    .where(ne(aya.page, page))
                    .orderBy(sql`RANDOM()`)
                    .limit(2);

                queue.push({
                    type: 'CHOICE',
                    question: data.text,
                    answer: {
                        correct: data.next_text,
                        options: shuffle([data.next_text, ...distractors.map((d: any) => d.text)])
                    },
                    hint: "Pick the next Ayah"
                });
            }
        } catch (innerError) {
            console.warn("Failed Choice question:", innerError);
        }
    }


    return shuffle(queue);

  } catch (error) {
    console.error("Critical Error in generateHifzTest:", error);
    throw error; 
  }
};