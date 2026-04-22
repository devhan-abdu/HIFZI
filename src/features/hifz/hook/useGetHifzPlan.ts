import { useSession } from "@/src/hooks/useSession"
import { useQuery } from "@tanstack/react-query";
import { hifzServices } from "../services/hifz";
import { useSQLiteContext } from "expo-sqlite";
;

export const useGetHifzPlan = () => {
    const { user } = useSession()
    const db = useSQLiteContext()

    const { data: hifz, isLoading, isError, refetch } = useQuery({
        queryKey: ["hifz", user?.id],
        queryFn: () => {
            if (!user?.id) return null;
            return hifzServices.getplan(db, user.id)
        },
        enabled: !!user?.id 
    })

    return {
        hifz,
        isLoading,
        error: isError,
         refetch,
    }
}