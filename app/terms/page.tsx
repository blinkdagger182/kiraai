import { Header } from "@/components/header"
import { Footer } from "@/components/footer"

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-32 pb-24 px-6">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-semibold mb-2">Terms of Service</h1>
          <p className="text-muted-foreground mb-12">Last updated: May 10, 2026</p>

          <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
            <section>
              <h2 className="text-xl font-medium mb-4">Agreement to Terms</h2>
              <p className="text-muted-foreground leading-relaxed">
                By downloading or using Kira, you agree to these Terms of Service. If you disagree with any part of these terms, please do not use the app.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-medium mb-4">Description of Service</h2>
              <p className="text-muted-foreground leading-relaxed">
                Kira is an AI-powered personal finance application that helps users monitor their spending and income. The app provides tools for logging transactions, categorizing expenses, viewing spending summaries, and getting AI-powered financial insights. Kira is not a licensed financial advisor and does not provide investment, tax, or financial planning advice.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-medium mb-4">User Responsibilities</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                When using Kira, you agree to:
              </p>
              <ul className="space-y-2 text-muted-foreground">
                <li>Provide accurate information when creating an account</li>
                <li>Maintain the security of your device and any account credentials</li>
                <li>Use the app only for personal, non-commercial purposes</li>
                <li>Not attempt to reverse engineer, modify, or create derivative works from the app</li>
                <li>Not use the app for any illegal or unauthorized purpose</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-medium mb-4">Accuracy of Information</h2>
              <p className="text-muted-foreground leading-relaxed">
                Kira relies on data you enter manually or provide through connected services. We do not verify the accuracy of your financial records. You are solely responsible for ensuring the information you input is correct. Any calculations, summaries, insights, or AI-generated advice provided by the app are based on the data you provide.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-medium mb-4">Intellectual Property</h2>
              <p className="text-muted-foreground leading-relaxed">
                Kira and its original content, features, and functionality are owned by Kira and are protected by international copyright, trademark, and other intellectual property laws. You may not copy, modify, distribute, or create derivative works without our express written permission.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-medium mb-4">Disclaimer of Warranties</h2>
              <p className="text-muted-foreground leading-relaxed">
                Kira is provided &quot;as is&quot; and &quot;as available&quot; without warranties of any kind, either express or implied. We do not warrant that the app will be uninterrupted, error-free, or free of harmful components. AI-generated insights are for informational purposes only and should not be relied upon as professional financial advice. Your use of the app is at your sole risk.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-medium mb-4">Limitation of Liability</h2>
              <p className="text-muted-foreground leading-relaxed">
                To the maximum extent permitted by law, Kira shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of data, profits, or goodwill, arising from your use of the app.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-medium mb-4">Changes to Terms</h2>
              <p className="text-muted-foreground leading-relaxed">
                We reserve the right to modify these terms at any time. We will notify users of significant changes through the app or via email. Your continued use of Saku after changes constitutes acceptance of the new terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-medium mb-4">Termination</h2>
              <p className="text-muted-foreground leading-relaxed">
                We may terminate or suspend your access to Kira immediately, without prior notice, for conduct that we believe violates these terms or is harmful to other users, us, or third parties, or for any other reason at our sole discretion.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-medium mb-4">Governing Law</h2>
              <p className="text-muted-foreground leading-relaxed">
                These terms shall be governed by and construed in accordance with the laws of Malaysia, without regard to its conflict of law provisions.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-medium mb-4">Contact Us</h2>
              <p className="text-muted-foreground leading-relaxed">
                Questions about these terms? Contact us at{" "}
                <a href="mailto:legal@kira.money" className="text-foreground underline underline-offset-4 hover:no-underline">
                  legal@kira.money
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
