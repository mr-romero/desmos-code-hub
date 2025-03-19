
import React from 'react';
import { Button } from "@/components/ui/button";
import { ChevronDown, Plus, Settings, LogOut, Github } from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

const NavBar: React.FC = () => {
  return (
    <header className="w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative h-8 w-8 overflow-hidden rounded-full bg-gradient-to-br from-primary to-primary/70">
            <div className="absolute inset-0 flex items-center justify-center text-white font-bold text-sm">D</div>
          </div>
          <span className="text-lg font-semibold tracking-tight">Desmos Code Hub</span>
        </div>
        
        <nav className="flex items-center gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1">
                Resources
                <ChevronDown className="h-4 w-4 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[200px]">
              <DropdownMenuLabel>Documentation</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <a 
                  href="https://help.desmos.com/hc/en-us/articles/4406029052301-Computation-Layer-Overview" 
                  target="_blank" 
                  rel="noreferrer"
                  className="flex w-full"
                >
                  Computation Layer Docs
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <a 
                  href="https://teacher.desmos.com/" 
                  target="_blank" 
                  rel="noreferrer"
                  className="flex w-full"
                >
                  Desmos Teacher
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <a 
                  href="https://openrouter.ai/" 
                  target="_blank" 
                  rel="noreferrer"
                  className="flex w-full"
                >
                  OpenRouter AI
                </a>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Button size="sm" variant="ghost" className="gap-1">
            <Github className="h-4 w-4" />
            <span className="hidden sm:inline">GitHub</span>
          </Button>
          
          <Button size="sm" className="gap-1">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">New Template</span>
          </Button>
        </nav>
      </div>
    </header>
  );
};

export default NavBar;
