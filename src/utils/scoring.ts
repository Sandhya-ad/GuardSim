import type { HudScores, MissionResult } from '../types';

const round = (value: number): number => Math.round(value);

export const calculateMissionResult = (scores: HudScores[]): MissionResult => {
  const total = scores.length || 1;
  const sums = scores.reduce(
    (acc, cur) => {
      acc.legalRisk += cur.legalRisk;
      acc.safetyRisk += cur.safetyRisk;
      acc.professionalism += cur.professionalism;
      acc.situationControl += cur.situationControl;
      acc.documentationReadiness += cur.documentationReadiness;
      return acc;
    },
    { legalRisk: 0, safetyRisk: 0, professionalism: 0, situationControl: 0, documentationReadiness: 0 },
  );

  const legalScore = round(100 - sums.legalRisk / total);
  const safetyScore = round(100 - sums.safetyRisk / total);
  const professionalismScore = round(sums.professionalism / total);
  const situationControlScore = round(sums.situationControl / total);
  const documentationScore = round(sums.documentationReadiness / total);

  const overallReadiness = round(
    legalScore * 0.25 +
      safetyScore * 0.25 +
      professionalismScore * 0.2 +
      situationControlScore * 0.15 +
      documentationScore * 0.15,
  );

  const weakTopics: string[] = [];
  if (legalScore < 65) weakTopics.push('legal authority, arrest decision-making, search and seizure');
  if (safetyScore < 65) weakTopics.push('personal safety and emergency response');
  if (professionalismScore < 65) weakTopics.push('professional conduct and communication');
  if (situationControlScore < 65) weakTopics.push('access control and escalation handling');
  if (documentationScore < 65) weakTopics.push('notebooks, statements, and reports');

  return {
    overallReadiness,
    legalScore,
    safetyScore,
    professionalismScore,
    situationControlScore,
    documentationScore,
    weakTopics,
  };
};
