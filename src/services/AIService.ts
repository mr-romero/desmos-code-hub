
import { toast } from "sonner";

interface OpenRouterResponse {
  choices: Array<{
    message: {
      content: string;
      role: string;
    };
  }>;
}

interface OpenRouterModel {
  id: string;
  name: string;
}

interface OpenRouterModelsResponse {
  data: OpenRouterModel[];
}

export interface MathProblemAnalysis {
  explanation: string;
  misconceptions: string[];
  correctAnswer?: string;
}

export async function fetchAvailableModels(apiKey: string): Promise<OpenRouterModel[]> {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Failed to fetch models');
    }

    const data = await response.json() as OpenRouterModelsResponse;
    
    return data.data.map(model => ({
      id: model.id,
      name: model.name
    }));
  } catch (error) {
    console.error('Error fetching models:', error);
    toast.error(error instanceof Error ? error.message : 'Failed to fetch models');
    throw error;
  }
}

export async function generateAIContent(
  apiKey: string, 
  prompt: string, 
  image?: File, 
  model: string = "anthropic/claude-3-opus:beta",
  questionType: string = "multiple-choice"
): Promise<MathProblemAnalysis> {
  // Create system prompt based on question type
  let systemPrompt = prompt || "";
  
  if (questionType === "multiple-choice") {
    systemPrompt = `You are an expert math teacher analyzing a multiple-choice math problem. 
    First, identify the correct answer choice (A, B, C, D, etc.), and explain why this is the correct answer.
    Then, provide a clear, detailed explanation of how to solve this problem correctly step-by-step.
    Finally, analyze EACH incorrect answer choice and explain the specific misconception or error that leads to that wrong answer.
    
    Format your response as JSON with the following structure:
    {
      "correctAnswer": "letter of correct option (A, B, C, etc.)",
      "explanation": "detailed explanation of solution approach",
      "misconceptions": [
        "explanation of why option 1 is incorrect and what misconception it represents",
        "explanation of why option 2 is incorrect and what misconception it represents",
        "explanation of why option 3 is incorrect and what misconception it represents"
      ]
    }`;
  } else if (questionType === "equation") {
    systemPrompt = `You are an expert math teacher analyzing an equation problem where students need to provide a correct equation as their answer.
    First, identify the correct equation that solves this problem.
    Then, provide a clear, detailed explanation with **bold titles for each step** of how to solve this problem correctly.
    Finally, identify THREE common misconceptions students might have when solving this type of equation problem.
    
    Format your response as JSON with the following structure:
    {
      "correctAnswer": "the correct equation",
      "explanation": "detailed explanation of solution approach with **bold titles for each step**",
      "misconceptions": [
        "explanation of misconception 1 when solving this equation",
        "explanation of misconception 2 when solving this equation",
        "explanation of misconception 3 when solving this equation"
      ]
    }`;
  }

  try {
    // First, prepare the image if provided
    let base64Image = '';
    
    if (image) {
      base64Image = await fileToBase64(image);
    }

    // Build the messages payload
    const messages = [
      {
        role: "system",
        content: systemPrompt
      },
      {
        role: "user",
        content: image 
          ? [
              { type: "text", text: "Analyze this math problem image and provide the solution and misconceptions in JSON format:" },
              { type: "image_url", image_url: { url: base64Image }}
            ]
          : "Provide a solution and misconceptions for the described math problem in JSON format:"
      }
    ];

    // Make the API request
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        temperature: 0.3,
        max_tokens: 2000,
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Failed to generate content');
    }

    const data = await response.json() as OpenRouterResponse;
    
    if (!data.choices?.length) {
      throw new Error('No content generated');
    }

    const content = data.choices[0].message.content;
    
    // Try to parse the JSON response directly
    try {
      const jsonResponse = JSON.parse(content);
      const result: MathProblemAnalysis = {
        explanation: jsonResponse.explanation || '',
        misconceptions: jsonResponse.misconceptions || [],
        correctAnswer: jsonResponse.correctAnswer
      };
      
      // Ensure we have exactly 3 misconceptions
      if (result.misconceptions.length < 3) {
        while (result.misconceptions.length < 3) {
          result.misconceptions.push('');
        }
      }
      
      return result;
    } catch (jsonError) {
      console.error('Error parsing JSON response:', jsonError);
      // Fallback to text parsing if JSON parsing fails
      return parseAIResponse(content);
    }
  } catch (error) {
    console.error('Error generating AI content:', error);
    toast.error(error instanceof Error ? error.message : 'Failed to generate content');
    throw error;
  }
}

function parseAIResponse(response: string): MathProblemAnalysis {
  // Initialize default return values
  const result: MathProblemAnalysis = {
    explanation: '',
    misconceptions: ['', '', ''],
    correctAnswer: undefined
  };
  
  // Try to extract the correct answer
  const answerMatch = response.match(/correct answer:?\s*([A-Z])/i);
  if (answerMatch && answerMatch[1]) {
    result.correctAnswer = answerMatch[1].toUpperCase();
  }
  
  // Look for sections in the response
  const sections = response.split(/(?:^|\n)#+\s+|(?:^|\n)\d+\.\s+/);
  
  // Extract explanation
  const explanationSection = sections.find(section => 
    /explanation|solution|solving|steps/i.test(section.split('\n')[0])
  );
  
  if (explanationSection) {
    result.explanation = explanationSection.replace(/^[^\n]+\n/, '').trim();
  } else {
    // If no explicit explanation section, use first substantial section that's not about answer or misconceptions
    for (const section of sections) {
      if (!/answer|correct|misconception|mistake|error/i.test(section.split('\n')[0]) && section.length > 100) {
        result.explanation = section.trim();
        break;
      }
    }
  }
  
  // Look for misconceptions
  const misconceptionSection = sections.find(section => 
    /misconception|mistake|error|confusion/i.test(section.split('\n')[0])
  );
  
  if (misconceptionSection) {
    // Split by numbered or bulleted list items
    const misconceptionItems = misconceptionSection.split(/(?:\n|^)(?:\d+\.|\*|\-)\s+/);
    
    // Filter out the header and empty items, then clean up the text
    const extractedMisconceptions = misconceptionItems
      .slice(1) // Skip the section header
      .filter(item => item.trim().length > 0)
      .map(item => item.trim());
      
    // Add found misconceptions up to 3
    for (let i = 0; i < Math.min(3, extractedMisconceptions.length); i++) {
      result.misconceptions[i] = extractedMisconceptions[i];
    }
  }
  
  // If we couldn't find misconceptions as list items, try to identify paragraphs
  if (result.misconceptions.every(m => !m)) {
    const paragraphs = response
      .split(/\n\n+/)
      .filter(paragraph => paragraph.trim().length > 50 && /misconception|mistake|error/i.test(paragraph));
      
    // Add found misconceptions up to 3
    for (let i = 0; i < Math.min(3, paragraphs.length); i++) {
      result.misconceptions[i] = paragraphs[i].trim();
    }
  }
  
  return result;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to convert file to base64'));
      }
    };
    reader.onerror = error => reject(error);
  });
}
