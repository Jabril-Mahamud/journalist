import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { BookOpen, Calendar, BarChart3 } from 'lucide-react'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

export default async function LandingPage() {
  const { userId } = await auth()
  
  if (userId) {
    redirect('/app')
  }
  
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">Journalist</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/sign-in">
              <Button variant="ghost">Log in</Button>
            </Link>
            <Link href="/sign-up">
              <Button>Start for free</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-5xl font-bold mb-6">Clarity, finally.</h1>
        <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
          A simple, beautiful journaling app that helps you capture thoughts,
          track your progress, and stay organized with projects.
        </p>
        <Link href="/sign-up">
          <Button size="lg" className="text-lg px-8">
            Start journaling for free
          </Button>
        </Link>
        <p className="text-sm text-muted-foreground mt-4">
          Free forever. No credit card required.
        </p>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-20">
        <div className="grid md:grid-cols-3 gap-12">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary mb-4">
              <BookOpen className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-semibold mb-2">
              Capture thoughts instantly
            </h3>
            <p className="text-muted-foreground">
              Write journal entries quickly with a clean, distraction-free
              editor. Organize with projects.
            </p>
          </div>
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary mb-4">
              <Calendar className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Track your journey</h3>
            <p className="text-muted-foreground">
              Visualize your journaling habit with date grouping.
              See your progress over time.
            </p>
          </div>
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary mb-4">
              <BarChart3 className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Stay organized</h3>
            <p className="text-muted-foreground">
              Tag entries with projects, filter by date, and find what matters. Your
              thoughts, beautifully organized.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h2 className="text-3xl font-bold mb-4">Ready to start journaling?</h2>
        <p className="text-muted-foreground mb-8">
          Join thousands of people using Journalist to improve their mental
          clarity.
        </p>
        <Link href="/sign-up">
          <Button size="lg" className="text-lg px-8">
            Get started for free
          </Button>
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>Built with Next.js, FastAPI, and Kubernetes</p>
        </div>
      </footer>
    </div>
  )
}