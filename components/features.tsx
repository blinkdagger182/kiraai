import { Wallet, TrendingUp, Bell, Shield } from "lucide-react"

const features = [
  {
    icon: Wallet,
    title: "Track Every Ringgit",
    description: "Log expenses in seconds. See exactly where your money goes with smart categorization powered by AI."
  },
  {
    icon: TrendingUp,
    title: "AI-Powered Insights",
    description: "Ask Kira anything about your spending. Get personalized advice and spot patterns you might have missed."
  },
  {
    icon: Bell,
    title: "Stay Informed",
    description: "Proactive notifications when something needs your attention. No noise, just what matters."
  },
  {
    icon: Shield,
    title: "Your Data, Protected",
    description: "Bank-grade encryption keeps your financial data secure. Your information stays private, always."
  }
]

export function Features() {
  return (
    <section className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-semibold mb-4 text-balance">Meet your AI financial companion</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Ask Kira anything about your money. Get answers, insights, and advice tailored to your spending.
          </p>
        </div>
        <div className="grid md:grid-cols-2 gap-8">
          {features.map((feature) => (
            <div key={feature.title} className="p-6 rounded-2xl bg-muted/50 border border-border">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <feature.icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-medium text-lg mb-2">{feature.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
