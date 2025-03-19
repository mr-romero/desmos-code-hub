
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Upload, Loader2, Copy, Check } from "lucide-react";
import { MathProblemAnalysis } from '@/services/AIService';

interface AIGeneratorProps {
  onSubmit: (apiKey: string, prompt: string, image?: File) => Promise<MathProblemAnalysis>;
  loading: boolean;
  result: MathProblemAnalysis | null;
}

const AIGenerator: React.FC<AIGeneratorProps> = ({ 
  onSubmit, 
  loading, 
  result
}) => {
  const [apiKey, setApiKey] = useState<string>("");
  const [prompt, setPrompt] = useState<string>("");
  const [image, setImage] = useState<File | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [copied, setCopied] = useState<{ [key: string]: boolean }>({});

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImage(file);
      setPreviewImage(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!apiKey) {
      toast.error("Please enter your OpenRouter API key");
      return;
    }

    try {
      await onSubmit(apiKey, prompt, image || undefined);
    } catch (error) {
      console.error(error);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied({ ...copied, [key]: true });
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopied({ ...copied, [key]: false }), 2000);
  };

  return (
    <Card className="w-full max-w-4xl mx-auto glass-card animate-fade-in mt-8">
      <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5">
        <CardTitle className="text-2xl font-semibold">AI-Powered Content Generator</CardTitle>
        <CardDescription>
          Generate explanations and identify common misconceptions using AI
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="api-key" className="text-sm font-medium">
                OpenRouter API Key
              </Label>
              <Input
                id="api-key"
                type="password"
                placeholder="Enter your OpenRouter API key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="desmos-input mt-1"
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                Get your API key from <a href="https://openrouter.ai" target="_blank" rel="noreferrer" className="text-primary hover:underline">openrouter.ai</a>
              </p>
            </div>

            <div>
              <Label htmlFor="prompt" className="text-sm font-medium">
                Additional Instructions (Optional)
              </Label>
              <Textarea
                id="prompt"
                placeholder="Enter additional instructions for the AI"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="desmos-input mt-1 min-h-[100px]"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Question Image</Label>
              <div
                className="border-2 border-dashed border-muted-foreground/25 rounded-md p-4 text-center hover:bg-accent/50 transition cursor-pointer"
                onClick={() => document.getElementById('ai-image-upload')?.click()}
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
                  id="ai-image-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageChange}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Upload the question image to get better AI-generated content
              </p>
            </div>
          </div>

          <Button
            type="submit"
            className="desmos-button w-full"
            disabled={loading || !apiKey}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              "Generate Content"
            )}
          </Button>
        </form>

        {result && (
          <div className="mt-8 pt-6 border-t">
            <h3 className="text-lg font-medium mb-4">Generated Content</h3>
            
            {result.correctAnswer && (
              <div className="mb-4">
                <h4 className="font-medium mb-2">Correct Answer</h4>
                <div className="bg-muted p-3 rounded-md">
                  <p className="font-medium text-lg">{result.correctAnswer}</p>
                </div>
              </div>
            )}
            
            <Tabs defaultValue="explanation" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="explanation">Explanation</TabsTrigger>
                <TabsTrigger value="misconceptions">Misconceptions</TabsTrigger>
              </TabsList>

              <TabsContent value="explanation" className="animate-slide-up">
                {result.explanation ? (
                  <div className="relative bg-muted p-4 rounded-md">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2"
                      onClick={() => copyToClipboard(result.explanation, 'explanation')}
                    >
                      {copied['explanation'] ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                    <pre className="whitespace-pre-wrap text-sm">{result.explanation}</pre>
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-4">
                    Explanation will appear here after generation
                  </p>
                )}
              </TabsContent>

              <TabsContent value="misconceptions" className="animate-slide-up">
                {result.misconceptions?.length ? (
                  <div className="space-y-4">
                    {result.misconceptions.map((misconception, index) => (
                      <div key={index} className="relative bg-muted p-4 rounded-md">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute top-2 right-2"
                          onClick={() => copyToClipboard(misconception, `misconception-${index}`)}
                        >
                          {copied[`misconception-${index}`] ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                        <h4 className="font-medium mb-2">Misconception {index + 1}</h4>
                        <pre className="whitespace-pre-wrap text-sm">{misconception}</pre>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-4">
                    Common misconceptions will appear here after generation
                  </p>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AIGenerator;
