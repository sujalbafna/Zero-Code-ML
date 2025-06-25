import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: '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', // In production, use environment variable
  dangerouslyAllowBrowser: true // Only for demo, use backend in production
});

export interface CleaningResponse {
  steps: string[];
  updatedData: string[][];
}

export interface VisualizationResponse {
  type: 'line' | 'bar';
  config: any;
}

export interface ModelResponse {
  type: string;
  features: string[];
  metrics: {
    accuracy?: number;
    r2_score?: number;
    cross_validation?: number[];
  };
  code: string;
  serializedModel?: {
    joblib: string;
    pickle: string;
  };
}

export const MODEL_TYPES = {
  regression: [
    'Linear Regression',
    'Decision Tree Regression',
    'Random Forest Regression',
    'Gradient Boosting Regression',
    'Support Vector Regression',
  ],
  classification: [
    'Logistic Regression',
    'Decision Tree Classifier',
    'Random Forest Classifier',
    'Support Vector Classifier',
    'Naive Bayes Classifier',
    'Gradient Boosting Classifier',
    'KNN Classifier',
  ]
};

export async function getDataCleaningInstructions(data: string[][]): Promise<CleaningResponse> {
  const prompt = `Given this dataset:
${data.slice(0, 5).map(row => row.join(',')).join('\n')}

You must respond with valid JSON only, in exactly this format:
{
  "steps": ["step1", "step2"],
  "updatedData": [[]]
}

Do not include any other text or explanation in your response, only the JSON object.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo-16k',
      messages: [
        { 
          role: 'system', 
          content: 'You are a data cleaning assistant. Always respond with valid JSON only, no other text.' 
        },
        { 
          role: 'user', 
          content: prompt 
        }
      ]
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('Empty response from OpenAI');
    }

    return JSON.parse(content);
  } catch (error) {
    console.error('Error in getDataCleaningInstructions:', error);
    console.error('Raw response:', error);
    return {
      steps: ['Error processing data cleaning instructions'],
      updatedData: data
    };
  }
}

export async function getVisualizationConfig(data: string[][], task: string): Promise<VisualizationResponse> {
  const prompt = `Given this dataset and task: "${task}"
${data.slice(0, 5).map(row => row.join(',')).join('\n')}

You must respond with valid JSON only, in exactly this format:
{
  "type": "bar",
  "config": {
    "labels": [],
    "datasets": []
  }
}

Do not include any other text or explanation in your response, only the JSON object.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo-16k',
      messages: [
        {
          role: 'system',
          content: 'generate visualization according to the dataset'
        },
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('Empty response from OpenAI');
    }

    return JSON.parse(content);
  } catch (error) {
    console.error('Error in getVisualizationConfig:', error);
    console.error('Raw response:', error);
    return {
      type: 'bar',
      config: {
        labels: [],
        datasets: [{
          label: 'Error loading data',
          data: []
        }]
      }
    };
  }
}

export async function getModelRecommendation(
  data: string[][],
  task: string,
  selectedModel?: string
): Promise<ModelResponse> {
  const prompt = `Given this dataset and task: "${task}"
${data.slice(0, 5).map(row => row.join(',')).join('\n')}
${selectedModel ? `Using the specified model: ${selectedModel}` : ''}

You must respond with valid JSON only, in exactly this format:
{
  "type": "string",
  "features": ["feature1"],
  "metrics": {
    "accuracy": 0.95,
    "r2_score": 0.85,
    "cross_validation": [0.94, 0.95, 0.96]
  },
  "code": "give whole python script over here with saving model in joblib and pickle format",

Include a complete, production-ready Python script in the code field that includes:
1. All necessary imports
2. Data preprocessing
3. Feature selection
4. Model training with cross-validation
5. Model evaluation



Do not include any other text or explanation in your response, only the JSON object.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo-16k',
      messages: [
        {
          role: 'system',
          content: 'You are a machine learning assistant. Always respond with valid JSON only, no other text.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 4000
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('Empty response from OpenAI');
    }

    return JSON.parse(content);
  } catch (error) {
    console.error('Error in getModelRecommendation:', error);
    console.error('Raw response:', error);
    return {
      type: 'error',
      features: [],
      metrics: {},
      code: '# Error generating model recommendation',
      serializedModel: {
        joblib: '',
        pickle: ''
      }
    };
  }
}
