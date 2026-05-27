import Link from "next/link"
import Image from "next/image"

export function Footer() {
  return (
    <footer className="border-t border-border bg-muted/30">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row justify-between items-start gap-8">
          <div className="flex flex-col gap-4">
            <Link href="/" className="flex items-center gap-2">
              <Image
                src="/images/kira-logo.png"
                alt="Kira"
                width={28}
                height={28}
                className="rounded-lg"
              />
              <span className="font-semibold">Kira</span>
            </Link>
            <p className="text-sm text-muted-foreground max-w-xs">
              Your AI-powered financial companion. Track spending, get insights, and build better money habits.
            </p>
          </div>
          <div className="flex gap-12">
            <div className="flex flex-col gap-3">
              <span className="text-sm font-medium">Legal</span>
              <Link href="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Privacy Policy
              </Link>
              <Link href="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Terms of Service
              </Link>
            </div>
            <div className="flex flex-col gap-3">
              <span className="text-sm font-medium">Contact</span>
              <a href="mailto:hello@kira.money" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                hello@kira.money
              </a>
            </div>
          </div>
        </div>
        <div className="mt-12 pt-6 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Kira. All rights reserved.
          </p>
          <p className="text-sm text-muted-foreground">
            Crafted by <span className="font-medium text-foreground">Risk Creatives</span>
          </p>
        </div>
      </div>
    </footer>
  )
}
