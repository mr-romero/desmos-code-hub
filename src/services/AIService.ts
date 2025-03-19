
import { toast } from "sonner";

interface OpenRouterResponse {
  choices: Array<{
    message: {
      content: string;
      role: string;
    };
  }>;
}

export interface MathProblemAnalysis {
  explanation: string;
  misconceptions: string[];
  correctAnswer?: string;
}

export async function generateAIContent(
  apiKey: string, 
  prompt: string, 
  image?: File, 
  model: string = "anthropic/claude-3-opus:beta"
): Promise<MathProblemAnalysis> {
  // Enhanced system prompt that requests structured output
  const systemPrompt = prompt || `You are an expert math teacher analyzing a math problem. 
  First, identify the correct answer choice (A, B, C, D, etc.) if this is a multiple-choice question, and explain why.
  Then, provide a clear, detailed solution explaining the mathematical concepts and steps needed to solve this problem.
  Next, identify three common misconceptions students might have when approaching this problem, listing them separately.
  Format your response as JSON with the following structure:
  {
    "correctAnswer": "letter of correct option (A, B, C, etc.)",
    "explanation": "detailed explanation of solution approach",
    "misconceptions": [
      "explanation of misconception 1",
      "explanation of misconception 2",
      "explanation of misconception 3"
    ]
  }`;

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
      
      // Ensure we have exactly 3 misconceptions for multiple choice questions
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
