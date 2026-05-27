import { Header } from "@/components/header"
import { Footer } from "@/components/footer"

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-32 pb-24 px-6">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-semibold mb-2">Privacy Policy</h1>
          <p className="text-muted-foreground mb-12">Last updated: May 10, 2026</p>

          <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
            <section>
              <h2 className="text-xl font-medium mb-4">Our Commitment to Your Privacy</h2>
              <p className="text-muted-foreground leading-relaxed">
                Kira is designed with privacy as a core principle. We believe your financial data is personal and should stay that way. This policy explains how we handle your information.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-medium mb-4">Data We Collect</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Kira operates primarily on your device. Here&apos;s what we collect:
              </p>
              <ul className="space-y-2 text-muted-foreground">
                <li><strong className="text-foreground">Financial Data:</strong> Your transactions, categories, and spending records are stored locally on your device. We do not have access to this information.</li>
                <li><strong className="text-foreground">Account Information:</strong> If you create an account for optional cloud backup, we store your email address and encrypted backup data.</li>
                <li><strong className="text-foreground">Usage Analytics:</strong> We collect anonymous usage statistics to improve the app. This includes feature usage patterns but never your actual financial data.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-medium mb-4">How We Use Your Data</h2>
              <p className="text-muted-foreground leading-relaxed">
                Your financial data stays on your device and is used solely to provide the expense tracking features you use. Anonymous analytics help us understand which features are most valuable and where we can improve the experience.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-medium mb-4">Data Sharing</h2>
              <p className="text-muted-foreground leading-relaxed">
                We do not sell, rent, or share your personal information with third parties for marketing purposes. We may share anonymous, aggregated statistics for research or to demonstrate app usage trends, but this data can never be linked back to you.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-medium mb-4">Data Security</h2>
              <p className="text-muted-foreground leading-relaxed">
                Your local data is protected by your device&apos;s security features. If you enable cloud backup, your data is encrypted using industry-standard AES-256 encryption before leaving your device. We cannot read your financial records.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-medium mb-4">Your Rights</h2>
              <p className="text-muted-foreground leading-relaxed">
                You can export or delete all your data directly from the app at any time. If you have a cloud backup account, you can request complete deletion by contacting us at privacy@kira.money.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-medium mb-4">Changes to This Policy</h2>
              <p className="text-muted-foreground leading-relaxed">
                We may update this policy occasionally. Significant changes will be communicated through the app. Continued use after changes constitutes acceptance of the updated policy.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-medium mb-4">Contact Us</h2>
              <p className="text-muted-foreground leading-relaxed">
                Questions about this policy? Contact us at{" "}
                <a href="mailto:privacy@kira.money" className="text-foreground underline underline-offset-4 hover:no-underline">
                  privacy@kira.money
                </a>
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
