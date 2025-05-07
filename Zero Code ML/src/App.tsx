import React, { useState } from 'react';
import { Upload, Database, FileSpreadsheet, BrainCog, Download, Code, LineChart, Brain } from 'lucide-react';
import { Line, Bar } from 'react-chartjs-2';
import { saveAs } from 'file-saver';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { getDataCleaningInstructions, getVisualizationConfig, getModelRecommendation, MODEL_TYPES } from './lib/openai';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface AIResponse {
  cleaning: {
    steps: string[];
    updatedData: string[][];
  };
  visualization: {
    type: 'line' | 'bar';
    config: any;
  };
  model: {
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
  };
}

function App() {
  const [activeTab, setActiveTab] = useState<'upload' | 'connect'>('upload');
  const [data, setData] = useState<string[][]>([]);
  const [loading, setLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState<AIResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [modelType, setModelType] = useState<'regression' | 'classification'>('regression');

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const rows = text.split('\n').map(row => row.split(','));
        setData(rows);
        setError(null);
      };
      reader.onerror = () => {
        setError('Error reading file');
      };
      reader.readAsText(file);
    }
  };

  const processData = async () => {
    if (!data.length) {
      setError('Please upload data first');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [cleaning, visualization, model] = await Promise.all([
        getDataCleaningInstructions(data),
        getVisualizationConfig(data, ''),
        getModelRecommendation(data, '', selectedModel)
      ]);

      setAiResponse({
        cleaning,
        visualization,
        model
      });
    } catch (err) {
      setError('Error processing data. Please try again.');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const downloadData = () => {
    if (!aiResponse) return;
    
    const csvContent = aiResponse.cleaning.updatedData
      .map(row => row.join(','))
      .join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    saveAs(blob, 'cleaned_data.csv');
  };

  const downloadModelInfo = () => {
    if (!aiResponse) return;
    
    const modelInfo = JSON.stringify({
      type: aiResponse.model.type,
      features: aiResponse.model.features,
      metrics: aiResponse.model.metrics,
      code: aiResponse.model.code
    }, null, 2);
    
    const blob = new Blob([modelInfo], { type: 'application/json' });
    saveAs(blob, 'model_info.json');
  };

  const downloadPythonScript = () => {
    if (!aiResponse) return;
    
    const blob = new Blob([aiResponse.model.code], { type: 'text/x-python' });
    saveAs(blob, 'model_script.py');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white">
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex items-center space-x-2">
          <BrainCog className="h-8 w-8 text-purple-400" />
          <h1 className="text-2xl font-bold">Zero-Code ML (Developed & Hosted By Sujal Bafna)</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="bg-gray-800 rounded-lg shadow-xl border border-gray-700 p-6">
          <div className="flex flex-col space-y-6">
            <h2 className="text-xl font-semibold flex items-center space-x-2">
              <span>1. Upload or Connect Data</span>
            </h2>
            
            <div className="flex space-x-4 border-b border-gray-700">
              <button
                className={`px-4 py-2 ${
                  activeTab === 'upload'
                    ? 'border-b-2 border-purple-500 text-purple-400'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
                onClick={() => setActiveTab('upload')}
              >
                <div className="flex items-center space-x-2">
                  <FileSpreadsheet className="h-5 w-5" />
                  <span>Upload CSV/TSV</span>
                </div>
              </button>
              <button
                className={`px-4 py-2 ${
                  activeTab === 'connect'
                    ? 'border-b-2 border-purple-500 text-purple-400'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
                onClick={() => setActiveTab('connect')}
              >
                <div className="flex items-center space-x-2">
                  <Database className="h-5 w-5" />
                  <span>Connect Database</span>
                </div>
              </button>
            </div>

            <div className="mt-4">
              {activeTab === 'upload' ? (
                <div className="flex justify-center items-center w-full">
                  <label className="w-full flex flex-col items-center px-4 py-6 bg-gray-700 rounded-lg tracking-wide border-2 border-purple-500 border-dashed cursor-pointer hover:bg-gray-600 transition duration-200">
                    <Upload className="w-12 h-12 text-purple-400" />
                    <span className="mt-2 text-base text-purple-400">Drop your file here or click to upload</span>
                    <input type="file" className="hidden" accept=".csv,.tsv" onChange={handleFileUpload} />
                  </label>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-col space-y-2">
                    <label className="text-sm font-medium text-gray-300">Connection String</label>
                    <input
                      type="text"
                      placeholder="postgresql://username:password@host:port/database"
                      className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-md focus:ring-purple-500 focus:border-purple-500 text-white placeholder-gray-400"
                    />
                  </div>
                  <button className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition duration-200">
                    Connect
                  </button>
                </div>
              )}
            </div>

            {error && (
              <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-2 rounded-md">
                {error}
              </div>
            )}

            {data.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-medium mb-4">Data Preview</h3>
                <div className="overflow-x-auto bg-gray-900 rounded-lg border border-gray-700">
                  <table className="min-w-full divide-y divide-gray-700">
                    <thead className="bg-gray-800">
                      <tr>
                        {data[0].map((header, i) => (
                          <th
                            key={i}
                            className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider"
                          >
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {data.slice(1, 6).map((row, i) => (
                        <tr key={i}>
                          {row.map((cell, j) => (
                            <td key={j} className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="mt-8 pt-6 border-t border-gray-700">
              <h2 className="text-xl font-semibold mb-4">2. Select Model Type</h2>
              <div className="space-y-4">
                <div className="flex space-x-4">
                  <button
                    onClick={() => setModelType('regression')}
                    className={`px-4 py-2 rounded-md ${
                      modelType === 'regression'
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    Regression
                  </button>
                  <button
                    onClick={() => setModelType('classification')}
                    className={`px-4 py-2 rounded-md ${
                      modelType === 'classification'
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    Classification
                  </button>
                </div>

                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md focus:ring-purple-500 focus:border-purple-500 text-white"
                >
                  <option value="">Select a model</option>
                  {MODEL_TYPES[modelType].map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </select>

                <div className="flex justify-end">
                  <button
                    onClick={processData}
                    disabled={loading || !data.length}
                    className="px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                        <span>Processing...</span>
                      </>
                    ) : (
                      'Process'
                    )}
                  </button>
                </div>
              </div>
            </div>

            {aiResponse && (
              <div className="mt-8 space-y-8">
                <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
                  <h3 className="text-lg font-medium mb-4 flex items-center text-purple-400">
                    <LineChart className="h-5 w-5 mr-2" />
                    Visualization
                  </h3>
                  <div className="h-80 w-full bg-gray-800 p-4 rounded-lg">
                    {aiResponse.visualization.type === 'bar' ? (
                      <Bar data={aiResponse.visualization.config} options={{ 
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            labels: {
                              color: 'rgb(209, 213, 219)'
                            }
                          }
                        },
                        scales: {
                          y: {
                            grid: {
                              color: 'rgba(75, 85, 99, 0.2)'
                            },
                            ticks: {
                              color: 'rgb(209, 213, 219)'
                            }
                          },
                          x: {
                            grid: {
                              color: 'rgba(75, 85, 99, 0.2)'
                            },
                            ticks: {
                              color: 'rgb(209, 213, 219)'
                            }
                          }
                        }
                      }} />
                    ) : (
                      <Line data={aiResponse.visualization.config} options={{
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            labels: {
                              color: 'rgb(209, 213, 219)'
                            }
                          }
                        },
                        scales: {
                          y: {
                            grid: {
                              color: 'rgba(75, 85, 99, 0.2)'
                            },
                            ticks: {
                              color: 'rgb(209, 213, 219)'
                            }
                          },
                          x: {
                            grid: {
                              color: 'rgba(75, 85, 99, 0.2)'
                            },
                            ticks: {
                              color: 'rgb(209, 213, 219)'
                            }
                          }
                        }
                      }} />
                    )}
                  </div>
                </div>

                <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
                  <h3 className="text-lg font-medium mb-4 flex items-center text-purple-400">
                    <Code className="h-5 w-5 mr-2" />
                    Model Details
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium text-gray-300">Model Type</h4>
                      <p className="text-gray-400">{aiResponse.model.type}</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-300">Selected Features</h4>
                      <ul className="list-disc list-inside text-gray-400">
                        {aiResponse.model.features.map((feature, index) => (
                          <li key={index}>{feature}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-300">Metrics</h4>
                      <ul className="list-inside space-y-1 text-gray-400">
                        {aiResponse.model.metrics.r2_score && (
                          <li>R² Score: {aiResponse.model.metrics.r2_score.toFixed(3)}</li>
                        )}
                        {aiResponse.model.metrics.accuracy && (
                          <li>Accuracy: {aiResponse.model.metrics.accuracy.toFixed(3)}</li>
                        )}
                        {aiResponse.model.metrics.cross_validation && (
                          <li>
                            Cross-validation scores: {aiResponse.model.metrics.cross_validation.map(score => score.toFixed(3)).join(', ')}
                          </li>
                        )}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-300">Model Code</h4>
                      <pre className="bg-gray-800 text-gray-200 p-4 rounded-md overflow-x-auto border border-gray-700">
                        <code>{aiResponse.model.code}</code>
                      </pre>
                    </div>
                    <div className="flex space-x-4">
                      <button
                        onClick={downloadPythonScript}
                        className="flex items-center px-4 py-2 text-sm text-purple-400 hover:text-purple-300 bg-gray-800 rounded-md border border-gray-700"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download Python Script
                      </button>
                      <button
                        onClick={downloadModelInfo}
                        className="flex items-center px-4 py-2 text-sm text-purple-400 hover:text-purple-300 bg-gray-800 rounded-md border border-gray-700"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download Model Info
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;