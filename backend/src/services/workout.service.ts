import { prisma } from "../config/database";

export class WorkoutService {
  static async listPrograms(params: { memberId?: string; trainerId?: string; isTemplate?: boolean }) {
    const where: any = {};
    if (params.memberId) where.memberId = params.memberId;
    if (params.trainerId) where.trainerId = params.trainerId;
    if (params.isTemplate !== undefined) where.isTemplate = params.isTemplate;

    return prisma.workoutProgram.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        trainer: {
          include: {
            user: { select: { firstName: true, lastName: true, avatarUrl: true } },
          },
        },
        exercises: {
          orderBy: [{ dayNumber: "asc" }, { orderIndex: "asc" }],
        },
      },
    });
  }

  static async createProgram(data: {
    title: string;
    description: string;
    trainerId?: string;
    memberId?: string;
    difficulty?: string;
    goal: string;
    durationWeeks?: number;
    isTemplate?: boolean;
    exercises: {
      dayNumber: number;
      exerciseName: string;
      muscleGroup: string;
      sets: number;
      reps: number;
      weightTargetKg?: number;
      durationSeconds?: number;
      restSeconds?: number;
      orderIndex?: number;
      notes?: string;
    }[];
  }) {
    return prisma.workoutProgram.create({
      data: {
        title: data.title,
        description: data.description,
        trainerId: data.trainerId || null,
        memberId: data.memberId || null,
        difficulty: data.difficulty || "intermediate",
        goal: data.goal,
        durationWeeks: data.durationWeeks || 4,
        isTemplate: data.isTemplate ?? false,
        exercises: {
          create: data.exercises.map((ex, idx) => ({
            dayNumber: ex.dayNumber,
            exerciseName: ex.exerciseName,
            muscleGroup: ex.muscleGroup,
            sets: ex.sets,
            reps: ex.reps,
            weightTargetKg: ex.weightTargetKg || null,
            durationSeconds: ex.durationSeconds || null,
            restSeconds: ex.restSeconds || 60,
            orderIndex: ex.orderIndex ?? idx,
            notes: ex.notes || null,
          })),
        },
      },
      include: {
        exercises: true,
      },
    });
  }

  static async logWorkout(data: {
    memberId: string;
    programId?: string;
    workoutName: string;
    durationMinutes: number;
    caloriesBurned?: number;
    overallNotes?: string;
    rating?: number;
    entries: {
      exerciseName: string;
      muscleGroup: string;
      setNumber: number;
      repsCompleted: number;
      weightKg?: number;
      notes?: string;
    }[];
  }) {
    // Determine PRs for each exercise entry
    // A personal record is achieved if weightKg is higher than any previously logged weight for this exercise by this member
    const processedEntries = [];
    let prsAchieved = 0;

    for (const entry of data.entries) {
      let isPersonalRecord = false;
      if (entry.weightKg && entry.weightKg > 0) {
        const previousMax = await prisma.workoutLogEntry.findFirst({
          where: {
            exerciseName: entry.exerciseName,
            workoutLog: { memberId: data.memberId },
          },
          orderBy: { weightKg: "desc" },
          select: { weightKg: true },
        });

        if (!previousMax || (previousMax.weightKg && Number(previousMax.weightKg) < entry.weightKg)) {
          isPersonalRecord = true;
          prsAchieved++;
        }
      }

      processedEntries.push({
        exerciseName: entry.exerciseName,
        muscleGroup: entry.muscleGroup,
        setNumber: entry.setNumber,
        repsCompleted: entry.repsCompleted,
        weightKg: entry.weightKg || null,
        isPersonalRecord,
        notes: entry.notes || null,
      });
    }

    const log = await prisma.workoutLog.create({
      data: {
        memberId: data.memberId,
        programId: data.programId || null,
        workoutName: data.workoutName,
        durationMinutes: data.durationMinutes,
        caloriesBurned: data.caloriesBurned || null,
        overallNotes: data.overallNotes || null,
        rating: data.rating || 5,
        entries: {
          create: processedEntries,
        },
      },
      include: {
        entries: true,
      },
    });

    // Reward member for completing workout (+20 coins) + PR bonus (+25 coins per PR!)
    const totalRewardCoins = 20 + prsAchieved * 25;
    await prisma.member.update({
      where: { id: data.memberId },
      data: { rewardCoins: { increment: totalRewardCoins } },
    });

    await prisma.rewardTransaction.create({
      data: {
        memberId: data.memberId,
        points: totalRewardCoins,
        transactionType: "earned",
        reason: prsAchieved > 0
          ? `Workout completed with ${prsAchieved} Personal Record(s)!`
          : "Workout session completed",
        referenceId: log.id,
      },
    });

    return {
      log,
      prsAchieved,
      rewardCoinsEarned: totalRewardCoins,
    };
  }

  static async getWorkoutLogs(memberId: string, limit: number = 20) {
    return prisma.workoutLog.findMany({
      where: { memberId },
      take: limit,
      orderBy: { date: "desc" },
      include: {
        entries: true,
        program: { select: { title: true } },
      },
    });
  }

  static async getPersonalRecords(memberId: string) {
    const entries = await prisma.workoutLogEntry.findMany({
      where: {
        workoutLog: { memberId },
        isPersonalRecord: true,
      },
      orderBy: { weightKg: "desc" },
      include: {
        workoutLog: { select: { date: true, workoutName: true } },
      },
    });

    return entries;
  }
}
