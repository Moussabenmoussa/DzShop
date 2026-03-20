"use client";

import { cn } from "@/lib/utils";
import {
  Mail,
  Share2,
  FileText,
  TrendingUp,
  PenTool,
  Globe,
} from "lucide-react";

export type ContentType =
  | "email"
  | "social"
  | "marketing"
  | "blog"
  | "creative"
  | "translate";

interface ContentTypeOption {
  id: ContentType;
  label: string;
  icon: React.ElementType;
  description: string;
  prompt: string;
}

const contentTypes: ContentTypeOption[] = [
  {
    id: "email",
    label: "Email",
    icon: Mail,
    description: "Professional business emails",
    prompt:
      "Write a professional email. Ask me about the purpose, recipient, and key points to include.",
  },
  {
    id: "social",
    label: "Social Media",
    icon: Share2,
    description: "Engaging social posts",
    prompt:
      "Create a social media post. Tell me the platform (LinkedIn, Twitter, Instagram, Facebook), topic, and desired tone.",
  },
  {
    id: "marketing",
    label: "Marketing",
    icon: FileText,
    description: "Persuasive marketing copy",
    prompt:
      "Write marketing copy. Describe the product/service, target audience, and the call-to-action you want.",
  },
  {
    id: "blog",
    label: "Blog / SEO",
    icon: TrendingUp,
    description: "SEO-optimized content",
    prompt:
      "Create blog content. Share the topic, target keywords, and the audience you want to reach.",
  },
  {
    id: "creative",
    label: "Creative",
    icon: PenTool,
    description: "Taglines & brand stories",
    prompt:
      "Generate creative content. Tell me about your brand, the message you want to convey, and the style you prefer.",
  },
  {
    id: "translate",
    label: "Multi-Language",
    icon: Globe,
    description: "Content in multiple languages",
    prompt:
      "I can help translate or create content in multiple languages. What would you like me to write and in which language?",
  },
];

interface ContentTypeSelectorProps {
  selected: ContentType | null;
  onSelect: (type: ContentType, prompt: string) => void;
}

export function ContentTypeSelector({
  selected,
  onSelect,
}: ContentTypeSelectorProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {contentTypes.map((type) => (
        <button
          key={type.id}
          onClick={() => onSelect(type.id, type.prompt)}
          className={cn(
            "flex flex-col items-center gap-2 p-4 rounded-xl border transition-all duration-200 text-center",
            selected === type.id
              ? "border-accent bg-accent/10 text-foreground"
              : "border-border bg-card hover:border-accent/50 text-muted-foreground hover:text-foreground"
          )}
        >
          <type.icon
            className={cn(
              "h-6 w-6",
              selected === type.id ? "text-accent" : "text-muted-foreground"
            )}
          />
          <span className="text-sm font-medium">{type.label}</span>
          <span className="text-xs text-muted-foreground hidden sm:block">
            {type.description}
          </span>
        </button>
      ))}
    </div>
  );
}
