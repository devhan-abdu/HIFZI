
export function checkMurajaCompletion(plan: any, latestLog: any): boolean {
    if (!plan || !latestLog) return false;
    
    const startPage = latestLog.startPage ?? 0;
    const completedPages = latestLog.completedPages ?? 0;
    const endPageReached = startPage + (completedPages > 0 ? completedPages - 1 : 0);
    
    const isTargetMet = endPageReached >= (plan.endPage ?? 0);
    const isLogSuccess = latestLog.status === 'completed' || latestLog.status === 'partial';

    return isTargetMet && isLogSuccess;
}


export function checkHifzCompletion(plan: any, latestLog: any): boolean {
    if (!plan || !latestLog) return false;
    
    const actualEndPage = latestLog.actualEndPage ?? 0;
    const targetEndPage = plan.direction === 'forward' 
        ? (plan.startPage + plan.totalPages - 1)
        : (plan.startPage - plan.totalPages + 1);

    const isLogSuccess = latestLog.status === 'completed' || latestLog.status === 'partial';

    if (plan.direction === 'forward') {
        return (actualEndPage >= targetEndPage) && isLogSuccess;
    } else {
        return (actualEndPage <= targetEndPage) && isLogSuccess;
    }
}
