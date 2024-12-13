import { PromptVersion } from '../stores/promptFinderStore';
import JSON5 from 'json5';
import { nanoid } from 'nanoid';
import { extractCodeBlock, extractTag } from './responseUtils';

export const IMPROVEMENT_SYSTEM_PROMPT = `You are a prompt template optimization assistant. Your task is to analyze and improve prompt templates while preserving their variables.

Important Rules:
1. PRESERVE ALL VARIABLES: All variables in format {{variableName}} must be kept intact
2. FOCUS ON TEMPLATE STRUCTURE: Analyze and improve the template structure, not specific content
3. MAINTAIN VARIABLE CONTEXT: Ensure variables are used in appropriate contexts

Your analysis should focus on:
1. Template structure and organization
2. Variable placement and context
3. Clarity and effectiveness of instructions
4. Potential ambiguities or weaknesses

Generate exactly 4 template variations using different techniques:
- Structural improvement: Reorganize the template structure for better flow and clarity
- Clarity enhancement: Make instructions and requirements more explicit and unambiguous
- Context optimization: Improve how context and background information is presented
- Instruction refinement: Enhance the specificity and effectiveness of directives

Respond in the following JSON format:
{
  "analysis": {
    "templateStructure": "Analysis of current template structure",
    "variableUsage": "How variables are currently used",
    "improvement_areas": "Identified areas for improvement"
  },
  "variations": [
    {
      "technique": "Name of technique used",
      "template": "The revised prompt template",
      "explanation": "How this variation improves the template"
    }
  ]
}`;

export interface OptimizationConfig {
  initialPrompt: string;
  objective: string;
  variables: Record<string, any>;
  apiKey: string;
}

export interface OptimizationResult {
  versions: PromptVersionWithEvaluation[];
  error?: string;
}

export interface EvaluationData {
  relativeScore: number;
  comparisonNotes: string;
  improvementSuggestions: string;
}

export interface PromptVersionWithEvaluation extends PromptVersion {
  evaluation: {
    relativeScore: number;
    comparisonNotes: string;
    improvementSuggestions: string;
  };
  rawEvaluationResult: string;
}

interface VerificationResult {
  isValid: boolean;
  missingVariables: string[];
  message: string;
}

export class PromptOptimizer {
  private config: OptimizationConfig;
  private runPrompt: (prompt: string) => Promise<string>;
  private allVersions: PromptVersionWithEvaluation[];
  private addLog: (message: string, response?: string, title?: string, step?: number, substep?: number) => void;
  private addPromptVersion: (version: PromptVersionWithEvaluation) => void;

  constructor(
    config: OptimizationConfig,
    runPrompt: (prompt: string) => Promise<string>,
    addLog: (message: string, response?: string, title?: string, step?: number, substep?: number) => void,
    addPromptVersion: (version: PromptVersionWithEvaluation) => void
  ) {
    this.config = config;
    this.runPrompt = runPrompt;
    this.allVersions = [];
    this.addLog = addLog;
    this.addPromptVersion = addPromptVersion;
  }

  private calculateHeuristicScore(result: string, targetResult: string): number {
    // Add null checks for inputs
    if (!result || !targetResult) {
      console.warn('Missing input for score calculation:', { result, targetResult });
      return 0;
    }
    
    const normalizeText = (text: string) => text.toLowerCase().trim().replace(/\s+/g, ' ');
    const normalizedResult = normalizeText(result);
    const normalizedTarget = normalizeText(targetResult);

    const scores: { [key: string]: number } = {
      lengthScore: Math.max(0, 100 - Math.abs(normalizedResult.length - normalizedTarget.length) / normalizedTarget.length * 100),
      
      wordOverlapScore: (() => {
        const resultWords = new Set(normalizedResult.split(' '));
        const targetWords = new Set(normalizedTarget.split(' '));
        const intersection = new Set([...resultWords].filter(x => targetWords.has(x)));
        const union = new Set([...resultWords, ...targetWords]);
        return (intersection.size / union.size) * 100;
      })(),

      structureScore: (() => {
        const getPunctuationPattern = (text: string) => text.replace(/[a-zA-Z0-9\s]/g, '');
        const resultPattern = getPunctuationPattern(result);
        const targetPattern = getPunctuationPattern(targetResult);
        return resultPattern === targetPattern ? 100 : 
               resultPattern.length === targetPattern.length ? 70 :
               Math.max(0, 50 - Math.abs(resultPattern.length - targetPattern.length) * 5);
      })(),

      keyPhrasesScore: (() => {
        const getKeyPhrases = (text: string) => {
          const words = text.split(' ');
          return words.filter(word => 
            word.length > 4 ||
            /[A-Z]/.test(word) ||
            /\d/.test(word)
          );
        };
        
        const targetPhrases = getKeyPhrases(normalizedTarget);
        const resultPhrases = getKeyPhrases(normalizedResult);
        const matches = targetPhrases.filter(phrase => 
          resultPhrases.some(rPhrase => rPhrase.includes(phrase) || phrase.includes(rPhrase))
        );
        
        return (matches.length / targetPhrases.length) * 100;
      })()
    };

    const weights = {
      lengthScore: 0.15,
      wordOverlapScore: 0.3,
      structureScore: 0.25,
      keyPhrasesScore: 0.3
    };

    const finalScore = Object.entries(scores).reduce((total, [key, score]) => {
      return total + score * weights[key as keyof typeof weights];
    }, 0);

    return Math.round(Math.max(0, Math.min(100, finalScore)));
  }

  private verifyVariablesInPrompt(prompt: string): VerificationResult {
    const variables = Object.keys(this.config.variables);
    const missingVariables: string[] = [];

    // Check each variable
    variables.forEach(variable => {
      const variablePattern = new RegExp(`{{${variable}}}`, 'g');
      if (!variablePattern.test(prompt)) {
        missingVariables.push(variable);
      }
    });

    return {
      isValid: missingVariables.length === 0,
      missingVariables,
      message: missingVariables.length > 0 
        ? `Missing required variables: ${missingVariables.join(', ')}`
        : 'All required variables present'
    };
  }

  private substituteVariables(template: string): string {
    let result = template;
    Object.entries(this.config.variables).forEach(([key, value]) => {
      const variablePattern = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(variablePattern, String(value));
    });
    return result;
  }

  private async evaluatePrompt(prompt: string, parentId?: string, existingVersion?: PromptVersionWithEvaluation): Promise<PromptVersionWithEvaluation> {
    this.addLog("Evaluating prompt variation", prompt, "Evaluation", 1);
    
    const verification = this.verifyVariablesInPrompt(prompt);
    if (!verification.isValid) {
      throw new Error(`Invalid prompt template: ${verification.message}`);
    }

    // Substitute variables before running the prompt
    const substitutedPrompt = this.substituteVariables(prompt);
    this.addLog("Running prompt with substituted variables", substitutedPrompt, "Execution", 1, 1);
    const templateResult = await this.runPrompt(substitutedPrompt);
    if (!templateResult) {
      throw new Error('No result received from template execution');
    }
    this.addLog("Received template execution result", templateResult, "Execution Result", 1, 2);

    const evaluationPrompt = `You are an expert evaluator. Compare the following result against the target result and provide a score from 0-100.
Focus on semantic similarity and conceptual alignment rather than exact matches.

Evaluation criteria:
1. Core concept alignment: How well the main ideas and concepts match
2. Contextual accuracy: Appropriate context and domain-specific details
3. Missing details: How well the result covers the expected details

Give constructive feedback on how to improve the result without lossing generalizability.

Target result:
${this.config.objective}

Actual result:
${templateResult}

Respond with a valid JSON object in this exact format:
{
  "score": number,
  "analysis": string,
  "improvementSuggestions": "string"
}`;

    const evaluationResponse = await this.runPrompt(evaluationPrompt);
    let score = 0;
    let evaluationData = null;

    try {
      if (evaluationResponse.trim().startsWith('{')) {
        evaluationData = JSON5.parse(evaluationResponse);
      } else {
        const extractedJson = extractCodeBlock(evaluationResponse, 'json');
        if (extractedJson) {
          evaluationData = JSON5.parse(extractedJson);
        }
      }
      if (evaluationData && typeof evaluationData.score === 'number') {
        score = Math.round(evaluationData.score);
      }
    } catch (error) {
      console.warn('Failed to parse evaluation:', error);
      score = this.calculateHeuristicScore(templateResult, this.config.objective);
    }

    if (existingVersion) {
      // Update existing version
      existingVersion.prompt = prompt;
      existingVersion.result = templateResult;
      existingVersion.score = score;
      existingVersion.rawEvaluationResult = evaluationResponse;
      existingVersion.evaluation = {
        relativeScore: existingVersion.evaluation?.relativeScore || 100,
        comparisonNotes: evaluationData?.analysis || 'No analysis available',
        improvementSuggestions: evaluationData?.improvementSuggestions || 'No suggestions available',
      };
      return this.ensureVersionName(existingVersion);
    }

    // Create new version with required evaluation property
    const version: PromptVersionWithEvaluation = this.ensureVersionName({
      id: nanoid(),
      prompt,
      result: templateResult,
      score,
      parentId,
      feedback: evaluationData?.explanation || 'No explanation available',
      rawEvaluationResult: evaluationResponse,
      evaluation: {
        relativeScore: 100,
        comparisonNotes: evaluationData?.analysis || 'No analysis available',
        improvementSuggestions: evaluationData?.improvementSuggestions || 'No suggestions available',
      }
    } as PromptVersionWithEvaluation);

    return version;
  }

  private async generateVariations(parent: PromptVersionWithEvaluation, count: number): Promise<PromptVersionWithEvaluation[]> {
    this.addLog(`Generating ${count} variations for prompt`, parent.prompt, "Generation", 2);
    const variablesList = Object.keys(this.config.variables)
      .map(key => `{{${key}}}`)
      .join(', ');

    const optimizationPrompt = `You are a prompt optimization assistant. Your task is to generate ${count} variations of the following prompt template.
Each variation should be a revision that aims to achieve the same objective but with potential improvements.

IMPORTANT: You MUST preserve these variables in your variations: ${variablesList}
Each variation MUST include all the variables from the original template.

The template should not include any direct information from the variables and expected result so that the template can be used in a wide range of contexts.

Current Template:
${parent.prompt}

Variables:
${JSON.stringify(this.config.variables)}

Expected Result:
${this.config.objective}

Current Result:
${parent.result}

Generate exactly ${count} variations.

First, write your analaysis on the inherent connection between the given Variables and the Expected Result in <Analysis> tag.

Then create your variations based on the analysis and the original template.

Respond with the variations in this JSON format wrapped in <Variations> tag:
<Variations>
\`\`\`json
{
  "variations": [
    {
      "prompt": "The complete revised prompt template",
      "explanation": "Very brief explanation of the changes and expected improvements"
    }
  ]
}
\`\`\`

<ExampleOutput>
<Analysis>
Lets take a closer look at the varibales and the expected result...
We can see that the core connection between the variable and objective is ...
</Analysis>
<Variations>
\`\`\`json
{
  "variations": [
    {
      "prompt": "The complete revised prompt template",
      "explanation": "Brief explanation of the changes and expected improvements"
    }
  ]
}
\`\`\`
</Variations>
</ExampleOutput>
`;

    try {
      const response = await this.runPrompt(optimizationPrompt);
      this.addLog("Received variations from LLM", response, "Generation Response", 2, 1);
      let optimization: { variations: Array<{ prompt: string; explanation: string }> };

      try {
        if (extractTag(response, 'Variations') && extractTag(response, 'Variations')?.trim().startsWith('{')) {
          optimization = JSON5.parse(extractTag(response, 'Variations')!);
        } else {
          const extractedJson = extractCodeBlock(response, 'json');
          if (extractedJson) {
            optimization = JSON5.parse(extractedJson);
          } else {
            throw new Error('Invalid optimization response format');
          }
        }

        if (!optimization?.variations || !Array.isArray(optimization.variations)) {
          throw new Error('Missing or invalid variations in optimization response');
        }

        // Create and add versions immediately
        const results: PromptVersionWithEvaluation[] = [];
        for (const variation of optimization.variations) {
          const verification = this.verifyVariablesInPrompt(variation.prompt);
          
          if (!verification.isValid) {
            console.warn('Invalid variation, missing variables:', verification.message);
            continue;
          }

          // Create new version with pending evaluation
          const version: PromptVersionWithEvaluation = this.ensureVersionName({
            id: nanoid(),
            prompt: variation.prompt,
            parentId: parent.id,
            feedback: variation.explanation,
            score: 0,
            result: '',
            rawEvaluationResult: '',
            evaluation: {
              relativeScore: 0,
              comparisonNotes: 'Pending evaluation',
              improvementSuggestions: 'Pending evaluation',
            }
          } as PromptVersionWithEvaluation);

          // Add version to store immediately
          this.addPromptVersion(version);
          this.allVersions.push(version);
          results.push(version);
        }

        // Evaluate versions after they're all added
        for (const version of results) {
          const evaluatedVersion = await this.evaluatePrompt(version.prompt, version.parentId, version);
          // Update the existing version with evaluation results
          Object.assign(version, evaluatedVersion);
        }

        return results;
      } catch (error) {
        console.error('Failed to process variations:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error generating variations:', error);
      throw error;
    }
  }

  private generateVersionName(version: PromptVersion, allVersions: PromptVersion[]): string {
    // Handle initial version
    if (version.parentId === 'initial') {
      return 'Initial Template';
    }
    
    if (!version.parentId) {
      const rootVersions = allVersions.filter(v => !v.parentId || v.parentId === 'initial');
      const index = rootVersions.findIndex(v => v.id === version.id);
      return `v${Math.max(0, index)}`;
    }

    // Find parent version
    const parent = allVersions.find(v => v.id === version.parentId);
    if (!parent) {
      console.warn(`Parent not found for version ${version.id}, using fallback name`);
      return `v${version.id.substring(0, 4)}`;
    }

    // Ensure parent has a version name
    const parentName = parent.versionName || this.generateVersionName(parent, allVersions);
    
    // Find siblings and determine index
    const siblings = allVersions.filter(v => v.parentId === version.parentId);
    const index = siblings.findIndex(v => v.id === version.id) + 1;
    
    return `${parentName}.${index}`;
  }

  private ensureVersionName<T extends PromptVersion>(version: T): T {
    if (!version.versionName) {
      version.versionName = this.generateVersionName(version, this.allVersions);
    }
    return version;
  }

  private async evaluateGenerationGroup(versions: PromptVersionWithEvaluation[]): Promise<void> {
    if (versions.length <= 1) {
      versions[0].evaluation = {
        relativeScore: 100,
        comparisonNotes: 'Single version in group - no comparison needed',
        improvementSuggestions: 'No improvements needed for single version'
      };
      return;
    }

    // Sort by score for easier comparison
    versions.sort((a, b) => b.score - a.score);
    const bestScore = versions[0].score;
    
    for (let i = 0; i < versions.length; i++) {
      const version = versions[i];
      const relativeScore = Math.round((version.score / bestScore) * 100);
      
      // Compare with previous version if exists
      const prevVersion = i > 0 ? versions[i - 1] : null;
      const nextVersion = i < versions.length - 1 ? versions[i + 1] : null;
      
      const comparisonNotes = prevVersion 
        ? `Score difference from best: ${bestScore - version.score} points`
        : 'Best performing version in group';
        
      const improvementSuggestions = nextVersion 
        ? `Could improve by ${version.score - nextVersion.score} points to match next best version`
        : 'Consider generating new variations to improve further';

      version.evaluation = {
        relativeScore,
        comparisonNotes,
        improvementSuggestions
      };
    }
  }

  public async optimize(): Promise<OptimizationResult> {
    try {
      this.addLog("Starting optimization process", undefined, "Optimization Start", 1);
      
      // Step 1: Create and evaluate initial template
      const initialVersion: PromptVersionWithEvaluation = this.ensureVersionName({
        id: nanoid(),
        prompt: this.config.initialPrompt,
        parentId: 'initial',
        feedback: 'Initial template for optimization process',
        score: 0,
        result: '',
        rawEvaluationResult: '',
        evaluation: {
          relativeScore: 100,
          comparisonNotes: 'Initial template serving as the baseline',
          improvementSuggestions: 'Generate variations to improve the template'
        }
      } as PromptVersionWithEvaluation);

      const evaluatedInitialVersion = await this.evaluatePrompt(
        initialVersion.prompt,
        initialVersion.parentId,
        initialVersion
      );

      this.addPromptVersion(evaluatedInitialVersion);
      this.addLog("Initial template evaluated", undefined, "Initial Evaluation", 1);

      // Step 2: Generate first generation variations
      this.addLog("Generating first generation variations", undefined, "Generation 1", 2);
      const gen1Versions = await this.generateVariations(evaluatedInitialVersion, 4);
      await this.evaluateGenerationGroup(gen1Versions);
      gen1Versions.forEach(version => this.addPromptVersion(version));

      // Step 3: Select best 2 from first generation
      this.addLog("Selecting best performers from first generation", undefined, "Selection", 3);
      const bestGen1 = gen1Versions
        .sort((a, b) => b.score - a.score)
        .slice(0, 2);

      // Step 4: Generate second generation (3 children each for best 2)
      this.addLog("Generating second generation variations", undefined, "Generation 2", 4);
      const gen2Results = [];
      for (const parent of bestGen1) {
        this.addLog(`Generating variations for ${parent.versionName}`, undefined, "Generation 2", 4);
        const children = await this.generateVariations(parent, 3);
        await this.evaluateGenerationGroup(children);
        children.forEach(version => this.addPromptVersion(version));
        gen2Results.push(children);
      }

      this.addLog("Optimization process completed", undefined, "Complete", 5);

      return {
        versions: this.allVersions,
        error: undefined
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.addLog(`Optimization failed: ${errorMessage}`, undefined, "Error", -1);
      console.error('Optimization failed:', error);
      return {
        versions: this.allVersions,
        error: errorMessage
      };
    }
  }
} 