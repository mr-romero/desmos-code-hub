
import { toast } from "sonner";

interface OpenRouterResponse {
  choices: Array<{
    message: {
      content: string;
      role: string;
    };
  }>;
}

export async function generateAIContent(apiKey: string, prompt: string, image?: File): Promise<{ 
  explanation: string;
  misconceptions: string[];
}> {
  // Default system prompt for explanation and misconceptions
  const systemPrompt = `You are an expert math teacher analyzing a math problem. 
  First, provide a clear, detailed solution explaining the mathematical concepts and steps needed to solve this problem.
  Next, identify three common misconceptions students might have when approaching this problem, listing them separately.
  For each misconception, explain what causes the error and how to fix it.`;

  const fullPrompt = prompt 
    ? `${systemPrompt}\n\nAdditional instructions: ${prompt}`
    : systemPrompt;

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
        content: fullPrompt
      },
      {
        role: "user",
        content: image 
          ? [
              { type: "text", text: "Analyze this math problem image and provide the solution and misconceptions:" },
              { type: "image_url", image_url: { url: base64Image }}
            ]
          : "Provide a solution and misconceptions for the described math problem:"
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
        model: "anthropic/claude-3-opus:beta",
        messages: messages,
        temperature: 0.3,
        max_tokens: 1500
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
    
    // Process the response to extract explanation and misconceptions
    const parts = parseAIResponse(content);
    
    return parts;
  } catch (error) {
    console.error('Error generating AI content:', error);
    toast.error(error instanceof Error ? error.message : 'Failed to generate content');
    throw error;
  }
}

function parseAIResponse(response: string): { explanation: string; misconceptions: string[] } {
  // Initialize default return values
  const result = {
    explanation: '',
    misconceptions: []
  };
  
  // Look for sections in the response that might contain solution and misconceptions
  const sections = response.split(/(?:^|\n)#+\s+/);
  
  // Extract the explanation (typically the first substantial section after any introduction)
  const solutionSectionIndex = sections.findIndex(section => 
    /solution|explanation|solving|answer|approach/i.test(section.split('\n')[0])
  );
  
  if (solutionSectionIndex >= 0) {
    result.explanation = sections[solutionSectionIndex].trim();
  } else {
    // If no explicit solution section, use first section that's not about misconceptions
    for (const section of sections) {
      if (!/misconception|mistake|error|confusion/i.test(section.split('\n')[0])) {
        result.explanation = section.trim();
        break;
      }
    }
  }
  
  // Look for misconceptions section
  const misconceptionSection = sections.find(section => 
    /misconception|mistake|error|confusion/i.test(section.split('\n')[0])
  );
  
  if (misconceptionSection) {
    // Split by numbered or bulleted list items
    const misconceptionItems = misconceptionSection.split(/(?:\n|^)(?:\d+\.|\*|\-)\s+/);
    
    // Filter out the header and empty items, then clean up the text
    result.misconceptions = misconceptionItems
      .slice(1) // Skip the section header
      .filter(item => item.trim().length > 0)
      .map(item => item.trim());
  }
  
  // If we couldn't parse properly, just split the response into parts
  if (!result.explanation) {
    result.explanation = response;
  }
  
  if (result.misconceptions.length === 0) {
    // Try to extract misconceptions from the full text if we couldn't find them in sections
    const matches = response.match(/(?:misconception|mistake|error|students might).*?(?:\n|$)([\s\S]*?)(?:\n\n|$)/gi);
    if (matches && matches.length > 0) {
      // Take the first match as potentially containing misconceptions
      result.misconceptions = [matches.join('\n').trim()];
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
