
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Copy, Check, Code, Upload, PlusCircle, Wand2, Loader } from "lucide-react";
import { cn } from "@/lib/utils";
import { MathProblemAnalysis, generateAIContent, fetchAvailableModels } from '@/services/AIService';

interface CodeGeneratorProps {
  // No props needed as we handle everything internally
}

interface Model {
  id: string;
  name: string;
}

// Question types
const QUESTION_TYPES = [
  { value: "multiple-choice", label: "Multiple Choice" },
  { value: "equation", label: "Equation" },
];

const CodeGenerator: React.FC<CodeGeneratorProps> = () => {
  const [apiKey, setApiKey] = useState<string>("");
  const [availableModels, setAvailableModels] = useState<Model[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [questionType, setQuestionType] = useState<string>("multiple-choice");
  const [questionNumber, setQuestionNumber] = useState<number>(1);
  const [teksStandard, setTeksStandard] = useState<string>("");
  const [questionText, setQuestionText] = useState<string>("");
  const [questionImage, setQuestionImage] = useState<File | null>(null);
  const [correctAnswer, setCorrectAnswer] = useState<string>("A");
  const [options, setOptions] = useState<{ [key: string]: string }>({
    "A": "",
    "B": "",
    "C": "",
    "D": ""
  });
  const [explanation, setExplanation] = useState<string>("");
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [codeTab, setCodeTab] = useState<string>("feedback_code");
  const [includeExtraCredit, setIncludeExtraCredit] = useState<boolean>(true);
  const [numberOfOptions, setNumberOfOptions] = useState<number>(4);
  const [generatedCode, setGeneratedCode] = useState<{ [key: string]: string }>({});
  const [aiPrompt, setAiPrompt] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingModels, setLoadingModels] = useState<boolean>(false);
  const [misconceptions, setMisconceptions] = useState<string[]>(["", "", ""]);
  const [currentTab, setCurrentTab] = useState<string>("question");
  const [showModelSelector, setShowModelSelector] = useState<boolean>(false);

  const optionLabels = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];

  // Fetch models when API key is entered
  useEffect(() => {
    const fetchModels = async () => {
      if (apiKey) {
        try {
          setLoadingModels(true);
          const models = await fetchAvailableModels(apiKey);
          setAvailableModels(models);
          
          // Set default model if we have models and none is selected
          if (models.length > 0 && !selectedModel) {
            // Try to find Claude 3 Opus as default, or use the first model
            const defaultModel = models.find(m => m.id === "anthropic/claude-3-opus:beta") || models[0];
            setSelectedModel(defaultModel.id);
          }
          
          setShowModelSelector(true);
        } catch (error) {
          console.error("Failed to fetch models:", error);
          toast.error("Failed to fetch models. Please check your API key.");
        } finally {
          setLoadingModels(false);
        }
      }
    };

    fetchModels();
  }, [apiKey]);

  // Ensure we always have exactly 3 misconceptions
  useEffect(() => {
    if (misconceptions.length !== 3) {
      const newMisconceptions = [...misconceptions];
      while (newMisconceptions.length < 3) {
        newMisconceptions.push("");
      }
      while (newMisconceptions.length > 3) {
        newMisconceptions.pop();
      }
      setMisconceptions(newMisconceptions);
    }
  }, [misconceptions]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setQuestionImage(file);
      setPreviewImage(URL.createObjectURL(file));
    }
  };

  const handleOptionChange = (option: string, value: string) => {
    setOptions(prev => ({ ...prev, [option]: value }));
  };

  const generateCode = () => {
    // We're not generating question, TEKS, or multiple choice code anymore
    // Only generate feedback, explanation, and misconceptions

    const feedbackCode = `hidden: when submit_button.pressCount>0 false otherwise true
content: when submit_button.pressCount>0 and q${questionNumber}_mc.matchesKey "correct ✅" 
when submit_button.pressCount>0 and not(q${questionNumber}_mc.matchesKey) "incorrect ❌"
otherwise ""`;

    const btnAnsCode = `hidden: when (submit_button.pressCount>0 and not(q${questionNumber}_mc.matchesKey)) false otherwise true
style: buttonStyles.white`;

    const expCode = `hidden: when (submit_button.pressCount>0 and q${questionNumber}_btn_ans.pressCount>0) false otherwise true
content: "${explanation.replace(/"/g, '\\"')}"`;

    const ecCode = `hidden: when (submit_button.pressCount>0 and q${questionNumber}_btn_ans.pressCount>0 and not(q${questionNumber}_mc.matchesKey)) false otherwise true`;

    const misconceptionCodes = misconceptions.map((misconception, index) => ({
      [`err_${index + 1}_help`]: `hidden: when (submit_button.pressCount>0 and q${questionNumber}_btn_ans.pressCount>0 and not(q${questionNumber}_mc.matchesKey)) false otherwise true
content: "${misconception.replace(/"/g, '\\"')}"`
    }));

    const allMisconceptionCodes = misconceptionCodes.reduce((acc, curr) => ({ ...acc, ...curr }), {});

    setGeneratedCode({
      feedback: feedbackCode,
      btn_ans: btnAnsCode,
      exp: expCode,
      ec: ecCode,
      ...allMisconceptionCodes
    });

    toast.success("Code generated successfully!");
    setCurrentTab("code");
    setCodeTab("feedback_code");
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Code copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGenerateAI = async () => {
    if (!questionImage && !questionText) {
      toast.error("Please provide a question image or text");
      return;
    }

    if (!apiKey) {
      toast.error("Please enter your OpenRouter API key");
      return;
    }

    if (!selectedModel) {
      toast.error("Please select an LLM model");
      return;
    }

    try {
      setLoading(true);
      
      const result = await generateAIContent(
        apiKey, 
        aiPrompt, 
        questionImage || undefined, 
        selectedModel,
        questionType
      );
      
      // Set values from AI response
      if (result.explanation) {
        setExplanation(result.explanation);
      }
      
      if (result.misconceptions && result.misconceptions.length > 0) {
        setMisconceptions(result.misconceptions);
      }
      
      if (result.correctAnswer) {
        if (questionType === "multiple-choice") {
          setCorrectAnswer(result.correctAnswer);
        } else {
          // For equation type, store it in option A
          handleOptionChange("A", result.correctAnswer);
        }
      }
      
      toast.success("Content generated successfully! Now you can review and generate code.");
      setCurrentTab("answers");
    } catch (error) {
      toast.error("Failed to generate AI content");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto glass-card overflow-hidden animate-fade-in">
      <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5 pb-4">
        <CardTitle className="text-2xl font-semibold tracking-tight">
          Desmos Computational Layer - STAAR Blitz Code Generator
        </CardTitle>
        <CardDescription>
          Create code snippets for interactive practice questions using Desmos Computational Layer
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
          <TabsList className="grid grid-cols-3 mb-6">
            <TabsTrigger value="question">Question Setup</TabsTrigger>
            <TabsTrigger value="answers">Answers & Content</TabsTrigger>
            <TabsTrigger value="code">Generated Code</TabsTrigger>
          </TabsList>
          
          <TabsContent value="question" className="space-y-4 animate-slide-up">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="api-key">OpenRouter API Key</Label>
                  <Input
                    id="api-key"
                    type="password"
                    placeholder="Enter your OpenRouter API key"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="desmos-input"
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Get your API key from <a href="https://openrouter.ai" target="_blank" rel="noreferrer" className="text-primary hover:underline">openrouter.ai</a>
                  </p>
                </div>

                {loadingModels && (
                  <div className="flex items-center justify-center py-2">
                    <Loader className="h-5 w-5 animate-spin mr-2" />
                    <span>Loading available models...</span>
                  </div>
                )}

                {showModelSelector && availableModels.length > 0 && (
                  <div>
                    <Label htmlFor="llm-model">LLM Model</Label>
                    <Select value={selectedModel} onValueChange={setSelectedModel}>
                      <SelectTrigger className="desmos-input">
                        <SelectValue placeholder="Select LLM model" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableModels.map((model) => (
                          <SelectItem key={model.id} value={model.id}>
                            {model.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div>
                  <Label htmlFor="question-type">Question Type</Label>
                  <Select value={questionType} onValueChange={setQuestionType}>
                    <SelectTrigger className="desmos-input">
                      <SelectValue placeholder="Select question type" />
                    </SelectTrigger>
                    <SelectContent>
                      {QUESTION_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="question-number">Question Number</Label>
                  <Input 
                    id="question-number"
                    type="number" 
                    value={questionNumber}
                    onChange={(e) => setQuestionNumber(parseInt(e.target.value) || 1)}
                    className="desmos-input"
                    min={1}
                  />
                </div>

                <div>
                  <Label htmlFor="teks-standard">TEKS Standard</Label>
                  <Input 
                    id="teks-standard"
                    placeholder="e.g. A.2C — writing equations" 
                    value={teksStandard}
                    onChange={(e) => setTeksStandard(e.target.value)}
                    className="desmos-input"
                  />
                </div>

                <div>
                  <Label htmlFor="question-text">Question Text (Optional)</Label>
                  <Textarea 
                    id="question-text"
                    placeholder="Enter the question text here..." 
                    value={questionText}
                    onChange={(e) => setQuestionText(e.target.value)}
                    className="desmos-input min-h-[100px]"
                    autoResize
                  />
                </div>

                <div className="pt-2">
                  <Label htmlFor="ai-prompt">Additional Instructions for AI (Optional)</Label>
                  <Textarea
                    id="ai-prompt"
                    placeholder="Additional instructions for the AI analysis"
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    className="desmos-input"
                    autoResize
                  />
                </div>
              </div>

              <div className="space-y-4">
                <Label>Question Image</Label>
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-md p-4 text-center hover:bg-accent/50 transition cursor-pointer"
                  onClick={() => document.getElementById('image-upload')?.click()}
                >
                  {previewImage ? (
                    <div className="relative">
                      <img 
                        src={previewImage} 
                        alt="Question preview" 
                        className="mx-auto max-h-[200px] object-contain rounded"
                      />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 bg-black/50 transition rounded">
                        <p className="text-white">Click to change</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8">
                      <Upload className="h-10 w-10 text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Click to upload an image of the question
                      </p>
                    </div>
                  )}
                  <input 
                    id="image-upload"
                    type="file" 
                    accept="image/*" 
                    className="hidden"
                    onChange={handleImageChange}
                  />
                </div>

                {questionType === "multiple-choice" && (
                  <div className="pt-4">
                    <Label htmlFor="number-of-options" className="mb-2 block">Number of Options</Label>
                    <div className="flex items-center space-x-2">
                      <Slider 
                        id="number-of-options"
                        defaultValue={[4]} 
                        max={10} 
                        min={2}
                        step={1}
                        value={[numberOfOptions]}
                        onValueChange={(value) => setNumberOfOptions(value[0])}
                        className="flex-1"
                      />
                      <span className="w-8 text-center">{numberOfOptions}</span>
                    </div>
                  </div>
                )}

                <div className="flex items-center space-x-2 pt-2">
                  <Switch 
                    id="extra-credit"
                    checked={includeExtraCredit}
                    onCheckedChange={setIncludeExtraCredit}
                  />
                  <Label htmlFor="extra-credit">Include Extra Credit</Label>
                </div>

                <Button 
                  onClick={handleGenerateAI}
                  className="desmos-button w-full mt-4"
                  disabled={(!questionImage && !questionText) || !apiKey || !selectedModel || loading}
                >
                  {loading ? (
                    <>
                      <Loader className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing with AI...
                    </>
                  ) : (
                    <>
                      <Wand2 className="mr-2 h-4 w-4" />
                      Generate Solution & Misconceptions
                    </>
                  )}
                </Button>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="answers" className="space-y-6 animate-slide-up">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                {questionType === "multiple-choice" ? (
                  <>
                    <div>
                      <Label>Correct Answer</Label>
                      <Select value={correctAnswer} onValueChange={setCorrectAnswer}>
                        <SelectTrigger className="desmos-input">
                          <SelectValue placeholder="Select correct answer" />
                        </SelectTrigger>
                        <SelectContent>
                          {optionLabels.slice(0, numberOfOptions).map((option) => (
                            <SelectItem key={option} value={option}>
                              Option {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-3">
                      <Label>Answer Options</Label>
                      {optionLabels.slice(0, numberOfOptions).map((option) => (
                        <div key={option} className="flex items-center gap-2">
                          <span className={cn(
                            "flex items-center justify-center w-8 h-8 rounded-full text-white",
                            option === correctAnswer ? "bg-desmos-green" : "bg-desmos-gray"
                          )}>
                            {option}
                          </span>
                          <Input 
                            placeholder={`Option ${option} content`}
                            value={options[option] || ""}
                            onChange={(e) => handleOptionChange(option, e.target.value)}
                            className="desmos-input flex-1"
                          />
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <Label>Correct Equation</Label>
                      <Input 
                        placeholder="Enter the correct equation"
                        value={options["A"] || ""}
                        onChange={(e) => handleOptionChange("A", e.target.value)}
                        className="desmos-input"
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="explanation">Explanation</Label>
                  <Textarea 
                    id="explanation"
                    placeholder="Enter the explanation for the correct answer..." 
                    value={explanation}
                    onChange={(e) => setExplanation(e.target.value)}
                    className="desmos-input min-h-[200px]"
                    autoResize
                  />
                </div>
                
                <div className="space-y-4">
                  <Label>Misconceptions (3)</Label>
                  {misconceptions.map((misconception, index) => (
                    <div key={index} className="space-y-1">
                      <Label htmlFor={`misconception-${index}`}>
                        Misconception {index + 1} 
                        {questionType === "multiple-choice" && optionLabels[index] !== correctAnswer && optionLabels[index] 
                          ? ` (Option ${optionLabels[index]})` 
                          : ''}
                      </Label>
                      <Textarea
                        id={`misconception-${index}`}
                        value={misconception}
                        onChange={(e) => {
                          const newMisconceptions = [...misconceptions];
                          newMisconceptions[index] = e.target.value;
                          setMisconceptions(newMisconceptions);
                        }}
                        className="desmos-input min-h-[100px]"
                        autoResize
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="code" className="animate-slide-up">
            <Tabs value={codeTab} onValueChange={setCodeTab}>
              <TabsList className="grid grid-cols-5 mb-4">
                <TabsTrigger value="feedback_code">Feedback</TabsTrigger>
                <TabsTrigger value="btn_code">Buttons</TabsTrigger>
                <TabsTrigger value="exp_code">Explanation</TabsTrigger>
                <TabsTrigger value="err_1_code">Misconception 1</TabsTrigger>
                <TabsTrigger value="err_2_code">Misconception 2</TabsTrigger>
              </TabsList>

              {Object.keys(generatedCode).length === 0 ? (
                <div className="text-center py-12">
                  <Code className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No code generated yet</h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    Fill out the question details and click Generate Code
                  </p>
                  <Button onClick={generateCode} className="desmos-button">
                    Generate Code
                  </Button>
                </div>
              ) : (
                <>
                  {codeTab === "feedback_code" && (
                    <div className="relative">
                      <div className="absolute top-2 right-2">
                        <Button 
                          variant="ghost"
                          size="icon"
                          onClick={() => copyToClipboard(`// For q${questionNumber}_fbk\n${generatedCode.feedback}`)}
                        >
                          {copied ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      <div className="code-block">
                        <pre>{`// For q${questionNumber}_fbk\n${generatedCode.feedback}`}</pre>
                      </div>
                    </div>
                  )}

                  {codeTab === "btn_code" && (
                    <div className="relative">
                      <div className="absolute top-2 right-2">
                        <Button 
                          variant="ghost"
                          size="icon"
                          onClick={() => copyToClipboard(`// For q${questionNumber}_btn_ans\n${generatedCode.btn_ans}`)}
                        >
                          {copied ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      <div className="code-block">
                        <pre>{`// For q${questionNumber}_btn_ans\n${generatedCode.btn_ans}`}</pre>
                      </div>
                    </div>
                  )}

                  {codeTab === "exp_code" && (
                    <div className="relative">
                      <div className="absolute top-2 right-2">
                        <Button 
                          variant="ghost"
                          size="icon"
                          onClick={() => copyToClipboard(`// For q${questionNumber}_exp\n${generatedCode.exp}`)}
                        >
                          {copied ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      <div className="code-block">
                        <pre>{`// For q${questionNumber}_exp\n${generatedCode.exp}`}</pre>
                      </div>
                    </div>
                  )}
                  
                  {[1, 2, 3].map((num) => (
                    <div key={num} className={`relative ${codeTab !== `err_${num}_code` ? 'hidden' : ''}`}>
                      <div className="absolute top-2 right-2">
                        <Button 
                          variant="ghost"
                          size="icon"
                          onClick={() => copyToClipboard(`// For q${questionNumber}_err_${num}_help\n${generatedCode[`err_${num}_help`] || ''}`)}
                        >
                          {copied ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      <div className="code-block">
                        <pre>{`// For q${questionNumber}_err_${num}_help\n${generatedCode[`err_${num}_help`] || ''}`}</pre>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </Tabs>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="bg-muted/30 border-t flex justify-between">
        <Button 
          variant="outline"
          onClick={() => {
            setQuestionNumber(1);
            setTeksStandard("");
            setQuestionText("");
            setQuestionImage(null);
            setPreviewImage(null);
            setCorrectAnswer("A");
            setOptions({
              "A": "",
              "B": "",
              "C": "",
              "D": ""
            });
            setExplanation("");
            setGeneratedCode({});
            setMisconceptions(["", "", ""]);
          }}
        >
          Reset
        </Button>
        <Button onClick={generateCode} className="desmos-button">
          Generate Code
        </Button>
      </CardFooter>
    </Card>
  );
};

export default CodeGenerator;
