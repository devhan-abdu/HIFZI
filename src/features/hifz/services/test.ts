import { HifzQuestion } from "../types";

const shuffle = (array: any[]) => array.sort(() => Math.random() - 0.5);

export const generateHifzTest = async (db: any, completedPages: number[]) => {
  if (!db) throw new Error("Database connection not provided");
  if (!completedPages || completedPages.length === 0) return [];

  try {
    const pageCount = completedPages.length;
    const totalQuestions = pageCount >= 30 ? 15 : pageCount > 20 ? 12 : pageCount > 10 ? 10 : 6;
    const questionsPerType = Math.floor(totalQuestions / 2);
    const queue: HifzQuestion[] = [];

    const getRandomPage = () => completedPages[Math.floor(Math.random() * completedPages.length)];

    for (let i = 0; i < questionsPerType; i++) {
        try {
            const page = getRandomPage();
            const data = await db.getFirstAsync(
                `SELECT * FROM (
                    SELECT 
                        soraid, 
                        ayaid, 
                        page,
                        text,
                        LAG(text) OVER (ORDER BY soraid, ayaid) as prev_text,
                        LEAD(text) OVER (ORDER BY soraid, ayaid) as next_text
                    FROM aya
                ) 
                WHERE page = ? 
                ORDER BY RANDOM() 
                LIMIT 1`, 
                [page]
            );

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

    for (let i = 0; i < questionsPerType; i++) {
        try {
            const page = getRandomPage();
            
            const boundaryData = await db.getFirstAsync(
                `SELECT 
                    main.text AS current_text, -- Fixed typo: currunt -> current
                    main.soraid, 
                    main.ayaid, 
                    main.page,
                    (SELECT text FROM aya WHERE page = main.page ORDER BY soraid ASC, ayaid ASC LIMIT 1) AS page_start,
                    (SELECT text FROM aya WHERE page = main.page ORDER BY soraid DESC, ayaid DESC LIMIT 1) AS page_end
                FROM aya AS main
                WHERE main.page = ? 
                ORDER BY RANDOM() 
                LIMIT 1`, 
                [page]
            );

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

    return shuffle(queue);

  } catch (error) {
    console.error("Critical Error in generateHifzTest:", error);
    throw error; 
  }
};