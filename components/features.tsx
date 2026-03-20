import {
  Mail,
  FileText,
  Share2,
  TrendingUp,
  PenTool,
  Globe,
} from "lucide-react";

const features = [
  {
    icon: Mail,
    title: "Professional Emails",
    description:
      "Craft compelling business emails, cold outreach, follow-ups, and newsletters that get responses.",
  },
  {
    icon: Share2,
    title: "Social Media Content",
    description:
      "Generate engaging posts for LinkedIn, Twitter, Instagram, and Facebook optimized for each platform.",
  },
  {
    icon: FileText,
    title: "Marketing Copy",
    description:
      "Create persuasive ad copy, landing page content, product descriptions, and sales materials.",
  },
  {
    icon: TrendingUp,
    title: "SEO Content",
    description:
      "Generate blog posts and articles optimized for search engines with proper keyword integration.",
  },
  {
    icon: PenTool,
    title: "Creative Writing",
    description:
      "Write compelling stories, scripts, taglines, and creative content that captures attention.",
  },
  {
    icon: Globe,
    title: "Multi-Language",
    description:
      "Create content in multiple languages including Arabic, English, French, and more.",
  },
];

export function Features() {
  return (
    <section id="features" className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold">
            Everything You Need to Create
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Powerful AI tools designed for professionals who demand quality
            content at scale.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group p-6 rounded-xl border border-border bg-card hover:border-accent/50 transition-all duration-300"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10 group-hover:bg-accent/20 transition-colors">
                <feature.icon className="h-6 w-6 text-accent" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">{feature.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
