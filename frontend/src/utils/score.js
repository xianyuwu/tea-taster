/** 计算茶样总分 */
export const calcTotalScore = (tea) =>
  Object.values(tea.scores || {}).reduce((sum, v) => sum + (Number(v) || 0), 0);
