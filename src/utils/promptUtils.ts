import Handlebars from 'handlebars';
import JSON5 from 'json5';
import { prompt } from '../hooks/usePrompt';
import { CardData } from '../types';

export const getVaribalesFromTemplate = (template: string) => {
  let variables: string[] = [];
  try {
    const ast = Handlebars.parse(template);
    const traverse = (node: any) => {
      if (node.type === 'MustacheStatement' || node.type === 'BlockStatement') {
        if (node.path.type === 'PathExpression') {
          variables.push(node.path.original);
        }
      }
      // Recursively traverse child nodes
      if ('program' in node && node.program) {
        node.program.body.forEach(traverse);
      }
      if ('inverse' in node && node.inverse) {
        node.inverse.body.forEach(traverse);
      }
    };
    ast.body.forEach(traverse);
  } catch (e) {
    console.debug('Error parsing template:', e);
    return [];
  }
  return [...new Set(variables)]; // Remove duplicates
};

export const prettifyVariables = (lockedInput: string, combinedVariables: string[], setLockedInput: (value: string) => void) => {
  try {
    let parsedInput = JSON5.parse(lockedInput);
    
    // Extend parsedInput with combinedVariables
    combinedVariables.forEach(variable => {
      if (!(variable in parsedInput)) {
        parsedInput[variable] = "";
      }
    });

    const jsonString = JSON.stringify(parsedInput, null, 2);
    setLockedInput(jsonString);
  } catch (error) {
    console.debug('Error prettifying variables:', error);
  }
};

export const generateSessionTitle = async (sessionContent: string, defaultProvider: string, defaultModel: string, activeCards: CardData[]): Promise<string> => {
  try {
    const response = await prompt([{
      role: 'user',
      content: `Generate a short, concise title (max 5 words) for this AI Prompting Experiment:\n\n${sessionContent}`
    }], {
      providers: [{
        provider: defaultProvider,
        model: defaultModel,
      }],
    });
    return response.trim();
  } catch (error) {
    console.debug('Error generating session title with default model:', error);
    
    // Try with the model used for generation
    const lastCard = activeCards[activeCards.length - 1];
    if (lastCard) {
      try {
        const response = await prompt([
          {
            role: 'system',
            content: `You are an AI assistant that generates short, concise titles for AI Prompting Experiments. Return only the title, no quotes, no markdown, no formatting.`,
          },
          {
            role: 'user',
            content: `Generate a short, concise title (max 5 words) for this AI Prompting Experiment:\n\n${sessionContent}`
          }], {
          providers: [{
            provider: lastCard.provider,
            model: lastCard.model,
          }],
        });
        return response.trim();
      } catch (secondError) {
        console.debug('Error generating session title with generation model:', secondError);
      }
    }
    
    return generateFallbackTitle(sessionContent);
  }
};

export const generateFallbackTitle = (content: string): string => {
  return content.split(' ').slice(0, 5).join(' ') + '...';
};


export const parseCSV = (csvContent: string) => {
  const lines = csvContent.split('\n').filter(line => line.trim() !== '');
  const headers = lines[0].split(',');
  const data = lines.slice(1).map(line => {
    const values = line.split(',');
    return headers.reduce((obj, header, index) => {
      obj[header.trim()] = values[index]?.trim() || '';
      return obj;
    }, {} as Record<string, string>);
  });
  
  return { input: data };
};

export function processPromptTemplate(template: string, variables: Record<string, any>): string {
  try {
    let processedPrompt = template;
    Object.entries(variables).forEach(([key, value]) => {
      processedPrompt = processedPrompt.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
    });
    return processedPrompt;
  } catch (err) {
    throw new Error('Failed to process prompt template');
  }
}