"use client"

import dynamic from "next/dynamic"
import { Button } from "@/components/ui/button"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Features } from "@/components/features"

const IPhoneMockup = dynamic(
  () => import("@/components/iphone-mockup").then((mod) => mod.IPhoneMockup),
  { ssr: false }
)

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <section className="pt-32 pb-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-muted border border-border text-sm mb-6">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Now available on iOS
              </div>
              <h1 className="text-4xl md:text-5xl font-semibold tracking-tight mb-6 text-balance">
                Roast your personal finance
              </h1>
              <p className="text-lg text-muted-foreground mb-8 max-w-md mx-auto lg:mx-0 leading-relaxed">
                Kira tells you exactly where your money went — and why that&apos;s probably a problem. No sugar-coating, just clarity.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Button size="lg" className="h-12 px-6">
                  Download on App Store
                </Button>
                <Button size="lg" variant="outline" className="h-12 px-6">
                  Learn More
                </Button>
              </div>
            </div>
            <div className="order-first lg:order-last">
              <IPhoneMockup />
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <Features />

      {/* CTA Section */}
      <section className="py-24 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-semibold mb-4 text-balance">Start tracking today</h2>
          <p className="text-muted-foreground mb-8">
            Join thousands of users who have gained clarity over their finances with Kira.
          </p>
          <Button size="lg" className="h-12 px-8">
            Get Kira for Free
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  )
}
