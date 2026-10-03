import { prisma } from "../config/database";

export class MeasurementService {
  static async recordMeasurement(data: {
    memberId: string;
    weightKg: number;
    heightCm: number;
    bodyFatPercentage?: number;
    muscleMassKg?: number;
    chestCm?: number;
    waistCm?: number;
    hipsCm?: number;
    armCm?: number;
    thighCm?: number;
    photoUrl?: string;
    notes?: string;
    recordedByUserId?: string;
  }) {
    // Calculate BMI = weight (kg) / [height (m)]^2
    const heightM = data.heightCm / 100;
    const bmi = Number((data.weightKg / (heightM * heightM)).toFixed(2));

    const measurement = await prisma.bodyMeasurement.create({
      data: {
        memberId: data.memberId,
        weightKg: data.weightKg,
        heightCm: data.heightCm,
        bmi,
        bodyFatPercentage: data.bodyFatPercentage || null,
        muscleMassKg: data.muscleMassKg || null,
        chestCm: data.chestCm || null,
        waistCm: data.waistCm || null,
        hipsCm: data.hipsCm || null,
        armCm: data.armCm || null,
        thighCm: data.thighCm || null,
        photoUrl: data.photoUrl || null,
        notes: data.notes || null,
        recordedByUserId: data.recordedByUserId || null,
      },
    });

    return measurement;
  }

  static async getMemberMeasurements(memberId: string) {
    const measurements = await prisma.bodyMeasurement.findMany({
      where: { memberId },
      orderBy: { recordedDate: "asc" },
    });

    if (measurements.length === 0) {
      return {
        initial: null,
        current: null,
        history: [],
        weightChangeKg: 0,
        bmiChange: 0,
      };
    }

    const initial = measurements[0];
    const current = measurements[measurements.length - 1];

    const weightChangeKg = Number((Number(current.weightKg) - Number(initial.weightKg)).toFixed(2));
    const bmiChange = Number((Number(current.bmi) - Number(initial.bmi)).toFixed(2));

    return {
      initial,
      current,
      history: measurements,
      weightChangeKg,
      bmiChange,
    };
  }
}
