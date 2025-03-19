
import React, { useState } from 'react';
import CodeGenerator from '@/components/CodeGenerator';
import AIGenerator from '@/components/AIGenerator';
import NavBar from '@/components/NavBar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { generateAIContent, MathProblemAnalysis } from '@/services/AIService';
import { toast } from 'sonner';

const Index = () => {
  const [currentTab, setCurrentTab] = useState<string>("generator");
  const [loading, setLoading] = useState<boolean>(false);
  const [aiResult, setAiResult] = useState<MathProblemAnalysis | null>(null);

  const handleAISubmit = async (apiKey: string, prompt: string, image?: File) => {
    try {
      setLoading(true);
      
      const result = await generateAIContent(apiKey, prompt, image);
      
      setAiResult(result);
      
      toast.success("Content generated successfully!");
      
      // Switch to the appropriate tab if we're on the AI tab
      if (currentTab === "ai") {
        // No need to switch tabs here
      }
      
      return result;
    } catch (error) {
      console.error(error);
      toast.error("Failed to generate content");
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-muted/30">
      <NavBar />
      
      <main className="flex-1 container px-4 py-8">
        <div className="max-w-4xl mx-auto mb-8 text-center animate-fade-in">
          <h1 className="text-4xl font-bold tracking-tight mb-3">Desmos Code Hub</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Generate code snippets for Desmos Computational Layer to create interactive practice questions for your students
          </p>
        </div>
        
        <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full max-w-4xl mx-auto">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="generator">Code Generator</TabsTrigger>
            <TabsTrigger value="ai">AI Content Generator</TabsTrigger>
          </TabsList>
          
          <TabsContent value="generator" className="mt-0">
            <CodeGenerator 
              onGenerateAI={handleAISubmit}
              aiResult={aiResult} 
            />
          </TabsContent>
          
          <TabsContent value="ai" className="mt-0">
            <AIGenerator 
              onSubmit={handleAISubmit}
              loading={loading}
              result={aiResult}
            />
          </TabsContent>
        </Tabs>
        
        <footer className="mt-12 text-center text-sm text-muted-foreground">
          <p>Desmos Code Hub - STAAR Blitz Code Generator</p>
          <p className="mt-1">Not affiliated with Desmos Inc.</p>
        </footer>
      </main>
    </div>
  );
};

export default Index;
