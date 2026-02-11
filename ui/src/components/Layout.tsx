
export default function Layout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-background font-sans antialiased">
            <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container flex h-14 max-w-screen-2xl items-center">
                    <div className="mr-4 hidden md:flex">
                        <a href="/" className="mr-6 flex items-center space-x-2">
                            <span className="hidden font-bold sm:inline-block">AI Course Generator</span>
                        </a>
                        <nav className="flex items-center space-x-6 text-sm font-medium">
                            <a href="/courses" className="transition-colors hover:text-foreground/80 text-foreground/60">Courses</a>
                            <a href="/generator" className="transition-colors hover:text-foreground/80 text-foreground/60">Generate</a>
                        </nav>
                    </div>
                </div>
            </header>
            <main className="flex-1">{children}</main>
        </div>
    )
}
