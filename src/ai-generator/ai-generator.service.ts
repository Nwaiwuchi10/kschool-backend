import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import axios from 'axios';

export interface GenerateLessonDto {
  topicTitle: string;
  subjectName?: string;
  classLevel?: string;
  subtopicTitle?: string;
}

export interface GeneratedLessonResult {
  title: string;
  objectives: string[];
  outlines: string[];
  content: string;
}

export interface GenerateQuizDto {
  topicTitle: string;
  subjectName?: string;
  classLevel?: string;
  lessonContent?: string;
  numberOfQuestions?: number; // Default 5
}

export interface GeneratedQuizQuestion {
  questionText: string;
  options: string[]; // 4 options
  correctOptionIndex: number; // 0..3
  explanation?: string;
}

export interface GeneratedQuizResult {
  title: string;
  questions: GeneratedQuizQuestion[];
}

@Injectable()
export class AiGeneratorService {
  private readonly logger = new Logger(AiGeneratorService.name);

  private getApiKey(): string | null {
    return process.env.GEMINI_API_KEY || null;
  }

  /**
   * Helper to call Google Gemini API with JSON response schema
   */
  private async callGemini(prompt: string, jsonSchemaDescription: string): Promise<any> {
    const apiKey = this.getApiKey();

    if (!apiKey) {
      throw new BadRequestException(
        'GEMINI_API_KEY is not configured in backend environment. Please set GEMINI_API_KEY in ody-Backend/.env to enable free AI generation.'
      );
    }

    // Candidate models in preference order:
    // gemini-flash-lite-latest (fastest & most available free tier),
    // gemini-flash-latest, gemini-2.5-flash, gemini-1.5-flash
    const candidateModels = [
      'gemini-flash-lite-latest',
      'gemini-flash-latest',
      'gemini-2.5-flash',
      'gemini-1.5-flash',
    ];

    const requestBody = {
      contents: [
        {
          parts: [
            {
              text: `${prompt}\n\nIMPORTANT: Respond with pure valid JSON matching this schema:\n${jsonSchemaDescription}\nDo NOT include markdown formatting like \`\`\`json or \`\`\` in the response. Return raw JSON text only.`,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.7,
        topP: 0.95,
        responseMimeType: 'application/json',
      },
    };

    let lastError: any = null;

    for (const model of candidateModels) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      try {
        const response = await axios.post(url, requestBody, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 45000,
        });

        const candidate = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!candidate) {
          throw new Error('Gemini API returned an empty response.');
        }

        // Parse JSON from text
        const cleanJson = candidate.trim().replace(/^```json/i, '').replace(/^```/, '').replace(/```$/, '').trim();
        return JSON.parse(cleanJson);
      } catch (error: any) {
        lastError = error;
        const errMsg = error?.response?.data?.error?.message || error?.message;
        this.logger.warn(`Gemini model ${model} failed (${errMsg}). Trying next candidate...`);
      }
    }

    this.logger.error('All Gemini candidate models failed:', lastError?.response?.data || lastError?.message);
    if (lastError?.response?.data?.error?.message) {
      throw new BadRequestException(`Gemini AI Error: ${lastError.response.data.error.message}`);
    }
    throw new BadRequestException(`Failed to generate content with Gemini AI: ${lastError?.message || 'Unknown error'}`);
  }

  /**
   * 1. Generate Lesson Objectives, Outlines, and Rich Markdown Content
   */
  async generateLesson(dto: GenerateLessonDto): Promise<GeneratedLessonResult> {
    if (!dto.topicTitle || !dto.topicTitle.trim()) {
      throw new BadRequestException('topicTitle is required to generate lesson content.');
    }

    const subjectStr = dto.subjectName ? `for the subject "${dto.subjectName}"` : '';
    const classStr = dto.classLevel ? `for class "${dto.classLevel}" students` : 'for secondary school students';
    const subtopicStr = dto.subtopicTitle ? `focusing on the subtopic "${dto.subtopicTitle}"` : '';

    const prompt = `You are an expert school educator and curriculum developer. Create an engaging, high-quality, comprehensive classroom lesson on the topic "${dto.topicTitle}" ${subtopicStr} ${subjectStr} ${classStr}.

Guidelines:
1. Provide a clear lesson title.
2. Provide 3 to 5 actionable learning objectives (e.g. "By the end of this lesson, students should be able to...").
3. Provide 3 to 5 outline points covering the lesson flow.
4. Provide comprehensive, engaging lesson content in markdown format. Include:
   - Clear introduction with real-world relevance.
   - Core concepts explained step-by-step with headings and bullet points.
   - For mathematical or scientific formulas, use clear LaTeX notation ($...$ inline or $$...$$ display, e.g. $\\frac{a}{b}$, $x^2$, $1101_2$).
   - Worked examples and practice exercises for students.
   - Summary conclusion.`;

    const schema = `{
  "title": "Lesson title string",
  "objectives": ["string", "string", "string"],
  "outlines": ["string", "string", "string"],
  "content": "Full markdown lesson text string"
}`;

    const result = await this.callGemini(prompt, schema);

    return {
      title: result.title || dto.topicTitle,
      objectives: Array.isArray(result.objectives) ? result.objectives : [],
      outlines: Array.isArray(result.outlines) ? result.outlines : [],
      content: result.content || '',
    };
  }

  /**
   * 2. Generate Quiz Questions with 4 options and correct answer index
   */
  async generateQuiz(dto: GenerateQuizDto): Promise<GeneratedQuizResult> {
    if (!dto.topicTitle || !dto.topicTitle.trim()) {
      throw new BadRequestException('topicTitle is required to generate quiz questions.');
    }

    const qCount = Math.min(20, Math.max(1, dto.numberOfQuestions || 5));
    const subjectStr = dto.subjectName ? `in "${dto.subjectName}"` : '';
    const classStr = dto.classLevel ? `appropriate for class "${dto.classLevel}" students` : '';
    const contentContext = dto.lessonContent ? `\nLesson Context to base questions on:\n${dto.lessonContent.slice(0, 3000)}` : '';

    const prompt = `You are an expert educator. Create ${qCount} multiple-choice quiz assessment questions on the topic "${dto.topicTitle}" ${subjectStr} ${classStr}.${contentContext}

Guidelines:
1. Provide exactly ${qCount} questions.
2. Each question MUST have exactly 4 options (options array with 4 strings: A, B, C, D).
3. "correctOptionIndex" must be the zero-based index (0, 1, 2, or 3) indicating which option is correct.
4. For math/science questions, format formulas cleanly using LaTeX ($...$).
5. Provide a brief "explanation" explaining why the correct option is right.`;

    const schema = `{
  "title": "Quiz Assessment: ${dto.topicTitle}",
  "questions": [
    {
      "questionText": "Question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctOptionIndex": 0,
      "explanation": "Why Option A is correct"
    }
  ]
}`;

    const result = await this.callGemini(prompt, schema);

    const questions: GeneratedQuizQuestion[] = (result.questions || []).map((q: any) => ({
      questionText: q.questionText || '',
      options: Array.isArray(q.options) && q.options.length >= 4 ? q.options.slice(0, 4) : ['A', 'B', 'C', 'D'],
      correctOptionIndex: typeof q.correctOptionIndex === 'number' && q.correctOptionIndex >= 0 && q.correctOptionIndex <= 3 ? q.correctOptionIndex : 0,
      explanation: q.explanation || '',
    }));

    return {
      title: result.title || `Quiz on ${dto.topicTitle}`,
      questions,
    };
  }
}

