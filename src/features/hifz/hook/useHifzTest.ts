import { useSQLiteContext } from "expo-sqlite"
import { useEffect, useState } from "react";
import { HifzQuestion } from "../types";
import { generateHifzTest } from "../services/test";

export const  useHifzTest = (pages: number[]) => {
    const db = useSQLiteContext()
    const [questions, setQuestions] = useState<HifzQuestion[]>([]);
    const [refreshKey, setRefreshKey] = useState(0);
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    

    const refresh = () => setRefreshKey(prev => prev + 1);

    useEffect(() => {
        const initTest = async () => {
            if (pages.length === 0) {
                setLoading(false)
                return
            }
            
            try {
                setLoading(true)
                const data = await generateHifzTest(db, pages)
                setQuestions(data)
            } catch (e) {
               setError("Failed to generate test");
               console.error(e);
            } finally {
                setLoading(false)
            }
        }
        
        initTest()
    }, [pages,refreshKey])

    return { questions, loading, error, refresh };
}