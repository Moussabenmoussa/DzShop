"use client";

import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Zap, Shield } from "lucide-react";
import Link from "next/link";

export function Hero() {
  return (
    <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-accent/30 bg-accent/10 text-accent text-sm mb-8">
            <Sparkles className="h-4 w-4" />
            <span>AI-Powered Content Generation</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tight text-balance">
            Create Professional
            <br />
            <span className="text-accent">Content in Seconds</span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto text-pretty">
            Transform your ideas into compelling marketing copy, emails, social
            media posts, and more. Powered by advanced AI technology.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/app">
              <Button variant="accent" size="lg" className="gap-2">
                Start Creating Now
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Button variant="outline" size="lg">
              View Pricing
            </Button>
          </div>

          <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-3xl mx-auto">
            <div className="flex items-center justify-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                <Zap className="h-5 w-5 text-accent" />
              </div>
              <div className="text-left">
                <p className="font-semibold">10x Faster</p>
                <p className="text-sm text-muted-foreground">Than manual writing</p>
              </div>
            </div>
            <div className="flex items-center justify-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                <Shield className="h-5 w-5 text-accent" />
              </div>
              <div className="text-left">
                <p className="font-semibold">100% Original</p>
                <p className="text-sm text-muted-foreground">Unique content</p>
              </div>
            </div>
            <div className="flex items-center justify-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                <Sparkles className="h-5 w-5 text-accent" />
              </div>
              <div className="text-left">
                <p className="font-semibold">Pro Quality</p>
                <p className="text-sm text-muted-foreground">Publication ready</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
