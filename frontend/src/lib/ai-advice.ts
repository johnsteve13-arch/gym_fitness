/**
 * Boot Camp Fitness - AI Fitness Coach Specific Advice Generator
 * Generates specific, context-rich, biomechanically sound, and actionable advice
 * for athlete queries across splits, exercises, nutrition, recovery, and coin rewards.
 */

export function generateSpecificAdvice(
  userQuery: string,
  memberName: string = "Athlete",
  goals: string = "Hypertrophy and Athletic Conditioning",
  bmi: number | null = 24.2,
  focusArea?: string,
  rewardCoins: number = 450
): string {
  const q = (userQuery || "").toLowerCase().trim();

  // 1. 4-Day Upper / Lower Split
  if (
    q.includes("4-day") ||
    q.includes("4 day") ||
    (q.includes("upper") && q.includes("lower")) ||
    (q.includes("split") && q.includes("4"))
  ) {
    return `🎯 Specific 4-Day Upper / Lower Hypertrophy & Performance Split for ${memberName}:

📅 Day 1 — Upper Body (Heavy Mechanical Tension):
• Barbell Bench Press: 4 sets × 5-6 reps (2-3 min rest, 1-2 RIR)
• Barbell Bent-Over Row: 4 sets × 6-8 reps (90-120s rest)
• Standing Overhead Barbell Press: 3 sets × 6-8 reps
• Neutral-Grip Lat Pulldown or Weighted Pull-up: 3 sets × 8-10 reps
• Cable Face Pulls: 3 sets × 15 reps (rear delt & rotator cuff health)

📅 Day 2 — Lower Body (Quad & Hip Hinge Power):
• Barbell Back Squat: 4 sets × 5-6 reps (brace with 360° intra-abdominal pressure)
• Romanian Deadlift (RDL): 3 sets × 8-10 reps (slow 3-second eccentric stretch)
• Bulgarian Split Squat: 3 sets × 8-10 reps per leg (hypertrophy & pelvic stability)
• Standing Calf Raises: 4 sets × 10-12 reps (full 2-second stretch at bottom)

📅 Day 3 — Active Recovery / Rest:
• 20-30 min Zone 2 cardio (brisk incline walk / light spin) + 15 min hip & thoracic mobility.

📅 Day 4 — Upper Body (Metabolic Stress & Hypertrophy):
• Incline Dumbbell Bench Press (30° angle): 4 sets × 8-12 reps
• Chest-Supported T-Bar Row: 3 sets × 10-12 reps (peak contraction squeeze)
• Cable Lateral Raises: 4 sets × 12-15 reps (constant tension on lateral delts)
• Incline Dumbbell Bicep Curls: 3 sets × 10-12 reps (long-head peak)
• Overhead Cable Tricep Rope Extension: 3 sets × 12-15 reps (triceps long head)

📅 Day 5 — Lower Body (Glute & Posterior Chain Focus):
• Leg Press (feet mid-stance): 4 sets × 10-12 reps
• Seated or Lying Hamstring Curls: 4 sets × 10-12 reps
• Walking Dumbbell Lunges: 3 sets × 12 steps per leg
• Hanging Knee/Leg Raises: 3 sets × 12-15 reps (core anti-extension)

📅 Days 6 & 7 — Systemic Recovery & Meal Prep.

💡 Progression Rule: Use the Double Progression method. When you hit the top of the rep range on all sets with pristine technique, add 2.5 kg on upper lifts and 5 kg on lower lifts next week.
🪙 Boot Camp Fitness Tip: You can book a 1-on-1 coach to check your squat bar path and bench technique using your Loyalty Coins at /member/trainers!`;
  }

  // 2. 3-Day or 6-Day Push / Pull / Legs (PPL) Split
  if (
    q.includes("ppl") ||
    q.includes("push pull legs") ||
    q.includes("push/pull/legs") ||
    (q.includes("3-day") && q.includes("split")) ||
    (q.includes("3 day") && q.includes("split")) ||
    (q.includes("6-day") && q.includes("split")) ||
    (q.includes("6 day") && q.includes("split"))
  ) {
    return `🎯 Specific Push / Pull / Legs (PPL) Periodized Blueprint for ${memberName}:

🔥 Push Day (Chest, Anterior/Lateral Deltoids, Triceps):
• Flat Barbell or Dumbbell Bench Press: 4 sets × 6-8 reps (chest foundation)
• 30° Incline Dumbbell Press: 3 sets × 8-10 reps (upper clavicular pec head)
• Seated Dumbbell Overhead Shoulder Press: 3 sets × 8-10 reps
• Cable Lateral Raises: 4 sets × 12-15 reps (lead with elbows, slight forward torso angle)
• Cable Rope Tricep Pushdown: 3 sets × 12 reps + Overhead Tricep Extension: 3 sets × 12 reps

🔥 Pull Day (Lat Width, Upper Back Thickness, Rear Delts, Biceps):
• Weighted Pull-Ups or Lat Pulldown: 4 sets × 6-8 reps (drive elbows straight to hips)
• Barbell or Chest-Supported Row: 4 sets × 8-10 reps (scapular retraction)
• Incline Chest-Supported Rear Delt Flyes: 3 sets × 15 reps
• Incline Dumbbell Bicep Curls: 3 sets × 10-12 reps (maximum bicep stretch)
• Dumbbell Hammer Curls: 3 sets × 10-12 reps (brachialis thickness & forearm grip)

🔥 Legs Day (Quads, Hamstrings, Glutes, Calves):
• Barbell Back Squat or Hack Squat: 4 sets × 6-8 reps
• Romanian Deadlift (RDL): 4 sets × 8-10 reps (soft knees, hinge back until hamstrings load)
• Leg Extensions: 3 sets × 12-15 reps (3-second eccentric burn)
• Lying Hamstring Curls: 3 sets × 10-12 reps
• Standing Calf Raises: 4 sets × 12-15 reps

💡 Weekly Frequency: Run this as a 3-Day split (Mon Push, Wed Pull, Fri Legs) or a 6-Day rotating cycle (PPL-Rest-PPL).
📊 RPE Guide: Stop each working set at RIR 1-2 (Reps in Reserve). Never train to joint-compromising technical failure on primary barbell movements.`;
  }

  // 3. 5-Day Body-part / Bro Split
  if (
    q.includes("5-day") ||
    q.includes("5 day") ||
    q.includes("bro split") ||
    (q.includes("split") && q.includes("5"))
  ) {
    return `🎯 Specific 5-Day High-Volume Body-Part Specialization Split for ${memberName}:

• Day 1 (Chest & Calves): Flat Barbell Bench 4×6, Incline DB Press 4×8-10, Weighted Dips 3×10, Cable Flyes 3×15, Standing Calf Raises 5×12.
• Day 2 (Back & Abs): Deadlifts 3×5, Pull-ups 4×8, T-Bar Row 4×10, Close-Grip Lat Pulldown 3×12, Hanging Leg Raises 4×15.
• Day 3 (Shoulders & Traps): Overhead Press 4×6, Dumbbell Lateral Raises 5×12-15, Face Pulls 4×15, Dumbbell Shrugs 3×12 (2-sec squeeze).
• Day 4 (Legs Quad & Hamstring): Barbell Squats 4×6, Romanian Deadlifts 4×8, Bulgarian Split Squats 3×10/leg, Seated Leg Curls 3×12, Leg Extensions 3×15.
• Day 5 (Arms - Biceps & Triceps Antagonist Superset):
  - Superset 1: Close-Grip Bench Press (4×8) + Barbell Bicep Curl (4×8)
  - Superset 2: Skullcrushers (3×10) + Incline DB Hammer Curls (3×10)
  - Superset 3: Cable Tricep Pushdown (3×15) + Cable Preacher Curls (3×15)
• Days 6 & 7 (Rest, Sauna, Hyper-Hydration & Full Recovery).

💡 Volume Note: Maintain 12-18 total working sets per muscle group across the week to remain in the hyper-trophic sweet spot without inducing systemic overreaching.`;
  }

  // 4. Full Body Split (3 Days)
  if (
    q.includes("full body") ||
    q.includes("full-body") ||
    (q.includes("3 day") && q.includes("full")) ||
    (q.includes("3-day") && q.includes("full"))
  ) {
    return `🎯 Specific 3-Day Full Body Athletic Hypertrophy Split for ${memberName}:

📅 Monday — Full Body A (Squat & Horizontal Focus):
• Barbell Back Squat: 3 sets × 6-8 reps (rest 2.5 min)
• Barbell Flat Bench Press: 3 sets × 6-8 reps (rest 2 min)
• Barbell Bent-Over Row: 3 sets × 8-10 reps (rest 90s)
• Dumbbell Romanian Deadlift: 3 sets × 10 reps
• Overhead Tricep Extension: 3 sets × 12 reps

📅 Wednesday — Full Body B (Hinge & Vertical Focus):
• Conventional or Trap Bar Deadlift: 3 sets × 5 reps (rest 3 min)
• Standing Overhead Barbell Press: 3 sets × 6-8 reps (rest 2 min)
• Weighted Pull-Ups or Lat Pulldown: 3 sets × 8-10 reps
• Leg Press (Quad focused): 3 sets × 10-12 reps
• Incline Dumbbell Bicep Curls: 3 sets × 10-12 reps

📅 Friday — Full Body C (Unilateral & Hypertrophy Focus):
• Bulgarian Split Squats: 3 sets × 8-10 reps per leg
• Incline Dumbbell Bench Press (30°): 3 sets × 8-12 reps
• Chest-Supported Row: 3 sets × 10-12 reps
• Cable Lateral Raises: 4 sets × 15 reps
• Hanging Leg Raises: 3 sets × 12-15 reps

💡 Efficiency Tip: Perfect for athletes who want maximum muscle stimulation with just 3 gym visits per week. Each muscle is stimulated 3× per week with 48 hours recovery between workouts.`;
  }

  // 5. Chest & Bench Press
  if (
    q.includes("chest") ||
    q.includes("bench") ||
    q.includes("pec") ||
    q.includes("pecs")
  ) {
    return `🎯 Specific Chest Hypertrophy & Bench Press Optimization for ${memberName}:

📋 Biomechanical Breakdown:
1. Upper (Clavicular) Head: Target with 30° Incline Dumbbell Press (4 sets × 8-10 reps) and Low-to-High Cable Crossovers (3 sets × 15 reps). Studies show angles above 45° shift activation to the anterior deltoids, so keep incline moderate.
2. Mid/Lower (Sternal) Head: Heavy Flat Barbell Bench Press (4 sets × 5-6 reps) and Bodyweight/Weighted Chest Dips with slight forward torso lean (3 sets × 8-12 reps).
3. Fully Shortened Pec Contraction: Cable Pec Flyes (3 sets × 12-15 reps with a 1-second squeeze at peak adduction).

🔧 Form & Technique Master Cues:
• Retract & Depress Scapulae: Pinch your shoulder blades down and back into the bench as if tucking them into your back pockets. This exposes the pecs and protects rotator cuffs.
• Bar Path: Touch the barbell to your lower sternum / nipples, then press back and slightly upward in an ergonomic J-curve path over your shoulder joints.
• Elbow Flare Angle: Keep elbows at 45° to 70° relative to your torso. Avoid 90° flaring which places destructive shear forces on the anterior shoulder capsule.

🪙 Need a Spotter or Form Check? Book a Boot Camp Fitness certified personal trainer directly using your Loyalty Coins at /member/trainers!`;
  }

  // 6. Back, Lats, Pull-ups & Rows
  if (
    q.includes("back") ||
    q.includes("lat") ||
    q.includes("lats") ||
    q.includes("pull-up") ||
    q.includes("pull up") ||
    q.includes("row")
  ) {
    return `🎯 Specific Back Hypertrophy & Lat Width Protocol for ${memberName}:

📋 Anatomical Structure:
1. Latissimus Dorsi (V-Taper Width):
   • Wide/Neutral Grip Pull-ups or Lat Pulldowns: 4 sets × 6-8 reps.
   • Master Cue: Do not pull with your wrists or biceps. Think of your hands as hooks and actively drive your elbows straight down toward your hip pockets.
2. Middle Trapezius & Rhomboids (Back Thickness):
   • Chest-Supported T-Bar Row: 4 sets × 8-10 reps (pause 1 sec at full contraction).
   • Single-Arm Dumbbell Rows: 3 sets × 10-12 reps with full stretch at the bottom.
3. Lower Back & Spinal Erectors:
   • Conventional or Trap Bar Deadlifts: 3 sets × 5 reps.
   • Hyperextensions / 45° Back Extensions: 3 sets × 12-15 reps focusing on glute and erector recruitment.

💡 Grip Tip: Use lifting straps on your heaviest working sets once your grip begins to limit back stimulation. This allows your lats to work to true mechanical fatigue.`;
  }

  // 7. Legs, Squats, Hamstrings & Glutes
  if (
    q.includes("leg") ||
    q.includes("legs") ||
    q.includes("squat") ||
    q.includes("quad") ||
    q.includes("hamstring") ||
    q.includes("glute") ||
    q.includes("rdl")
  ) {
    return `🎯 Specific Lower-Body Hypertrophy & Squat Protocol for ${memberName}:

📋 Targeted Exercise Selection:
• Knee Flexion / Quads: Barbell Back Squats (4×6) or Heel-Elevated Hack Squats (4×8-10). Elevating heels 1-2 inches shifts recruitment deeper into the vastus medialis (teardrop quad).
• Hip Hinge / Hamstrings: Romanian Deadlifts (RDLs) (4×8-10 reps). Maintain a soft knee bend and push hips back like closing a car door with your glutes until a deep hamstring stretch is reached.
• Glute Peak Contraction: Barbell Hip Thrusts (3×10-12 reps with a 2-second hold at lockout).
• Knee Joint Stability: Bulgarian Split Squats (3×10 reps per leg).

🔧 Squat Biomechanics & Safety Cues:
• 360° Intra-Abdominal Bracing: Take a deep diaphragmatic breath into your stomach and brace your core (Valsalva maneuver) before breaking at the hips.
• Spread the Floor: Screw your feet into the ground to create external hip rotation. This prevents knee valgus (knees caving inward) and ensures active glute involvement.
• Depth: Descend until hip crease is parallel to or slightly below the knee joint while maintaining a neutral lumbar spine.`;
  }

  // 8. Shoulders & Delts
  if (
    q.includes("shoulder") ||
    q.includes("delts") ||
    q.includes("delt") ||
    q.includes("lateral raise") ||
    q.includes("overhead press")
  ) {
    return `🎯 Specific 3D Shoulder & Deltoid Sculpting Protocol for ${memberName}:

📋 Complete 3-Head Blueprint:
1. Lateral Deltoids (Shoulder Width):
   • Cable Lateral Raises: 4 sets × 12-15 reps (set pulley at knee height for continuous tension).
   • Dumbbell Lateral Raises: 4 sets × 15-20 reps. Lean slightly forward (15°), lead with your elbows, and pour the thumbs slightly down to disengage the upper traps.
2. Anterior Deltoids:
   • Standing Overhead Barbell Press: 4 sets × 6-8 reps. Squeeze glutes and core to avoid hyperextending your lumbar spine.
3. Posterior / Rear Deltoids (Crucial for 3D fullness and shoulder health):
   • Cable Face Pulls: 4 sets × 15-20 reps with external rotation (hands finish above ears).
   • Incline Dumbbell Reverse Flyes: 3 sets × 15 reps.

💡 Frequency Tip: The lateral and rear delts are small pennate muscles with rapid recovery profiles. Train them 2 to 3 times per week with 14-20 total weekly sets for maximum growth.`;
  }

  // 9. Arms (Biceps & Triceps)
  if (
    q.includes("arm") ||
    q.includes("arms") ||
    q.includes("bicep") ||
    q.includes("biceps") ||
    q.includes("tricep") ||
    q.includes("triceps")
  ) {
    return `🎯 Specific Arm Hypertrophy (Bicep Peak & Tricep Mass) for ${memberName}:

📋 Anatomy & Exercise Selection:
1. Triceps (Comprises ~60% of total upper arm circumference):
   • Long Head (Mass & Thickness): Overhead Cable Rope Tricep Extension (3 sets × 12-15 reps). The long head only fully stretches when arms are overhead.
   • Lateral Head (The Outer Horseshoe): Cable Straight-Bar or V-Bar Pushdowns (4 sets × 10-12 reps). Lock elbows firmly at your sides.
   • Medial Head: Close-Grip Barbell Bench Press (3 sets × 8-10 reps).
2. Biceps:
   • Long Head (Peak): Incline Dumbbell Curls (3 sets × 10-12 reps with full stretch at bottom).
   • Short Head (Inner Width): Preacher Curls or Spider Curls (3 sets × 10-12 reps).
   • Brachialis (Pushes bicep upward): Dumbbell Hammer Curls across chest (3 sets × 10-12 reps).

💡 Tempo Cues: Use a 3-second controlled lowering phase (eccentric) and a forceful 1-second contraction. Avoid swinging your shoulders or using momentum.`;
  }

  // 10. Core & Abs
  if (
    q.includes("abs") ||
    q.includes("core") ||
    q.includes("six pack") ||
    q.includes("six-pack") ||
    q.includes("belly")
  ) {
    return `🎯 Specific Core & Abdominal Development Protocol for ${memberName}:

📋 Biomechanical Functions of the Core:
1. Anti-Extension (Resisting Lower Back Arching):
   • Hanging Leg/Knee Raises: 4 sets × 12-15 reps (roll the pelvis upward toward your sternum, do not just swing legs).
   • Ab Wheel Rollouts: 3 sets × 10-12 reps (tuck tailbone under, hold posterior pelvic tilt).
2. Anti-Rotation (Rotational Stability & Obliques):
   • Pallof Press with Cable or Resistance Band: 3 sets × 15-second holds per side.
3. Flexion with Resistance (Rectus Abdominis Hypertrophy):
   • Cable Kneeling Crunches: 4 sets × 12-15 reps (round the thoracic spine down into your thighs).

💡 Body Fat Reality: Visible abs require a body fat percentage below 12-14% for men and 18-20% for women. Direct training builds muscle thickness so the blocks pop once body fat is lean!`;
  }

  // 11. Protein & Macronutrients
  if (
    q.includes("protein") ||
    q.includes("macro") ||
    q.includes("macros") ||
    q.includes("nutrition") ||
    q.includes("diet") ||
    q.includes("calorie") ||
    q.includes("calories") ||
    focusArea === "nutrition"
  ) {
    return `🎯 Specific Evidence-Based Nutritional & Macronutrient Targets for ${memberName}:

📊 Precise Daily Macro Formulas:
• Protein: 1.8 to 2.2 grams per kilogram of body weight (approx. 0.85 - 1.0g per lb).
  - Example: A 75 kg athlete requires 135g - 165g of high-quality protein daily.
  - Primary Sources: Chicken breast (31g/100g), canned tuna (26g/100g), whole eggs (6g/egg), egg whites, whey protein isolate (24g/scoop), Greek yogurt (10g/100g), salmon, tofu.
  - Leucine Threshold: Consume 30-40g of protein per meal every 3-4 hours to trigger muscle protein synthesis (MPS).

• Carbohydrates:
  - Fueling: 3.5 to 5.0 g/kg for muscle building; 2.0 to 3.0 g/kg when cutting body fat.
  - Sources: Rolled oats, jasmine rice, sweet potatoes, bananas, quinoa, whole grain pasta.

• Healthy Fats:
  - Hormonal Baseline: 0.8 to 1.0 g/kg daily (essential for testosterone and cellular membrane integrity).
  - Sources: Extra virgin olive oil, whole eggs, avocados, almonds, walnuts, omega-3 rich fish.

💧 Hydration Baseline:
• Consume 35-40 ml of water per kg of body weight daily (approx. 3.0 to 4.0 liters), plus an extra 500-750 ml during resistance training sessions with sodium & potassium electrolytes.`;
  }

  // 12. Pre-Workout & Post-Workout Nutrition
  if (
    q.includes("pre-workout") ||
    q.includes("pre workout") ||
    q.includes("post-workout") ||
    q.includes("post workout") ||
    q.includes("fuel") ||
    q.includes("eat before") ||
    q.includes("eat after")
  ) {
    return `🎯 Specific Nutrient Timing Blueprint (Pre & Post-Workout) for ${memberName}:

⚡ Pre-Workout Fuel (60 to 90 Minutes Before Lifting):
• Goal: Maximize muscle glycogen, elevate blood glucose, and prevent intra-workout muscular catabolism.
• Recommended Meal: 40-50g complex carbohydrates + 25-30g lean, fast-digesting protein + minimal fats & fiber (<5g fat to avoid digestive lag).
• Concrete Example:
  - Option A: 60g rolled oats cooked with water + 1 scoop whey protein + 1 sliced banana + 1 tsp honey.
  - Option B: 150g cooked white jasmine rice + 120g grilled chicken breast + sea salt.
• 30 Minutes Before: 200-300mg caffeine (optional) + 500ml water with a pinch of sea salt.

⚡ Post-Workout Recovery (Within 60 Minutes After Session):
• Goal: Halt muscle breakdown, restore depleted glycogen stores, and jumpstart protein synthesis.
• Recommended Meal: 30-40g rapid protein + 45-60g fast-acting high-glycemic carbohydrates.
• Concrete Example:
  - Option A: 1.5 scoops Whey Isolate shaken with water + 2 rice cakes with honey + 1 banana.
  - Option B: 180g cooked white rice + 150g 93/7 lean ground beef or turkey + steamed zucchini.`;
  }

  // 13. Supplements
  if (
    q.includes("supplement") ||
    q.includes("supplements") ||
    q.includes("creatine") ||
    q.includes("preworkout") ||
    q.includes("whey")
  ) {
    return `🎯 Evidence-Based Supplement Protocol for ${memberName}:

🥇 Tier 1 — Science-Backed & Essential:
1. Creatine Monohydrate:
   • Dosage: 5 grams daily, taken consistently at any time of day (with water or carbs).
   • Mechanism: Saturates muscle phosphocreatine reserves, increasing ATP replenishment for +5-15% output on heavy compound sets. No loading phase required; full saturation occurs within 21 days.
2. Whey Protein Isolate:
   • Dosage: 25-30g post-workout or between meals to consistently achieve daily protein quotas.
3. Electrolytes & Sodium:
   • 500mg sodium + 200mg potassium dissolved in intra-workout water to prevent cramping and maintain intracellular fluid balance during heavy sweat rates.

🥈 Tier 2 — Health & Micronutrient Optimization:
• Vitamin D3: 2,000 - 5,000 IU daily with dietary fat for hormonal health and bone density.
• Omega-3 Fish Oil: 2,000 - 3,000 mg combined EPA/DHA daily for joint lubrication and reduction of systemic muscular inflammation.
• Magnesium Glycinate: 300-400 mg taken 45 minutes before sleep for muscle relaxation and deep slow-wave sleep.`;
  }

  // 14. Recovery, Soreness (DOMS) & Sleep
  if (
    q.includes("recovery") ||
    q.includes("sore") ||
    q.includes("soreness") ||
    q.includes("doms") ||
    q.includes("sleep") ||
    focusArea === "recovery"
  ) {
    return `🎯 Specific Muscle Soreness (DOMS) & Rapid Recovery Protocol for ${memberName}:

📋 Understanding DOMS (Delayed Onset Muscle Soreness):
Soreness peaks 24 to 48 hours following novel eccentric load or volume spikes. It is driven by microscopic micro-trauma and localized inflammatory signaling, NOT lactic acid.

⚡ Concrete 4-Step Recovery Routine:
1. Active Recovery (Zone 2 Cardio):
   • Perform 20 to 30 minutes of low-impact stationary cycling or brisk treadmill walking at a heart rate of 115-130 BPM. This increases capillary blood flow, transporting nutrients to repairing muscle fibers without causing structural wear.
2. Nocturnal Sleep Architecture:
   • 7.5 to 9 hours of uninterrupted sleep. More than 70% of human growth hormone (HGH) pulsatile secretion occurs during Slow-Wave Sleep (Stage 3 NREM). Keep room temperature below 19°C (66°F) in complete darkness.
3. Contrast Therapy / Sauna:
   • 15-20 minutes Finnish sauna followed by cool shower to dilate blood vessels and assist lymphatic clearance.
4. Nutritional Inflammation Control:
   • Supplement with 400mg Magnesium Glycinate before bed and prioritize 40ml water/kg body weight daily.

💡 Training Advice: If a muscle group is severely tender to the touch, do not lift heavy compound movements on that muscle. Shift focus to another muscle group or perform light dynamic stretching.`;
  }

  // 15. Progressive Overload & Breaking Plateaus
  if (
    q.includes("progressive overload") ||
    q.includes("plateau") ||
    q.includes("stuck") ||
    q.includes("progress") ||
    q.includes("stronger")
  ) {
    return `🎯 Specific Protocol: How to Break Plateaus with Progressive Overload for ${memberName}:

📋 The Double Progression System (Gold Standard):
1. Establish a Target Rep Range: For example, Barbell Bench Press at 3 sets × 6-8 reps.
2. Step 1 (Rep Accumulation): Use a set weight (e.g. 70 kg). If you achieve 70 kg for 8, 7, and 6 reps in Session 1, KEEP the weight at 70 kg next week.
3. Step 2 (Goal): Only advance weight when you can hit all 3 sets for the maximum 8 reps (8, 8, 8) with clean biomechanics and zero joint compensation.
4. Step 3 (Weight Advancement): Once achieved, increase the load by 2.5 kg (to 72.5 kg). Your reps will naturally drop to 6, 6, 6. Then repeat the process!

🔧 Plateau-Breaking Strategies:
• Micro-loading: Use 1.25 kg fractional plates. Adding 1.25 kg per side is far more sustainable on upper body movements than jump loading by 5 kg.
• Tempo Manipulation: Implement a 3-second paused eccentric phase. This dramatically increases time under tension (TUT) without needing more barbell weight.
• Deload Week: If a lift has been stuck for 3 consecutive weeks, perform a 1-week deload: drop volume by 50% while lifting at 70% weight. Your central nervous system will rebound with supercompensation!

🪙 Don't train through bad form: Book a Boot Camp Fitness personal coach to review your sticking point at /member/trainers!`;
  }

  // 16. Weight Loss / Cutting Fat
  if (
    q.includes("fat loss") ||
    q.includes("lose fat") ||
    q.includes("cut") ||
    q.includes("cutting") ||
    q.includes("lose weight") ||
    q.includes("weight loss")
  ) {
    return `🎯 Specific Fat Loss & Muscle Preservation Protocol for ${memberName}:

📊 The Calorie Deficit Math:
• Moderate Sustainable Deficit: 400 - 500 kcal below Total Daily Energy Expenditure (TDEE). This produces approximately 0.5 kg (1 lb) of pure adipose loss per week without sacrificing lean contractile tissue.
• Protein Retention Shield: Elevate protein intake to 2.2 - 2.4g/kg of bodyweight during a deficit. High protein spares muscle during caloric deprivation and increases thermic effect of food (TEF).
• Non-Exercise Activity Thermogenesis (NEAT): Target 8,000 - 10,000 daily steps. Low-intensity walking burns fatty acids directly without raising cortisol or stimulating ravenous appetite.
• Heavy Resistance Training: Do NOT switch to "light weight high reps to tone". Continue lifting heavy (6-10 reps) to give your body a physiological signal to retain dense muscle.

🪙 Track your progress: Log your body measurements and weight under Member Dashboard to watch your BMI shift into optimal zones!`;
  }

  // 17. Bulking / Muscle Building Surplus
  if (
    q.includes("bulk") ||
    q.includes("bulking") ||
    q.includes("gain weight") ||
    q.includes("build muscle") ||
    q.includes("hypertrophy")
  ) {
    return `🎯 Specific Hypertrophy & Clean Muscle Surplus Protocol for ${memberName}:

📊 The Lean Mass Surplus:
• Caloric Surplus: 250 - 350 kcal above maintenance. Avoid "dirty bulking" (500+ surplus) which only yields excess adipose fat storage and insulin insensitivity.
• Target Rate of Gain: 0.25 - 0.5% of total body weight per week (approx. 0.8 - 1.5 kg per month for natural athletes).
• Carbohydrate Optimization: Prioritize carbs around your workouts (pre/intra/post) to maintain maximum cellular hydration and intramuscular glycogen fullness.
• Volume Sweet Spot: 12 to 18 sets per muscle group per week, trained across 2 separate sessions with 1-2 RIR intensity.`;
  }

  // 18. Default Contextualized Boot Camp Fitness Guide
  return `🎯 Personalized Boot Camp Fitness Coaching Assessment for ${memberName}:

• Athlete Objective: Tailored specifically to your stated focus of "${goals}"${bmi ? ` (Current BMI index: ${bmi})` : ""}.
• System Recommendation:
  1. Training Split: Structure a 4-day Upper/Lower or 3-day Push/Pull/Legs rotation to allow 48-72 hours of systemic recovery per muscle group.
  2. Working Volume: Target 10-16 direct working sets per muscle group weekly across the 6-12 rep range with 1-2 Reps in Reserve (RIR).
  3. Nutritional Foundation: Target 1.8 to 2.2g protein per kg of bodyweight daily distributed across 3-4 meals with 3.5 liters of daily hydration.
  4. Workout Logging: Log every set and personal record in the Boot Camp Fitness Workout Tracker to earn +45 Loyalty Coins per workout.

💡 What specific area would you like us to customize right now?
• "Recommend a 4-day upper/lower athletic hypertrophy split"
• "What are my daily protein and hydration targets for muscle growth?"
• "How can I accelerate recovery between heavy lifting sessions?"
• "How should I progress my working weights over the next 4 weeks?"
• "Give me a complete chest workout plan with sets and reps"

🪙 Coach Booking Note: You can use or redeem your Loyalty Coins (Current balance: ${rewardCoins} Coins) to book 1-on-1 certified coaching sessions at /member/trainers!`;
}
