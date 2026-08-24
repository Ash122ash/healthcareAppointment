import Anthropic from '@anthropic-ai/sdk';
import { UrgencyLevel, LLMStatus } from '@prisma/client';

const apiKey = process.env.ANTHROPIC_API_KEY || 'dummy-key-for-now';

const anthropic = new Anthropic({
  apiKey: apiKey.startsWith('dummy') ? 'dummy-key' : apiKey,
});

export interface PreVisitResult {
  urgencyLevel: UrgencyLevel;
  chiefComplaint: string;
  suggestedQuestions: string[];
  rawLLMResponse: string;
  status: LLMStatus;
}

export interface PostVisitResult {
  patientFriendlyText: string;
  medicationSchedule: {
    medicine: string;
    dosage: string;
    frequency: string;
    durationDays: number;
    instructions?: string;
  }[];
  followUpSteps: string[];
  status: LLMStatus;
}

export async function generatePreVisitSummary(symptoms: string): Promise<PreVisitResult> {
  const isDummy = apiKey.startsWith('dummy') || !apiKey;

  if (isDummy) {
    console.log('Using mock Pre-Visit AI summary due to dummy/missing API key.');
    // Simulated mock summary
    const mockResponse = {
      urgencyLevel: 'MEDIUM' as UrgencyLevel,
      chiefComplaint: symptoms.length > 60 ? symptoms.slice(0, 60) + '...' : symptoms,
      suggestedQuestions: [
        'How long have you been experiencing these symptoms?',
        'Does anything specific make the discomfort better or worse?',
        'Have you taken any over-the-counter medication for this yet?',
      ],
    };
    return {
      ...mockResponse,
      rawLLMResponse: JSON.stringify(mockResponse),
      status: LLMStatus.SUCCESS,
    };
  }

  try {
    const prompt = `Analyse these symptoms and return strict JSON with keys:
urgencyLevel ("Low" | "Medium" | "High"), chiefComplaint (string),
suggestedQuestions (array of exactly 3 strings for the doctor to ask).
Symptoms: ${symptoms}
Return ONLY valid JSON, no markdown fences, no extra text.`;

    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    });

    const textContent = message.content[0].type === 'text' ? message.content[0].text : '';
    const parsed = JSON.parse(textContent.trim());

    // Validate structure
    const urgency = (parsed.urgencyLevel?.toUpperCase() as UrgencyLevel) || UrgencyLevel.MEDIUM;
    const complaint = parsed.chiefComplaint || symptoms.slice(0, 100);
    const questions = Array.isArray(parsed.suggestedQuestions)
      ? parsed.suggestedQuestions.slice(0, 3)
      : ['Please describe symptoms.', 'How long has this occurred?', 'Any prior occurrences?'];

    return {
      urgencyLevel: urgency,
      chiefComplaint: complaint,
      suggestedQuestions: questions,
      rawLLMResponse: textContent,
      status: LLMStatus.SUCCESS,
    };
  } catch (err) {
    console.error('Error calling Anthropic Claude for Pre-Visit Summary:', err);
    return {
      urgencyLevel: UrgencyLevel.MEDIUM,
      chiefComplaint: `Symptom intake: ${symptoms}`,
      suggestedQuestions: [
        'How long have you been experiencing these symptoms?',
        'Does anything specific make the discomfort better or worse?',
        'Have you taken any medication for this yet?',
      ],
      rawLLMResponse: 'AI generation failed. Fallback default summary loaded.',
      status: LLMStatus.FAILED,
    };
  }
}

export async function generatePostVisitSummary(notes: string): Promise<PostVisitResult> {
  const isDummy = apiKey.startsWith('dummy') || !apiKey;

  if (isDummy) {
    console.log('Using mock Post-Visit AI summary due to dummy/missing API key.');
    // Simulated mock summary
    const mockResponse = {
      patientFriendlyText: `During your visit, the doctor reviewed your notes: "${notes}". You are advised to rest and stay hydrated.`,
      medicationSchedule: [
        {
          medicine: 'Amoxicillin',
          dosage: '500mg',
          frequency: 'Three times daily',
          durationDays: 7,
          instructions: 'Take with food and finish the entire prescription.',
        },
        {
          medicine: 'Paracetamol',
          dosage: '500mg',
          frequency: 'As needed every 6 hours',
          durationDays: 5,
          instructions: 'For fever or mild pain. Do not exceed 4g per day.',
        },
      ],
      followUpSteps: [
        'Monitor temperature twice daily.',
        'Drink plenty of fluids.',
        'Schedule a check-up if symptoms persist past 7 days.',
      ],
    };
    return {
      ...mockResponse,
      status: LLMStatus.SUCCESS,
    };
  }

  try {
    const prompt = `Convert these clinical notes into a patient-friendly summary. Return strict JSON with keys:
summary (plain-language explanation of the visit and diagnosis),
medicationSchedule (array of {medicine, dosage, frequency, durationDays, instructions}),
followUpSteps (array of strings).
Avoid medical jargon. Clinical notes: ${notes}
Return ONLY valid JSON, no markdown fences, no extra text.`;

    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    });

    const textContent = message.content[0].type === 'text' ? message.content[0].text : '';
    const parsed = JSON.parse(textContent.trim());

    return {
      patientFriendlyText: parsed.summary || 'Summary unavailable.',
      medicationSchedule: Array.isArray(parsed.medicationSchedule) ? parsed.medicationSchedule : [],
      followUpSteps: Array.isArray(parsed.followUpSteps) ? parsed.followUpSteps : [],
      status: LLMStatus.SUCCESS,
    };
  } catch (err) {
    console.error('Error calling Anthropic Claude for Post-Visit Summary:', err);
    return {
      patientFriendlyText: `Summary unavailable - please review symptoms/notes manually. Clinical notes: ${notes}`,
      medicationSchedule: [],
      followUpSteps: ['Follow up with your doctor if symptoms persist.'],
      status: LLMStatus.FAILED,
    };
  }
}
