export function HowItWorks() {
  const steps = [
    {
      step: "01",
      title: "Choose Your Content Type",
      description:
        "Select from emails, social posts, marketing copy, blog articles, and more. Each type is optimized for its specific purpose.",
    },
    {
      step: "02",
      title: "Describe What You Need",
      description:
        "Enter your topic, key points, tone of voice, and any specific requirements. The more detail you provide, the better the results.",
    },
    {
      step: "03",
      title: "Generate & Refine",
      description:
        "Our AI creates professional content instantly. Review, edit, and regenerate until it's perfect for your needs.",
    },
    {
      step: "04",
      title: "Export & Use",
      description:
        "Copy your content directly or export it. Use it in your marketing campaigns, emails, social media, and more.",
    },
  ];

  return (
    <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold">How It Works</h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Create professional content in four simple steps.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((item, index) => (
            <div key={index} className="relative">
              <div className="text-6xl font-bold text-accent/20">{item.step}</div>
              <h3 className="mt-2 text-lg font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {item.description}
              </p>
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-8 left-full w-full h-px bg-gradient-to-r from-accent/30 to-transparent" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
