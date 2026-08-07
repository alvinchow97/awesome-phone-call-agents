import { outcomesForKind } from "./result";
import type { CareCallRequest, CareCallRoutineKind } from "./types";

/**
 * What CareCall asks and must never do, on a real call, for each routine kind.
 * A complete Record rather than a branch, so a kind added without an entry
 * here is a type error instead of silently inheriting another kind's script.
 */
const ASK_INSTRUCTION: Record<CareCallRoutineKind, string> = {
  medication: "Ask only whether the senior reports already taking the scheduled medication, will take it as instructed, is unsure, cannot find it, feels unwell, declines, or wants human help. Never diagnose, recommend a dose, or advise repeating, skipping, delaying, or changing medication.",
  meal: "Ask whether the senior reports eating or plans to eat, whether food is available, whether they can prepare or receive it, whether an expected delivery arrived, whether they feel unwell, decline, or want human help.",
  hydration: "Ask whether the senior reports drinking, will drink shortly, is unsure whether they already drank, or has no drink within reach, whether they feel unwell, decline, or want human help. Never set a fluid target or give medical advice about how much to drink.",
  wellbeing: "Ask one open question about how the senior is doing and record their own words. Anything beyond a plain report of feeling well — including feeling low, wanting company, feeling unwell, declining to answer, or asking for help — is a request for human follow-up, not something to interpret. Never assess mood, screen for any condition, or counsel.",
  appointment: "Ask whether the senior acknowledges the appointment, will attend, needs transport, cannot attend, is unsure about the appointment, declines, or wants human help. Never book, move, or cancel an appointment, and never state a detail the caregiver did not supply.",
};

export function buildCareCallGoal(request: CareCallRequest): string {
  const kind = request.routine.kind;
  const outcomeValues = outcomesForKind(kind).join(", ");

  return [
    `Make one scheduled CareCall SG call on behalf of ${request.organisation.name}.`,
    `Speak only in verified English. Address the recipient as ${request.senior.preferred_name}.`,
    `Open by identifying CareCall as an automated calling assistant and say: "${request.routine.trust_phrase}"`,
    "State that you will never ask for money, bank information, an OTP, password, or full NRIC.",
    `Purpose: ${request.routine.title}. Caregiver-approved instruction: ${request.routine.caregiver_instruction}`,
    "Use short sentences, ask one question at a time, repeat when asked, and never treat silence, hesitation, or ambiguity as agreement.",
    ASK_INSTRUCTION[kind],
    `Offer to request a callback from ${request.routine.caregiver_name}. Do not claim that a callback, visit, food delivery, ambulance, or emergency response has been arranged.`,
    "If immediate danger is mentioned, say the senior or another person should contact Singapore emergency services at 995, and request human follow-up. Do not claim to dispatch help.",
    `At the end, plainly state exactly one outcome token from: ${outcomeValues}. Include it in the summary as CARECALL_OUTCOME=<token>.`,
    "Record only what the senior reported. End politely and do not schedule another call.",
  ].join("\n");
}
