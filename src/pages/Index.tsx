
import React from 'react';
import CodeGenerator from '@/components/CodeGenerator';
import NavBar from '@/components/NavBar';

const Index = () => {
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
        
        <CodeGenerator />
        
        <footer className="mt-12 text-center text-sm text-muted-foreground">
          <p>Desmos Code Hub - STAAR Blitz Code Generator</p>
          <p className="mt-1">Not affiliated with Desmos Inc.</p>
        </footer>
      </main>
    </div>
  );
};

export default Index;
